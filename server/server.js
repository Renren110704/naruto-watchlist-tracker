import mongoose from 'mongoose';
import { assertEnv, env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

try {
  assertEnv();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Start serving immediately; requests get a 503 until MongoDB is reachable.
connectDB(env.mongoUri, { retries: Infinity, delayMs: 5000 }).catch(() => {});
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await disconnectDB().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
