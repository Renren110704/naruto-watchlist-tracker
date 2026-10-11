import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-that-is-definitely-longer-than-32-chars';
process.env.BCRYPT_ROUNDS = '4';

const { createApp } = await import('../app.js');
const { connectDB } = await import('../config/db.js');
const { loadCatalog } = await import('../services/catalogLoader.js');
const { seedCatalog } = await import('../services/catalogSeeder.js');

let mongo;

/** Starts an in-memory MongoDB, seeds the real catalog and returns an app instance. */
export async function setup({ seed = true } = {}) {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri('nwt_test'), { retries: 1, log: {} });
  if (seed) await seedCatalog(loadCatalog());
  return createApp();
}

export async function teardown() {
  await mongoose.disconnect();
  await mongo?.stop();
}

/** A supertest agent that keeps cookies and sends the CSRF header automatically. */
export async function client(app) {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf').expect(200);
  const token = res.body.csrfToken;
  const withCsrf = (method) => (url) => agent[method](url).set('X-CSRF-Token', token);
  return {
    agent,
    csrf: token,
    get: (url) => agent.get(url),
    post: withCsrf('post'),
    put: withCsrf('put'),
    patch: withCsrf('patch'),
    delete: withCsrf('delete'),
  };
}

let n = 0;
export async function signedInClient(app, overrides = {}) {
  const c = await client(app);
  n += 1;
  const user = {
    username: `ninja${n}`,
    email: `ninja${n}@leaf.test`,
    password: 'dattebayo123',
    confirmPassword: 'dattebayo123',
    ...overrides,
  };
  const res = await c.post('/api/auth/signup').send(user);
  if (res.status !== 201) throw new Error(`signup failed: ${JSON.stringify(res.body)}`);
  return { ...c, user: res.body.user, credentials: user };
}
