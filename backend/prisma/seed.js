require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Memulai proses seeding data...');

  // 1. Buat User (Admin dan Staff)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // upsert agar tidak error (duplicate) jika dijalankan berkali-kali
  await prisma.user.upsert({
    where: { email: 'admin@toko.com' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@toko.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@toko.com' },
    update: {},
    create: {
      name: 'Staff Gudang',
      email: 'staff@toko.com',
      password: hashedPassword,
      role: 'staff',
    },
  });
  console.log('User dummy berhasil dibuat');

  // 2. Buat Kategori
  // name bukan unique, jadi cari dulu -> baru buat (idempotent saat seed diulang)
  const upsertCategory = async (name, description) => {
    const existing = await prisma.category.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.category.create({ data: { name, description } });
  };

  const kategoriElektronik = await upsertCategory('Elektronik', 'Gadget dan alat elektronik');
  const kategoriPakaian = await upsertCategory('Pakaian', 'Baju, celana, dan aksesoris');
  const kategoriMakanan = await upsertCategory('Makanan & Minuman', 'Kebutuhan konsumsi harian');
  console.log('Kategori dummy berhasil dibuat');

  // 3. Buat Produk (stok default 0 sesuai skema)
  // sku unique -> pakai upsert, bukan createMany (createMany gagal di run kedua)
  const products = [
    { sku: 'ELK-001', name: 'Laptop Asus ROG', price: 15000000, categoryId: kategoriElektronik.id },
    { sku: 'ELK-002', name: 'Mouse Wireless Logitech', price: 250000, categoryId: kategoriElektronik.id },
    { sku: 'ELK-003', name: 'Keyboard Mechanical', price: 750000, categoryId: kategoriElektronik.id },
    { sku: 'PKN-001', name: 'Kaos Polos Hitam XL', price: 50000, categoryId: kategoriPakaian.id },
    { sku: 'PKN-002', name: 'Celana Jeans Denim', price: 200000, categoryId: kategoriPakaian.id },
    { sku: 'MKN-001', name: 'Kopi Kapal Api 165g', price: 15000, categoryId: kategoriMakanan.id },
    { sku: 'MKN-002', name: 'Indomie Goreng (Dus)', price: 115000, categoryId: kategoriMakanan.id },
    { sku: 'MKN-003', name: 'Air Mineral Aqua 600ml', price: 3500, categoryId: kategoriMakanan.id },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log('Produk dummy berhasil dibuat');

  console.log('Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
