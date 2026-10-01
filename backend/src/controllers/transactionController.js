const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const parseId = (value, label = 'id') => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Invalid ${label}`);
  return id;
};

const safeUser = { id: true, name: true, email: true, role: true };

const createTransaction = asyncHandler(async (req, res) => {
  const { type, quantity, productId } = req.body;

  if (type !== 'masuk' && type !== 'keluar') {
    throw new HttpError(400, "type must be 'masuk' or 'keluar'");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new HttpError(400, 'quantity must be a positive integer');
  }
  const pid = parseId(productId, 'productId');

  const trx = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: pid } });
    if (!product) throw new HttpError(404, 'Product not found');

    const newStock = type === 'masuk' ? product.stock + quantity : product.stock - quantity;
    if (newStock < 0) {
      throw new HttpError(400, `Stok tidak mencukupi (sisa: ${product.stock})`);
    }

    const record = await tx.transaction.create({
      data: { type, quantity, productId: pid, userId: req.user.id },
      include: { product: true, user: { select: safeUser } },
    });
    await tx.product.update({ where: { id: pid }, data: { stock: newStock } });
    return record;
  });

  res.status(201).json({ message: 'Transaction recorded', data: trx });
});

const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { type, productId } = req.query;

  const where = {};
  if (type) {
    if (type !== 'masuk' && type !== 'keluar') throw new HttpError(400, "type must be 'masuk' or 'keluar'");
    where.type = type;
  }
  if (productId) where.productId = parseId(productId, 'productId');

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { product: true, user: { select: safeUser } },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getTransactionById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const trx = await prisma.transaction.findUnique({
    where: { id },
    include: { product: true, user: { select: safeUser } },
  });
  if (!trx) throw new HttpError(404, 'Transaction not found');
  res.json({ data: trx });
});

module.exports = { createTransaction, getTransactions, getTransactionById };
