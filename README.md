# STL Pipeline

Convert PNG images to 3D printable STL files through vectorization and extrusion.

## Features

- **PNG → SVG**: Automatic vectorization using potrace
- **SVG → 3D**: Extrusion with customizable parameters
- **3D Printing Ready**: Direct STL output for slicers
- **Batch Processing**: Convert multiple images at once
- **Parameter Control**: Adjust height, threshold, scale, and twist

## Pipeline Overview

```
PNG Image → Vectorization → SVG → Extrusion → STL File
```

## Installation

```bash
npm install
```

## Usage

### Command Line Interface

#### Convert a single image:

```bash
npm run convert -- examples/logo.png
```

#### With custom parameters:

```bash
npm run convert -- examples/logo.png \
  --output ./output \
  --height 10 \
  --threshold 128 \
  --scale 1.5 \
  --twist 45
```

#### Batch convert multiple images:

```bash
npm run convert batch "examples/*.png" --output ./output
```

### Programmatic API

```javascript
import { convertPngToStl } from './src/index.js';

const result = await convertPngToStl('input.png', {
  outputDir: './output',
  svgOptions: {
    threshold: 128,      // Black/white threshold (0-255)
    turdSize: 2,        // Suppress speckles
    optCurve: true,     // Optimize curves
    optTolerance: 0.2   // Curve optimization
  },
  extrusionOptions: {
    height: 5,          // Height in mm
    twistAngle: 0,      // Twist in degrees
    scale: 1            // Scale factor
  }
});

console.log('STL file:', result.stl);
```

## Parameters

### SVG Conversion Options

- **threshold** (0-255): Determines black vs white pixels. Lower = more black.
- **turdSize**: Suppress speckles of up to this many pixels.
- **optCurve**: Enable curve optimization (smoother paths).
- **optTolerance**: Curve optimization tolerance (higher = smoother).

### Extrusion Options

- **height** (mm): How tall to make the 3D object.
- **twistAngle** (degrees): Rotate the top relative to bottom.
- **twistSteps**: Number of steps for twist interpolation.
- **scale**: Multiply dimensions (1 = original size).

## Project Structure

```
STLPipeline/
├── src/
│   ├── index.js        # Main pipeline orchestrator
│   ├── pngToSvg.js     # PNG → SVG conversion
│   ├── svgTo3d.js      # SVG → 3D extrusion
│   └── cli.js          # Command line interface
├── examples/           # Example input images
├── output/            # Generated SVG/STL files
└── package.json
```

## How It Works

1. **Vectorization**: The PNG image is processed with Sharp (converted to grayscale) and then vectorized using Potrace, which traces the bitmap into smooth SVG paths.

2. **Path Parsing**: The SVG path data is parsed into coordinates and converted to JSCAD's geom2 format.

3. **Extrusion**: The 2D geometry is extruded into 3D using JSCAD's modeling tools.

4. **STL Export**: The 3D model is serialized to binary STL format, ready for 3D printing.

## Technologies Used

- **[Potrace](https://www.npmjs.com/package/potrace)**: Bitmap tracing/vectorization
- **[Sharp](https://sharp.pixelplumbing.com/)**: High-performance image processing
- **[JSCAD](https://openjscad.xyz/)**: Programmatic CAD modeling
- **[Maker.js](https://maker.js.org/)**: 2D CAD library (for future enhancements)

## Tips for Best Results

1. **High Contrast Images**: Work best with clear black/white distinction
2. **Simple Shapes**: Complex images may not extrude well
3. **Adjust Threshold**: Try different values (64, 128, 192) for different effects
4. **Start Small**: Use low extrusion heights (2-5mm) for testing
5. **Check SVG First**: Review the generated SVG before waiting for STL

## Limitations

- Currently handles simple path-based SVGs (complex curves simplified to lines)
- Best suited for logos, icons, and simple graphics
- Very detailed images may produce large STL files

## Future Enhancements

- [ ] Better Bezier curve handling in SVG parsing
- [ ] Multi-layer support for relief effects
- [ ] Maker.js integration for advanced 2D operations
- [ ] Boolean operations (combine multiple shapes)
- [ ] Web interface for parameter preview
- [ ] Support for color-based depth mapping

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
