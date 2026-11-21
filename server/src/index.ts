import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './db';
import { searchRouter } from './routes/search';
import { recordsRouter } from './routes/records';
import { verifyRouter } from './routes/verify';
import { cadastreRouter } from './routes/cadastre';
import { tilesRouter } from './routes/tiles';
import { terraRouter } from './routes/terra';
import { authRouter } from './routes/auth';
import { diligenceRouter } from './routes/diligence';
import { jobsRouter } from './routes/jobs';
import './services/jobWorkerPool';
import { autoSeedCadastre } from './services/cadastreIngest';
import { seedEncumbranceData } from './db/seedEncumbranceData';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '4000', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/records/jobs', jobsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/cadastre', cadastreRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/terra', terraRouter);
app.use('/api/diligence', diligenceRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Landeed 2.0 Backend (TinyFish AI + Blockchain)',
    time: new Date().toISOString()
  });
});

// Auto-seed cadastral parcels if database is newly initialized
try {
  autoSeedCadastre();
} catch (seedErr: any) {
  console.warn('Startup cadastral auto-seed notice:', seedErr.message);
}

// Auto-seed CERSAI and e-Courts encumbrance records
try {
  seedEncumbranceData();
} catch (seedErr: any) {
  console.warn('Startup encumbrance auto-seed notice:', seedErr.message);
}

// Global error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ServerError] Unhandled request error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Process-level guards against abrupt daemon termination
process.on('uncaughtException', (err: Error) => {
  console.error('[Process] Uncaught Exception:', err.stack || err.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Process] Unhandled Rejection:', reason?.stack || reason?.message || reason);
});

app.listen(port, () => {
  console.log(`====================================================`);
  console.log(` Landeed 2.0 Backend Service running on port ${port}`);
  console.log(` • Health check: http://localhost:${port}/api/health`);
  console.log(` • Auth API:     http://localhost:${port}/api/auth`);
  console.log(` • States API:   http://localhost:${port}/api/states`);
  console.log(` • Records API:  http://localhost:${port}/api/records`);
  console.log(` • Cadastre API: http://localhost:${port}/api/cadastre/parcels`);
  console.log(` • Tiles Proxy:  http://localhost:${port}/api/tiles/wms/:state/:z/:x/:y`);
  console.log(` • Terra AI API: http://localhost:${port}/api/terra/chat`);
  console.log(` • Verification: http://localhost:${port}/api/verify/:hash`);
  console.log(`====================================================`);
});

