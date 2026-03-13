import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------
// Middleware
// ---------------------
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ---------------------
// Routes
// ---------------------
app.use('/v1', healthRouter);

// ---------------------
// Start
// ---------------------
app.listen(PORT, () => {
  console.log(`nhuthungfoto API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/v1/health`);
});

export default app;
