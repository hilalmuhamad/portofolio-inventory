import { describe, it, expect, beforeEach, afterAll } from 'vitest';

import { app, prisma, request, resetDb, createUser, loginAs } from './helpers.mjs';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('Auth', () => {
  it('register selalu memberi role staff walau client minta admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Budi', email: 'budi@test.com', password: 'secret123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('staff');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('register menolak email duplikat (409)', async () => {
    await createUser({ email: 'dup@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'dup@test.com', password: 'secret123' });

    expect(res.status).toBe(409);
  });

  it('register menolak password pendek (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@test.com', password: '123' });

    expect(res.status).toBe(400);
  });

  it('login sukses mengembalikan token', async () => {
    await createUser({ email: 'admin@test.com', role: 'admin' });
    const token = await loginAs('admin@test.com');
    expect(token).toBeTruthy();
  });

  it('login password salah ditolak 401', async () => {
    await createUser({ email: 'admin@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'salah' });
    expect(res.status).toBe(401);
  });

  it('akses route terproteksi tanpa token = 401', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('staff dilarang menulis kategori (403), admin boleh (201)', async () => {
    await createUser({ email: 'staff@test.com', role: 'staff' });
    await createUser({ email: 'admin@test.com', role: 'admin' });

    const staffToken = await loginAs('staff@test.com');
    const adminToken = await loginAs('admin@test.com');

    const forbidden = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'ATK' });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ATK' });
    expect(allowed.status).toBe(201);
  });
});

describe('Refresh token', () => {
  const cookieOf = (res) => res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

  it('login menyetel cookie httpOnly dan refresh mengembalikan access token baru', async () => {
    await createUser({ email: 'admin@test.com', role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    const cookie = cookieOf(login);
    expect(cookie).toMatch(/HttpOnly/i);

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
  });

  it('refresh tanpa cookie = 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('logout mencabut refresh token (refresh berikutnya 401)', async () => {
    await createUser({ email: 'admin@test.com', role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    const cookie = cookieOf(login);

    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);

    const after = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});
