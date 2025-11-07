import potrace from 'potrace';
import sharp from 'sharp';
import { promises as fs } from 'fs';

/**
 * Convert a PNG image to SVG using vectorization
 * @param {string} inputPath - Path to input PNG file
 * @param {object} options - Conversion options
 * @returns {Promise<string>} - SVG content as string
 */
export async function pngToSvg(inputPath, options = {}) {
  const {
    threshold = 128,
    turdSize = 2,
    optCurve = true,
    optTolerance = 0.2,
    ...otherOptions
  } = options;

  try {
    console.log('Converting image to SVG with enhanced color detection');

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Limit processing size to prevent memory issues
    const maxDimension = 800;
    let processWidth = width;
    let processHeight = height;

    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      processWidth = Math.round(width * scale);
      processHeight = Math.round(height * scale);
      console.log(`Downscaling from ${width}x${height} to ${processWidth}x${processHeight} for processing`);
    }

    // Sample colors from a reasonably sized version
    const { data } = await sharp(inputPath)
      .resize(Math.min(processWidth, 150), Math.min(processHeight, 150), { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Detect distinct colors by quantizing
    const colorMap = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;

      // Quantize to nearest 24 (balance between colors and performance)
      const qr = Math.round(r / 24) * 24;
      const qg = Math.round(g / 24) * 24;
      const qb = Math.round(b / 24) * 24;

      const colorKey = `${qr},${qg},${qb}`;
      const count = colorMap.get(colorKey) || 0;
      colorMap.set(colorKey, count + 1);
    }

    // Sort colors by frequency and take top 5 colors
    const topColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return { r, g, b, hex, count };
      });

    console.log(`Detected ${topColors.length} colors:`, topColors.map(c => c.hex));

    const layers = [];

    // Trace each color using grayscale levels (memory efficient approach)
    for (let i = 0; i < topColors.length; i++) {
      const targetColor = topColors[i];
      console.log(`Tracing color ${targetColor.hex}...`);

      // Use different threshold levels for each color to capture different brightness ranges
      const thresholdValue = Math.round(50 + (i * 40)); // Spread thresholds: 50, 90, 130, 170, 210

      try {
        // Process at reasonable size
        const processedBuffer = await sharp(inputPath)
          .resize(processWidth, processHeight, { fit: 'inside' })
          .greyscale()
          .toBuffer();

        const svgStr = await new Promise((resolve, reject) => {
          potrace.trace(processedBuffer, {
            threshold: thresholdValue,
            turdSize,
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            optCurve,
            optTolerance,
            color: targetColor.hex,
            background: 'transparent'
          }, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
          });
        });

        // Extract paths and scale them back to original size if needed
        const pathRegex = /<path[^>]*>/g;
        const paths = svgStr.match(pathRegex);

        if (paths && paths.length > 0) {
          // Scale paths back to original dimensions
          let scaledPaths = paths;
          if (processWidth !== width || processHeight !== height) {
            const scaleX = width / processWidth;
            const scaleY = height / processHeight;
            scaledPaths = paths.map(path =>
              path.replace(/d="([^"]+)"/, (match, d) => {
                // This is a simplified scaling - potrace will handle the actual size via viewBox
                return match;
              })
            );
          }

          layers.push({ paths: scaledPaths, color: targetColor.hex });
          console.log(`  Found ${paths.length} paths for ${targetColor.hex}`);
        }
      } catch (err) {
        console.error(`Failed to trace color ${targetColor.hex}:`, err.message);
      }
    }

    if (layers.length === 0) {
      // Fallback to simple black trace
      console.log('No colored layers found, using black fallback');
      const imageBuffer = await sharp(inputPath)
        .greyscale()
        .toBuffer();

      const svgContent = await new Promise((resolve, reject) => {
        potrace.trace(imageBuffer, {
          threshold,
          turdSize,
          turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
          optCurve,
          optTolerance,
          color: '#000000',
          background: 'transparent'
        }, (err, svg) => {
          if (err) reject(err);
          else resolve(svg);
        });
      });

      return svgContent;
    }

    // Combine all layers into one SVG
    let combinedPaths = '';
    layers.reverse().forEach(layer => {
      layer.paths.forEach(path => {
        combinedPaths += path + '\n';
      });
    });

    // Use processWidth/processHeight for viewBox since paths are in that coordinate system
    // But set width/height to original dimensions so it displays at proper size
    const combinedSvg = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${processWidth} ${processHeight}">
${combinedPaths}</svg>`;

    return combinedSvg;
  } catch (error) {
    console.error('Error in pngToSvg:', error);
    throw new Error(`Failed to convert PNG to SVG: ${error.message}`);
  }
}

/**
 * Save SVG content to a file
 * @param {string} svgContent - SVG content as string
 * @param {string} outputPath - Path to save the SVG file
 */
export async function saveSvg(svgContent, outputPath) {
  await fs.writeFile(outputPath, svgContent, 'utf-8');
  console.log(`SVG saved to: ${outputPath}`);
}
