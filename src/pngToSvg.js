import potrace from 'potrace';
import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';
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
      // Color mode: Use ImageTracer for full color SVG conversion
      console.log('Using color mode conversion with ImageTracer');

      const imageBuffer = await fs.readFile(inputPath);
      const base64Image = 'data:image/png;base64,' + imageBuffer.toString('base64');

      const svgContent = await new Promise((resolve, reject) => {
        try {
          const svg = ImageTracer.imagedataToSVG(
            ImageTracer.imageToTracedata(base64Image, null, null),
            {
              numberofcolors: 16,
              mincolorratio: 0.02,
              colorquantcycles: 3,
              ltres: 1,
              qtres: 1,
              pathomit: 8,
              rightangleenhance: true,
              ...otherOptions
            }
          );
          resolve(svg);
        } catch (err) {
          reject(err);
        }
      });

      return svgContent;
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
