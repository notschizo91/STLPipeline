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
    console.log('Converting image to SVG with color preservation');

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Get the raw pixel data
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Analyze image to find dominant colors
    const colorMap = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip fully transparent pixels
      if (a < 128) continue;

      // Quantize colors to reduce palette (round to nearest 32)
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;

      const colorKey = `${qr},${qg},${qb}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    // Sort colors by frequency and take top colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Limit to 8 colors max
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b, hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` };
      });

    console.log(`Found ${sortedColors.length} dominant colors`);

    // Trace each color layer
    const layers = [];
    for (const color of sortedColors) {
      // Create a binary mask for this color
      const maskBuffer = Buffer.alloc(width * height);

      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Check if pixel is close to this color
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;

        if (a >= 128 && qr === color.r && qg === color.g && qb === color.b) {
          maskBuffer[j] = 0; // Black in mask = this color
        } else {
          maskBuffer[j] = 255; // White in mask = not this color
        }
      }

      // Convert mask to image buffer for potrace
      const maskImage = await sharp(maskBuffer, {
        raw: { width, height, channels: 1 }
      }).toBuffer();

      // Trace this color layer
      try {
        const svgStr = await new Promise((resolve, reject) => {
          potrace.trace(maskImage, {
            threshold: 128,
            turdSize,
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            optCurve,
            optTolerance,
            color: color.hex,
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
          layers.push({ paths, color: color.hex });
        }
      } catch (err) {
        console.error(`Failed to trace color ${color.hex}:`, err.message);
      }
    }

    // Combine all layers into one SVG
    let combinedPaths = '';
    layers.forEach(layer => {
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
