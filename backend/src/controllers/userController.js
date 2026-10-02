const bcrypt = require('bcryptjs');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const safeUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid user id');
  return id;
};

const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: safeUser, orderBy: { id: 'asc' } });
  res.json({ data: users });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !name.trim()) throw new HttpError(400, 'name is required');
  if (!isEmail(email)) throw new HttpError(400, 'valid email is required');
  if (!password || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }
  if (role && !['admin', 'staff'].includes(role)) {
    throw new HttpError(400, "role must be 'admin' or 'staff'");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email,
      password: await bcrypt.hash(password, 10),
      role: role ?? 'staff',
    },
    select: safeUser,
  });

  res.status(201).json({ message: 'User created', data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { name, role } = req.body;
  const data = {};

  if (name !== undefined) {
    if (!name.trim()) throw new HttpError(400, 'name cannot be empty');
    data.name = name.trim();
  }
  if (role !== undefined) {
    if (!['admin', 'staff'].includes(role)) {
      throw new HttpError(400, "role must be 'admin' or 'staff'");
    }
    if (role === 'staff' && id === req.user.id) {
      throw new HttpError(400, 'Tidak dapat menurunkan role akun sendiri');
    }
    data.role = role;
  }

  const user = await prisma.user.update({ where: { id }, data, select: safeUser });
  res.json({ message: 'User updated', data: user });
});

const resetPassword = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { password } = req.body;
  if (!password || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(password, 10), refreshTokenHash: null },
  });

  res.json({ message: 'Password reset; sesi lama user tersebut dicabut' });
});

const deleteUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (id === req.user.id) throw new HttpError(400, 'Tidak dapat menghapus akun sendiri');

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, 'User not found');

  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) throw new HttpError(400, 'Minimal harus ada satu admin');
  }

  const transactionCount = await prisma.transaction.count({ where: { userId: id } });
  if (transactionCount > 0) {
    throw new HttpError(409, 'User punya riwayat transaksi; tidak dapat dihapus');
  }

  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
});

module.exports = { getUsers, createUser, updateUser, resetPassword, deleteUser };
