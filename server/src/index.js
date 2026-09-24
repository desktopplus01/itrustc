import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import marketRoutes from './routes/market.js';
import paymentRoutes from './routes/payments.js';
import investmentRoutes from './routes/investments.js';
import cronRoutes from './routes/cron.js';
import { startAccrualLoop } from './lib/accrual.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', cronRoutes);
app.use('/api/investments', investmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// On Vercel (serverless) there is no long-lived listen; the platform imports
// the app from ../api/index.js and a cron calls /api/cron/accrual instead.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startAccrualLoop(); // materialize ROI growth on active investments every 30s
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

export default app;
