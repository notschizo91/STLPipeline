import { convertPngToStl } from '../src/index.js';

/**
 * Example: Convert a PNG to STL with custom parameters
 */
async function main() {
  try {
    console.log('STL Pipeline Example\n');

    // Example 1: Basic conversion
    console.log('Example 1: Basic conversion');
    const result1 = await convertPngToStl('examples/sample.png', {
      outputDir: './output',
      svgOptions: {
        threshold: 128
      },
      extrusionOptions: {
        height: 5
      }
    });
    console.log('Output:', result1);

    // Example 2: High extrusion with twist
    console.log('\nExample 2: Tall with twist');
    const result2 = await convertPngToStl('examples/sample.png', {
      outputDir: './output',
      svgOptions: {
        threshold: 100  // More black areas
      },
      extrusionOptions: {
        height: 15,     // Taller
        twistAngle: 45  // Twist effect
      }
    });
    console.log('Output:', result2);

    // Example 3: Scaled and optimized
    console.log('\nExample 3: Scaled and optimized');
    const result3 = await convertPngToStl('examples/sample.png', {
      outputDir: './output',
      saveSvgFile: true,
      svgOptions: {
        threshold: 128,
        turdSize: 3,        // Remove small speckles
        optCurve: true,     // Optimize curves
        optTolerance: 0.3   // Smoother curves
      },
      extrusionOptions: {
        height: 8,
        scale: 2.0          // Double the size
      }
    });
    console.log('Output:', result3);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
