import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
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
    console.log('Converting image to SVG with VTracer');

    // Read the image file as a buffer
    const imageBuffer = await fs.readFile(inputPath);

    // Map our turdSize parameter to VTracer's filterSpeckle
    // turdSize 20 = filterSpeckle 10 (filter out lots of small stuff)
    // turdSize 1 = filterSpeckle 2 (keep more detail)
    const filterSpeckle = Math.max(2, Math.round(turdSize / 2));

    // Map optTolerance to lengthThreshold
    // Higher tolerance = higher length threshold (more smoothing)
    const lengthThreshold = Math.round(optTolerance * 20);

    // Use VTracer's native color mode with good defaults
    const svgContent = await vectorize(imageBuffer, {
      colorMode: ColorMode.Color,
      colorPrecision: 6,
      filterSpeckle: filterSpeckle,  // KEY: Filters out small patches/lines
      spliceThreshold: 45,
      cornerThreshold: 60,
      hierarchical: Hierarchical.Stacked,
      mode: PathSimplifyMode.Spline,
      layerDifference: 5,
      lengthThreshold: lengthThreshold,
      maxIterations: 2,
      pathPrecision: 5
    });

    // Strip width and height attributes so CSS can control the size
    // Keep viewBox for proper aspect ratio
    const scaledSvg = svgContent
      .replace(/\swidth="[^"]*"/, '')
      .replace(/\sheight="[^"]*"/, '');

    console.log(`VTracer conversion complete with filterSpeckle=${filterSpeckle}`);
    console.log(`SVG output length: ${scaledSvg.length} chars`);
    return scaledSvg;
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
