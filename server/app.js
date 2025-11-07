import express from 'express';
import multer from 'multer';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { convertPngToStl } from '../src/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.APP_PASSWORD || 'stl-admin-2024';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'stl-pipeline-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Routes

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out' });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Convert endpoint (protected)
app.post('/api/convert', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const options = {
      outputDir: path.join(__dirname, '../output'),
      saveSvgFile: req.body.saveSvg !== 'false',
      svgOptions: {
        colorMode: req.body.colorMode === 'true',
        threshold: parseInt(req.body.threshold) || 128,
        turdSize: parseInt(req.body.turdSize) || 2,
        optCurve: req.body.optCurve !== 'false',
        optTolerance: parseFloat(req.body.optTolerance) || 0.2
      },
      extrusionOptions: {
        height: parseFloat(req.body.height) || 5,
        twistAngle: parseFloat(req.body.twistAngle) || 0,
        scale: parseFloat(req.body.scale) || 1
      }
    };

    console.log('Converting file:', req.file.originalname);
    console.log('Options:', options);

    const result = await convertPngToStl(inputPath, options);

    // Clean up uploaded file
    await fs.unlink(inputPath);

    // Get file URLs
    const stlFilename = path.basename(result.stl);
    const svgFilename = result.svg ? path.basename(result.svg) : null;

    res.json({
      success: true,
      message: 'Conversion successful',
      files: {
        stl: `/output/${stlFilename}`,
        svg: svgFilename ? `/output/${svgFilename}` : null
      }
    });

  } catch (error) {
    console.error('Conversion error:', error);

    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error('Error cleaning up file:', e);
      }
    }

    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   STL Pipeline Server                      ║
╠════════════════════════════════════════════╣
║   URL: http://localhost:${PORT}              ║
║   Password: ${PASSWORD.substring(0, 3)}${'*'.repeat(PASSWORD.length - 3)}                ║
║   Status: Running                          ║
╚════════════════════════════════════════════╝
  `);
});
