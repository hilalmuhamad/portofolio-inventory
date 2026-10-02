import { describe, it, expect, beforeEach, afterAll } from 'vitest';

import {
  app,
  prisma,
  request,
  resetDb,
  createUser,
  loginAs,
  createCategory,
  createProduct,
} from './helpers.mjs';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedStaffAndProduct({ stock = 10 } = {}) {
  await createUser({ email: 'staff@test.com', role: 'staff' });
  const token = await loginAs('staff@test.com');
  const category = await createCategory();
  const product = await createProduct({ sku: 'P-1', categoryId: category.id, stock });
  return { token, product };
}

const post = (token, body) =>
  request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`).send(body);

describe('Transaksi - stok', () => {
  it('barang masuk menambah stok', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 10 });
    const res = await post(token, { type: 'masuk', quantity: 5, productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body.data.user.name).toBe('Test');
    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after.stock).toBe(15);
  });

  it('barang keluar mengurangi stok', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 10 });
    const res = await post(token, { type: 'keluar', quantity: 4, productId: product.id });

    expect(res.status).toBe(201);
    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after.stock).toBe(6);
  });

  it('keluar melebihi stok ditolak 400 dan stok tidak berubah', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 3 });
    const res = await post(token, { type: 'keluar', quantity: 999, productId: product.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stok/i);
    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after.stock).toBe(3);
  });

  it('transaksi gagal tidak menyisakan record (atomik)', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 3 });
    await post(token, { type: 'keluar', quantity: 999, productId: product.id });
    const count = await prisma.transaction.count();
    expect(count).toBe(0);
  });

  it('keluar tepat sejumlah stok diperbolehkan (stok jadi 0)', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 5 });
    const res = await post(token, { type: 'keluar', quantity: 5, productId: product.id });

    expect(res.status).toBe(201);
    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after.stock).toBe(0);
  });

  it('dua request keluar bersamaan tidak membuat stok minus', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 10 });
    const results = await Promise.all([
      post(token, { type: 'keluar', quantity: 8, productId: product.id }),
      post(token, { type: 'keluar', quantity: 8, productId: product.id }),
    ]);

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 400]);
    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after.stock).toBe(2);
  });

  it('menolak type tidak valid dan quantity <= 0', async () => {
    const { token, product } = await seedStaffAndProduct();
    expect((await post(token, { type: 'hapus', quantity: 1, productId: product.id })).status).toBe(400);
    expect((await post(token, { type: 'masuk', quantity: 0, productId: product.id })).status).toBe(400);
  });

  it('produk tidak ada = 404', async () => {
    const { token } = await seedStaffAndProduct();
    const res = await post(token, { type: 'masuk', quantity: 1, productId: 99999 });
    expect(res.status).toBe(404);
  });

  it('riwayat dapat difilter berdasarkan type', async () => {
    const { token, product } = await seedStaffAndProduct({ stock: 10 });
    await post(token, { type: 'masuk', quantity: 5, productId: product.id });
    await post(token, { type: 'keluar', quantity: 2, productId: product.id });

    const res = await request(app)
      .get('/api/transactions?type=keluar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].type).toBe('keluar');
  });

  it('transaksi tidak dapat diubah atau dihapus (jejak audit)', async () => {
    const { token, product } = await seedStaffAndProduct();
    const created = await post(token, { type: 'masuk', quantity: 5, productId: product.id });
    const id = created.body.data.id;

    const put = await request(app)
      .put(`/api/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });
    const del = await request(app)
      .delete(`/api/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
  });
});
