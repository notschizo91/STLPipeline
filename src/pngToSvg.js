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

    // Use a simpler approach: trace 3-4 color layers based on brightness levels
    const layers = [];
    const colorLevels = [
      { threshold: 50, name: 'dark' },
      { threshold: 120, name: 'medium' },
      { threshold: 180, name: 'light' }
    ];

    // Sample colors from the original image
    const { data } = await sharp(inputPath)
      .ensureAlpha()
      .resize(Math.min(width, 100), Math.min(height, 100), { fit: 'inside' }) // Sample smaller version
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Find dominant color for each brightness level
    const colorSamples = { dark: [], medium: [], light: [] };

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue; // Skip transparent

      const brightness = (r + g + b) / 3;

      if (brightness < 85) {
        colorSamples.dark.push({ r, g, b });
      } else if (brightness < 170) {
        colorSamples.medium.push({ r, g, b });
      } else {
        colorSamples.light.push({ r, g, b });
      }
    }

    // Get average color for each level
    const avgColors = {};
    for (const level of ['dark', 'medium', 'light']) {
      if (colorSamples[level].length > 0) {
        const avg = colorSamples[level].reduce((acc, c) => ({
          r: acc.r + c.r,
          g: acc.g + c.g,
          b: acc.b + c.b
        }), { r: 0, g: 0, b: 0 });

        avgColors[level] = {
          r: Math.round(avg.r / colorSamples[level].length),
          g: Math.round(avg.g / colorSamples[level].length),
          b: Math.round(avg.b / colorSamples[level].length)
        };
      }
    }

    // Trace each brightness level with its average color
    for (const level of colorLevels) {
      if (!avgColors[level.name]) continue;

      const color = avgColors[level.name];
      const hexColor = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;

      const imageBuffer = await sharp(inputPath)
        .greyscale()
        .toBuffer();

      try {
        const svgStr = await new Promise((resolve, reject) => {
          potrace.trace(imageBuffer, {
            threshold: level.threshold,
            turdSize,
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            optCurve,
            optTolerance,
            color: hexColor,
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
          layers.push({ paths, color: hexColor });
        }
      } catch (err) {
        console.error(`Failed to trace level ${level.name}:`, err.message);
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
