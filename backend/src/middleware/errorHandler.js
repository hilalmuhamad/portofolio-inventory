const { Prisma } = require('@prisma/client');

function notFound(req, res, next) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
      return res.status(409).json({ message: `Duplicate value for unique field: ${field}` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ message: 'Related record does not exist' });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ message: 'Invalid request payload' });
  }

  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
