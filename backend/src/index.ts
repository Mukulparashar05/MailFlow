import 'dotenv/config';
import './types'; // Load global Express type augmentation
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { configurePassport } from './config/passport';
import { errorHandler, notFoundHandler } from './middleware/validation';
import { logger } from './config/logger';

import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow frontend proxying in dev
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  }),
);

// Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    // Production environment validation
    if (process.env.NODE_ENV === 'production') {
      const requiredEnvVars = [
        'DATABASE_URL',
        'REDIS_URL',
        'SESSION_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
      ];

      const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);
      if (missing.length > 0) {
        logger.error('Missing required environment variables for production', {
          missing,
        });
        throw new Error(
          `Missing required environment variables: ${missing.join(', ')}`,
        );
      }

      // Warn if using default session secret
      if (process.env.SESSION_SECRET === 'change-this-in-production') {
        logger.error('Production deployment with default SESSION_SECRET detected!');
        throw new Error(
          'SESSION_SECRET must be changed from default value in production',
        );
      }
    }

    await connectDatabase();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        frontendUrl: FRONTEND_URL,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal} - shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export default app;
