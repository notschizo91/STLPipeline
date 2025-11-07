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
    colorMode = false,
    threshold = 128,
    turdSize = 2,
    optCurve = true,
    optTolerance = 0.2,
    ...otherOptions
  } = options;

  try {
    if (colorMode) {
      // Color mode: Use potrace with posterized color layers
      console.log('Using color mode conversion with multi-layer potrace');

      // Process image with sharp to get metadata
      const imageInfo = await sharp(inputPath).metadata();
      const width = imageInfo.width;
      const height = imageInfo.height;

      const layers = [];
      const thresholds = [50, 100, 150, 200]; // Different threshold levels
      const colors = ['#1a1a1a', '#666666', '#999999', '#cccccc']; // Dark to light

      // Create each layer
      for (let i = 0; i < thresholds.length; i++) {
        const imageBuffer = await sharp(inputPath)
          .greyscale()
          .normalise()
          .toBuffer();

        const svgStr = await new Promise((resolve, reject) => {
          potrace.trace(imageBuffer, {
            threshold: thresholds[i],
            turdSize: 2,
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            optCurve: true,
            optTolerance: 0.2,
            color: colors[i],
            background: 'transparent'
          }, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
          });
        });

        // Extract path data from this layer
        const pathRegex = /<path[^>]*>/g;
        const paths = svgStr.match(pathRegex);
        if (paths && paths.length > 0) {
          layers.push({ paths, color: colors[i] });
        }
      }

      // Build combined SVG with proper structure
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
    } else {
      // Black & white mode: Use Potrace for clean B&W conversion
      console.log('Using black & white mode conversion with Potrace');

      const defaultOptions = {
        threshold,
        turdSize,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
        optCurve,
        optTolerance,
        ...otherOptions
      };

      // Read and process the image with sharp (ensure it's grayscale)
      const imageBuffer = await sharp(inputPath)
        .greyscale()
        .toBuffer();

      // Convert to SVG using potrace
      const svgContent = await new Promise((resolve, reject) => {
        potrace.trace(imageBuffer, defaultOptions, (err, svg) => {
          if (err) reject(err);
          else resolve(svg);
        });
      });

      return svgContent;
    }
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
