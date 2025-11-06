import { pngToSvg, saveSvg } from './pngToSvg.js';
import { svgTo3D, saveStl } from './svgTo3d.js';
import path from 'path';

/**
 * Complete pipeline: PNG → SVG → 3D STL
 * @param {string} inputPath - Path to input PNG file
 * @param {object} options - Pipeline options
 * @returns {Promise<object>} - Paths to generated files
 */
export async function convertPngToStl(inputPath, options = {}) {
  const {
    outputDir = './output',
    svgOptions = {},
    extrusionOptions = {},
    saveSvgFile = true
  } = options;

  console.log('Starting PNG to STL conversion pipeline...');
  console.log(`Input: ${inputPath}`);

  // Step 1: PNG to SVG
  console.log('\n[1/3] Converting PNG to SVG...');
  const svgContent = await pngToSvg(inputPath, svgOptions);

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const svgPath = path.join(outputDir, `${baseName}.svg`);

  if (saveSvgFile) {
    await saveSvg(svgContent, svgPath);
  }

  // Step 2: SVG to 3D
  console.log('\n[2/3] Extruding SVG to 3D...');
  const stlData = await svgTo3D(svgContent, extrusionOptions);

  // Step 3: Save STL
  console.log('\n[3/3] Saving STL file...');
  const stlPath = path.join(outputDir, `${baseName}.stl`);
  await saveStl(stlData, stlPath);

  console.log('\n✓ Conversion complete!');
  return {
    svg: saveSvgFile ? svgPath : null,
    stl: stlPath
  };
}

/**
 * Batch convert multiple PNG files
 * @param {string[]} inputPaths - Array of input PNG file paths
 * @param {object} options - Pipeline options
 */
export async function batchConvert(inputPaths, options = {}) {
  const results = [];

  for (const inputPath of inputPaths) {
    try {
      const result = await convertPngToStl(inputPath, options);
      results.push({ success: true, input: inputPath, ...result });
    } catch (error) {
      console.error(`Failed to convert ${inputPath}:`, error.message);
      results.push({ success: false, input: inputPath, error: error.message });
    }
  }

  return results;
}

export { pngToSvg, saveSvg, svgTo3D, saveStl };
