require('dotenv').config();
const bcrypt = require('bcryptjs');

const prisma = require('./lib/prisma');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123';

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Administrator', email, password: passwordHash, role: 'admin' },
  });

  console.log(`Admin ready: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
