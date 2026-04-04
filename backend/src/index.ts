import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRouter from './routes/auth.routes';
import taskRouter from './routes/task.routes';
import { errorHandler } from './middleware/error.middleware';
import teamRouter from './routes/team.routes';
import profileRouter from './routes/profile.routes';
import settingsRouter from './routes/settings.routes';
import { startScheduler } from './lib/scheduler';
import aiRouter from './routes/ai.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/team', teamRouter);

// Routes
app.use('/auth', authRouter);
app.use('/tasks', taskRouter);
app.use('/profiles', profileRouter);
app.use('/settings', settingsRouter);
app.use('/ai', aiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start cron scheduler
startScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
