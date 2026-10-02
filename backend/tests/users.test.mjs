import { describe, it, expect, beforeEach, afterAll } from 'vitest';

import { app, prisma, request, resetDb, createUser, loginAs } from './helpers.mjs';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function adminToken() {
  await createUser({ email: 'admin@test.com', role: 'admin' });
  return loginAs('admin@test.com');
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Manajemen User', () => {
  it('hanya admin yang bisa mengakses (staff 403)', async () => {
    await createUser({ email: 'staff@test.com', role: 'staff' });
    const staffToken = await loginAs('staff@test.com');
    const res = await request(app).get('/api/users').set(auth(staffToken));
    expect(res.status).toBe(403);
  });

  it('admin bisa membuat user dengan role admin', async () => {
    const token = await adminToken();
    const res = await request(app)
      .post('/api/users')
      .set(auth(token))
      .send({ name: 'Baru', email: 'baru@test.com', password: 'secret123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('admin');
    expect(res.body.data.password).toBeUndefined();
  });

  it('tidak bisa menurunkan role akun sendiri', async () => {
    const token = await adminToken();
    const me = await prisma.user.findFirst({ where: { email: 'admin@test.com' } });
    const res = await request(app)
      .put(`/api/users/${me.id}`)
      .set(auth(token))
      .send({ role: 'staff' });
    expect(res.status).toBe(400);
  });

  it('tidak bisa menghapus akun sendiri', async () => {
    const token = await adminToken();
    const me = await prisma.user.findFirst({ where: { email: 'admin@test.com' } });
    const res = await request(app).delete(`/api/users/${me.id}`).set(auth(token));
    expect(res.status).toBe(400);
  });

  it('admin lain masih bisa dihapus selama bukan akun sendiri', async () => {
    const token = await adminToken();
    const other = await createUser({ email: 'admin2@test.com', role: 'admin' });
    const res = await request(app).delete(`/api/users/${other.id}`).set(auth(token));
    expect(res.status).toBe(200);
    const gone = await prisma.user.findUnique({ where: { id: other.id } });
    expect(gone).toBeNull();
  });

  it('reset password mencabut refresh token user tersebut', async () => {
    const token = await adminToken();
    const target = await createUser({ email: 'target@test.com', role: 'staff' });
    await prisma.user.update({
      where: { id: target.id },
      data: { refreshTokenHash: 'hash-lama' },
    });

    const res = await request(app)
      .put(`/api/users/${target.id}/password`)
      .set(auth(token))
      .send({ password: 'baru12345' });

    expect(res.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: target.id } });
    expect(after.refreshTokenHash).toBeNull();
  });

  it('user dengan riwayat transaksi tidak bisa dihapus (409)', async () => {
    const token = await adminToken();
    const staff = await createUser({ email: 'staff@test.com', role: 'staff' });
    const category = await prisma.category.create({ data: { name: 'X' } });
    const product = await prisma.product.create({
      data: { sku: 'S-1', name: 'P', price: 100, categoryId: category.id },
    });
    await prisma.transaction.create({
      data: { type: 'masuk', quantity: 1, productId: product.id, userId: staff.id },
    });

    const res = await request(app).delete(`/api/users/${staff.id}`).set(auth(token));
    expect(res.status).toBe(409);
  });
});
