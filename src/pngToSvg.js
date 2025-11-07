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

    // Sample colors from the original image
    const { data } = await sharp(inputPath)
      .ensureAlpha()
      .resize(Math.min(width, 200), Math.min(height, 200), { fit: 'inside' }) // Larger sample for better detection
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Detect distinct colors by quantizing to reduce palette
    const colorMap = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue; // Skip transparent

      // Quantize to nearest 16 (more colors than before for better detection)
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;

      const colorKey = `${qr},${qg},${qb}`;
      const count = colorMap.get(colorKey) || 0;
      colorMap.set(colorKey, count + 1);
    }

    // Sort colors by frequency and take top 6 colors
    const topColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return { r, g, b, hex, count };
      });

    console.log(`Detected ${topColors.length} colors:`, topColors.map(c => c.hex));

    // Get full resolution image data for masking
    const fullData = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer();

    const layers = [];

    // Trace each color separately
    for (const targetColor of topColors) {
      console.log(`Tracing color ${targetColor.hex}...`);

      // Create a mask for this specific color
      const maskBuffer = Buffer.alloc(width * height);

      for (let i = 0, j = 0; i < fullData.length; i += 4, j++) {
        const r = fullData[i];
        const g = fullData[i + 1];
        const b = fullData[i + 2];
        const a = fullData[i + 3];

        // Quantize pixel color
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;

        // If pixel matches this color, mark as black (will be traced)
        if (a >= 128 && qr === targetColor.r && qg === targetColor.g && qb === targetColor.b) {
          maskBuffer[j] = 0; // Black = trace this
        } else {
          maskBuffer[j] = 255; // White = ignore
        }
      }

      // Convert mask to image
      const maskImage = await sharp(maskBuffer, {
        raw: { width, height, channels: 1 }
      }).toBuffer();

      try {
        const svgStr = await new Promise((resolve, reject) => {
          potrace.trace(maskImage, {
            threshold: 128,
            turdSize, // Use user's detail setting
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

        // Extract paths from SVG
        const pathRegex = /<path[^>]*>/g;
        const paths = svgStr.match(pathRegex);
        if (paths && paths.length > 0) {
          layers.push({ paths, color: targetColor.hex });
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

    const combinedSvg = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
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
