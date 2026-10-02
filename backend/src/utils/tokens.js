const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { jwtSecret, accessTokenTtl, refreshTokenTtl, refreshTokenTtlMs, cookieName, isProduction } =
  require('../config/env');

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: accessTokenTtl });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id, jti: crypto.randomUUID() }, jwtSecret, { expiresIn: refreshTokenTtl });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: refreshTokenTtlMs,
});

const setRefreshCookie = (res, token) => {
  res.cookie(cookieName, token, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(cookieName, { ...refreshCookieOptions(), maxAge: undefined });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  cookieName,
};
