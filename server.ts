import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import authRoutes from './src/server/routes/authRoutes.js';
import shipmentRoutes from './src/server/routes/shipmentRoutes.js';
import trackRoutes from './src/server/routes/trackRoutes.js';
import statsRoutes from './src/server/routes/statsRoutes.js';
import mongoose from 'mongoose';
import supportRoutes from './src/server/routes/supportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
fs.mkdirSync(uploadsDir, { recursive: true });
}
const app = express();
const upload = multer({
storage: multer.diskStorage({
destination: (_req, file, cb) => {
cb(null, uploadsDir);
},
filename: (req, file, cb) => {
const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
cb(null, `${Date.now()}-${safeName}`);
},
}),
limits: {
fileSize: 10 * 1024 * 1024,
files: 5,
},
});

// Connect to MongoDB
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/support', supportRoutes);

// Download project archive endpoints
app.get('/api/download-project', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'public', 'freightpulse-shipment-tracking.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="freightpulse-shipment-tracking.zip"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(zipPath);
});

app.get('/api/download-tar', (_req: Request, res: Response) => {
  const tarPath = path.resolve(__dirname, 'public', 'freightpulse-shipment-tracking.tar.gz');
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="freightpulse-shipment-tracking.tar.gz"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(tarPath);
});

// Base64 download endpoint for iframe sandbox bypass
app.get('/api/download-project-base64', (_req: Request, res: Response) => {
  try {
    const zipPath = path.resolve(__dirname, 'public', 'freightpulse-shipment-tracking.zip');
    if (fs.existsSync(zipPath)) {
      const fileBuffer = fs.readFileSync(zipPath);
      res.json({
        filename: 'freightpulse-shipment-tracking.zip',
        mimeType: 'application/zip',
        sizeBytes: fileBuffer.length,
        base64: fileBuffer.toString('base64'),
      });
    } else {
      res.status(404).json({ error: 'Archive not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check / API status endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'FreightPulse Logistics API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
  });
});

async function startServer() {
// Connect to MongoDB before starting the server.
if (mongoose.connection.readyState !== 1) {
await mongoose.connect(process.env.MONGODB_URI!);
console.log('[FreightPulse] MongoDB connected successfully.');
}

// Serve uploaded files in both development and production.
app.use('/uploads', express.static(uploadsDir));

if (!isProduction) {
// Serve the React frontend through Vite in development.
const { createServer: createViteServer } = await import('vite');

const vite = await createViteServer({
  configFile: path.resolve(__dirname, 'vite.config.ts'),
  server: {
    middlewareMode: true,
  },
  appType: 'spa',
});

app.use(vite.middlewares);

} else {
// Serve the built React frontend in production.
const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FreightPulse] Server running on port ${PORT}`);
  console.log(`[FreightPulse] Open http://localhost:${PORT}`);
});
}
startServer().catch((err) => {
console.error('[FreightPulse] Failed to start server:', err);
process.exit(1);
});