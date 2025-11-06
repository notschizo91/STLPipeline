import potrace from 'potrace';
import sharp from 'sharp';
import { promises as fs } from 'fs';

/**
 * Convert a PNG image to SVG using vectorization
 * @param {string} inputPath - Path to input PNG file
 * @param {object} options - Potrace options
 * @returns {Promise<string>} - SVG content as string
 */
export async function pngToSvg(inputPath, options = {}) {
  const defaultOptions = {
    threshold: 128,          // Threshold for black/white (0-255)
    turdSize: 2,            // Suppress speckles of this size
    turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
    optCurve: true,         // Optimize curves
    optTolerance: 0.2,      // Curve optimization tolerance
    ...options
  };

  try {
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
