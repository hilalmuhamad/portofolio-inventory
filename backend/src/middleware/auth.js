const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing or invalid Authorization header');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) throw new HttpError(401, 'User no longer exists');

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new HttpError(403, 'Forbidden: insufficient role');
  }
  next();
};

module.exports = { authenticate, authorize };
