const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { jwtSecret } = require('../config/env');
const {
  signAccessToken,
  signRefreshToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  cookieName,
} = require('../utils/tokens');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const issueSession = async (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: hashToken(refreshToken) },
  });
  setRefreshCookie(res, refreshToken);
  return accessToken;
};

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

  const accessToken = await issueSession(res, user);
  res.status(201).json({
    message: 'User registered',
    data: { user: publicUser(user), accessToken },
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

  const accessToken = await issueSession(res, user);
  res.json({
    message: 'Login success',
    data: { user: publicUser(user), accessToken },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[cookieName];
  if (!token) throw new HttpError(401, 'Refresh token tidak ada');

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Refresh token tidak valid atau kedaluwarsa');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Refresh token sudah tidak berlaku');
  }

  const accessToken = await issueSession(res, user);
  res.json({ message: 'Token diperbarui', data: { user: publicUser(user), accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[cookieName];
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      await prisma.user.updateMany({
        where: { id: payload.id, refreshTokenHash: hashToken(token) },
        data: { refreshTokenHash: null },
      });
    } catch {
      // token rusak/kedaluwarsa: cukup bersihkan cookie
    }
  }
  clearRefreshCookie(res);
  res.json({ message: 'Logout berhasil' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ data: { user: req.user } });
});

module.exports = { register, login, refresh, logout, me };
