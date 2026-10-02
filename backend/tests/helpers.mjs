import request from 'supertest';
import bcrypt from 'bcryptjs';

import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

export { app, prisma, request };

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Transaction", "Product", "Category", "User" RESTART IDENTITY CASCADE',
  );
}

export async function createUser({ name = 'Test', email, role = 'staff', password = 'password123' }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { name, email, password: passwordHash, role } });
}

export async function loginAs(email, password = 'password123') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

export async function createCategory(name = 'Elektronik') {
  return prisma.category.create({ data: { name, description: 'test' } });
}

export async function createProduct({ sku = 'SKU-1', name = 'Produk', price = 1000, stock = 0, categoryId }) {
  return prisma.product.create({ data: { sku, name, price, stock, categoryId } });
}
