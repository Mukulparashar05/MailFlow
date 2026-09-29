import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // In production, don't log sensitive meta data
  const safeKeys = ['campaignId', 'emailJobId', 'jobId', 'attempt', 'count', 'total'];
  const safeMeta = isProduction
    ? Object.fromEntries(
        Object.entries(meta).filter(([key]) => safeKeys.includes(key))
      )
    : meta;
  const metaStr = Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '';
  return `${timestamp} [${level}]: ${stack || message} ${metaStr}`;
});

export const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new transports.Console({
      format: combine(
        isProduction ? format.uncolorize() : colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
  // Don't exit on handled errors
  exitOnError: false,
});
