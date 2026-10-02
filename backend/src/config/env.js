require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_MS) || 7 * 24 * 60 * 60 * 1000,
  cookieName: 'refreshToken',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
