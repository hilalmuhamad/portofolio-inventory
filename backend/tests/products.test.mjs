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

async function adminToken() {
  await createUser({ email: 'admin@test.com', role: 'admin' });
  return loginAs('admin@test.com');
}

describe('Produk', () => {
  it('create produk mengabaikan input stock dari client (default 0)', async () => {
    const token = await adminToken();
    const category = await createCategory();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'A-1', name: 'Barang', price: 5000, categoryId: category.id, stock: 999 });

    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('Elektronik');
  });

  it('SKU duplikat ditolak 409', async () => {
    const token = await adminToken();
    const category = await createCategory();
    const payload = { sku: 'A-1', name: 'Barang', price: 5000, categoryId: category.id };

    await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(payload);
    const dup = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(dup.status).toBe(409);
  });

  it('harga tidak valid ditolak 400', async () => {
    const token = await adminToken();
    const category = await createCategory();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'A-2', name: 'Barang', price: -100, categoryId: category.id });

    expect(res.status).toBe(400);
  });

  it('kategoriId tidak ada = 400', async () => {
    const token = await adminToken();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'A-3', name: 'Barang', price: 1000, categoryId: 99999 });

    expect(res.status).toBe(400);
  });

  it('produk dengan riwayat transaksi tidak bisa dihapus (409)', async () => {
    const token = await adminToken();
    const category = await createCategory();
    const product = await createProduct({ sku: 'A-4', categoryId: category.id, stock: 5 });
    await prisma.transaction.create({
      data: { type: 'masuk', quantity: 1, productId: product.id, userId: 1 },
    });

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('list produk mendukung search & pagination', async () => {
    const token = await adminToken();
    const category = await createCategory();
    await createProduct({ sku: 'KABEL-1', name: 'Kabel USB', categoryId: category.id });
    await createProduct({ sku: 'MOUSE-1', name: 'Mouse', categoryId: category.id });

    const res = await request(app)
      .get('/api/products?search=kabel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].sku).toBe('KABEL-1');
  });
});
