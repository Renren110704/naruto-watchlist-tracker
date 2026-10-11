import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { client, setup, signedInClient, teardown } from './helpers.js';

let app;
before(async () => { app = await setup({ seed: false }); });
after(teardown);

describe('sign up', () => {
  it('rejects missing and invalid fields with per-field messages', async () => {
    const c = await client(app);
    const res = await c.post('/api/auth/signup').send({ username: 'a', email: 'nope', password: 'short', confirmPassword: 'x' });
    assert.equal(res.status, 422);
    assert.ok(res.body.error.details.username);
    assert.ok(res.body.error.details.email);
    assert.ok(res.body.error.details.password);
    assert.ok(res.body.error.details.confirmPassword);
  });

  it('creates an account, sets an httpOnly cookie and never returns the hash', async () => {
    const c = await client(app);
    const res = await c.post('/api/auth/signup').send({
      username: 'Naruto_U', email: 'Naruto@Leaf.test', password: 'ramen1234', confirmPassword: 'ramen1234',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, 'Naruto_U');
    assert.equal(res.body.user.email, 'naruto@leaf.test');
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
    const cookie = res.headers['set-cookie'].find((h) => h.startsWith('nwt_token='));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const me = await c.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.username, 'Naruto_U');
    assert.equal(me.body.user.passwordHash, undefined);
  });

  it('rejects duplicate email and username (case-insensitive)', async () => {
    const c = await client(app);
    const res = await c.post('/api/auth/signup').send({
      username: 'naruto_u', email: 'naruto@leaf.test', password: 'ramen1234', confirmPassword: 'ramen1234',
    });
    assert.equal(res.status, 422);
    assert.ok(res.body.error.details.email);
    assert.ok(res.body.error.details.username);
  });
});

describe('sign in / out', () => {
  it('signs in with correct credentials and rejects wrong ones', async () => {
    const c = await client(app);
    const bad = await c.post('/api/auth/signin').send({ email: 'naruto@leaf.test', password: 'wrongpass1' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.message, 'Incorrect email or password');
    const unknown = await c.post('/api/auth/signin').send({ email: 'ghost@leaf.test', password: 'whatever1' });
    assert.equal(unknown.status, 401);
    const missing = await c.post('/api/auth/signin').send({ email: '' });
    assert.equal(missing.status, 422);

    const ok = await c.post('/api/auth/signin').send({ email: 'NARUTO@leaf.test', password: 'ramen1234' });
    assert.equal(ok.status, 200);
    await c.get('/api/auth/me').expect(200);

    await c.post('/api/auth/logout').expect(200);
    await c.get('/api/auth/me').expect(401);
  });
});

describe('protection', () => {
  it('requires authentication on private routes', async () => {
    for (const url of ['/api/seasons', '/api/progress/stats', '/api/notes', '/api/auth/me']) {
      const res = await request(app).get(url);
      assert.equal(res.status, 401, url);
    }
  });

  it('rejects state-changing requests without a matching CSRF token', async () => {
    const res = await request(app).post('/api/auth/signin').send({ email: 'naruto@leaf.test', password: 'ramen1234' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'CSRF_INVALID');
    const c = await client(app);
    const wrong = await c.agent.post('/api/auth/signin').set('X-CSRF-Token', 'not-the-token')
      .send({ email: 'naruto@leaf.test', password: 'ramen1234' });
    assert.equal(wrong.status, 403);
  });

  it('rejects tampered, expired and revoked tokens', async () => {
    const tampered = await request(app).get('/api/auth/me').set('Cookie', 'nwt_token=abc.def.ghi');
    assert.equal(tampered.status, 401);
    assert.equal(tampered.body.error.code, 'TOKEN_INVALID');

    const c = await signedInClient(app);
    const expired = jwt.sign({ sub: c.user.id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Cookie', `nwt_token=${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'TOKEN_EXPIRED');

    // Changing the password revokes previously issued tokens.
    const oldCookie = (await c.post('/api/auth/signin').send({ email: c.credentials.email, password: c.credentials.password }))
      .headers['set-cookie'].find((h) => h.startsWith('nwt_token=')).split(';')[0];
    await c.patch('/api/auth/password')
      .send({ currentPassword: c.credentials.password, newPassword: 'newpass123', confirmPassword: 'newpass123' })
      .expect(200);
    const revoked = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    assert.equal(revoked.status, 401);
    assert.equal(revoked.body.error.code, 'TOKEN_REVOKED');
    await c.get('/api/auth/me').expect(200); // the current session got a fresh token
  });
});

describe('profile', () => {
  it('updates username and preferences, and deletes the account with password', async () => {
    const c = await signedInClient(app);
    const upd = await c.patch('/api/auth/me').send({ username: 'KakashiH', preferences: { includeSpecials: false } });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.user.username, 'KakashiH');
    assert.equal(upd.body.user.preferences.includeSpecials, false);

    const wrong = await c.delete('/api/auth/me').send({ password: 'nope' });
    assert.equal(wrong.status, 422);
    await c.delete('/api/auth/me').send({ password: c.credentials.password }).expect(200);
    await c.get('/api/auth/me').expect(401);
  });
});
