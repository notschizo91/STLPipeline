#!/usr/bin/env node

import { Command } from 'commander';
import { convertPngToStl, batchConvert } from './index.js';
import { promises as fs } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('stl-pipeline')
  .description('Convert PNG images to 3D printable STL files')
  .version('1.0.0');

program
  .command('convert')
  .description('Convert a PNG image to STL')
  .argument('<input>', 'Input PNG file path')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-h, --height <mm>', 'Extrusion height in mm', '5')
  .option('-t, --threshold <value>', 'Black/white threshold (0-255)', '128')
  .option('-s, --scale <factor>', 'Scale factor', '1')
  .option('--twist <angle>', 'Twist angle in degrees', '0')
  .option('--no-svg', 'Skip saving intermediate SVG file')
  .action(async (input, options) => {
    try {
      // Ensure output directory exists
      await fs.mkdir(options.output, { recursive: true });

      const config = {
        outputDir: options.output,
        saveSvgFile: options.svg !== false,
        svgOptions: {
          threshold: parseInt(options.threshold)
        },
        extrusionOptions: {
          height: parseFloat(options.height),
          scale: parseFloat(options.scale),
          twistAngle: parseFloat(options.twist)
        }
      };

      const result = await convertPngToStl(input, config);

      console.log('\nOutput files:');
      if (result.svg) console.log(`  SVG: ${result.svg}`);
      console.log(`  STL: ${result.stl}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Convert multiple PNG images to STL')
  .argument('<pattern>', 'Glob pattern for input files (e.g., "images/*.png")')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-h, --height <mm>', 'Extrusion height in mm', '5')
  .option('-t, --threshold <value>', 'Black/white threshold (0-255)', '128')
  .action(async (pattern, options) => {
    try {
      // Ensure output directory exists
      await fs.mkdir(options.output, { recursive: true });

      // Simple glob implementation for batch processing
      const dir = path.dirname(pattern);
      const files = await fs.readdir(dir);
      const ext = path.extname(pattern);
      const pngFiles = files
        .filter(f => f.endsWith(ext))
        .map(f => path.join(dir, f));

      if (pngFiles.length === 0) {
        console.log('No matching files found');
        return;
      }

      console.log(`Found ${pngFiles.length} file(s) to convert\n`);

      const config = {
        outputDir: options.output,
        svgOptions: {
          threshold: parseInt(options.threshold)
        },
        extrusionOptions: {
          height: parseFloat(options.height)
        }
      };

      const results = await batchConvert(pngFiles, config);

      console.log('\nBatch conversion complete:');
      console.log(`  Successful: ${results.filter(r => r.success).length}`);
      console.log(`  Failed: ${results.filter(r => !r.success).length}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
