const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, 'name is required');
  }
  if (!isEmail(email)) throw new HttpError(400, 'valid email is required');
  if (!password || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email, password: passwordHash, role: 'staff' },
  });

  res.status(201).json({
    message: 'User registered',
    data: { user: publicUser(user), token: signToken(user) },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!isEmail(email) || !password) {
    throw new HttpError(400, 'email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const match = user ? await bcrypt.compare(password, user.password) : false;
  if (!match) throw new HttpError(401, 'Email atau password salah');

  res.json({
    message: 'Login success',
    data: { user: publicUser(user), token: signToken(user) },
  });
});

module.exports = { register, login };
