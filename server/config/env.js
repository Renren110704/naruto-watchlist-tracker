import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/.env takes precedence, then the project-root .env.
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : nodeEnv === 'production',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
};

/** Fails fast on missing or unsafe configuration. */
export function assertEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is not set');
  if (!env.jwtSecret) problems.push('JWT_SECRET is not set');
  else if (env.jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
  if (problems.length) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}\nCopy .env.example to .env and fill it in.`);
  }
}
