/**
 * Vercel entry point: runs the Express API as a single serverless function.
 * vercel.json rewrites every /api/* request here; Express still sees the original URL.
 * Local development and `npm start` keep using server/server.js instead.
 */
import { assertEnv, env } from '../server/config/env.js';
import { connectDB } from '../server/config/db.js';
import { createApp } from '../server/app.js';

assertEnv();
const app = createApp();

// One shared connection per function instance, reused across requests.
let ready = null;
function ensureDb() {
  ready ??= connectDB(env.mongoUri, { retries: 1 }).catch((err) => {
    ready = null; // let the next request try again
    throw err;
  });
  return ready;
}

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch {
    // The app's requireDb middleware answers 503 while the database is unreachable.
  }
  return app(req, res);
}
