import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions/index.js';
import { geom2 } from '@jscad/modeling/src/geometries/index.js';
import { vectorText } from '@jscad/modeling/src/text/index.js';
import { serialize } from '@jscad/stl-serializer';
import { parseSVG } from 'svg-path-parser';
import { promises as fs } from 'fs';

/**
 * Parse SVG path data to create a 2D geometry
 * @param {string} svgContent - SVG content as string
 * @returns {object} - JSCAD geom2 object
 */
function svgToGeom2(svgContent) {
  // Extract path data from SVG
  const pathMatch = svgContent.match(/<path[^>]*d="([^"]*)"[^>]*>/);

  if (!pathMatch) {
    throw new Error('No path data found in SVG');
  }

  const pathData = pathMatch[1];
  const commands = parseSVG(pathData);

  // Convert SVG path commands to points
  const points = [];
  let currentX = 0;
  let currentY = 0;

  commands.forEach(cmd => {
    switch (cmd.code) {
      case 'M': // Move to
        currentX = cmd.x;
        currentY = cmd.y;
        points.push([currentX, currentY]);
        break;
      case 'L': // Line to
        currentX = cmd.x;
        currentY = cmd.y;
        points.push([currentX, currentY]);
        break;
      case 'C': // Cubic bezier (simplified to line to for now)
        currentX = cmd.x;
        currentY = cmd.y;
        points.push([currentX, currentY]);
        break;
      case 'Z': // Close path
        break;
    }
  });

  // Create a simple polygon from points
  // Note: This is a simplified implementation
  // For production, you'd want better curve handling
  if (points.length < 3) {
    throw new Error('Not enough points to create a geometry');
  }

  return geom2.fromPoints(points);
}

/**
 * Extrude SVG to 3D and generate STL
 * @param {string} svgContent - SVG content as string
 * @param {object} options - Extrusion options
 * @returns {Promise<ArrayBuffer>} - STL file as ArrayBuffer
 */
export async function svgTo3D(svgContent, options = {}) {
  const {
    height = 5,           // Extrusion height in mm
    twistAngle = 0,       // Twist angle in degrees
    twistSteps = 1,       // Number of twist steps
    scale = 1             // Scale factor
  } = options;

  try {
    // Parse SVG to 2D geometry
    const shape2D = svgToGeom2(svgContent);

    // Extrude to 3D
    const shape3D = extrudeLinear(
      { height, twistAngle, twistSteps },
      shape2D
    );

    // Serialize to STL format
    const rawData = serialize({ binary: true }, shape3D);

    return rawData[0];
  } catch (error) {
    throw new Error(`Failed to convert SVG to 3D: ${error.message}`);
  }
}

/**
 * Save STL content to a file
 * @param {ArrayBuffer} stlData - STL data as ArrayBuffer
 * @param {string} outputPath - Path to save the STL file
 */
export async function saveStl(stlData, outputPath) {
  await fs.writeFile(outputPath, Buffer.from(stlData));
  console.log(`STL saved to: ${outputPath}`);
}
