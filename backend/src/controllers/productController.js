const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { validateProduct } = require('../utils/validate');

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
  return id;
};

const createProduct = asyncHandler(async (req, res) => {
  const data = validateProduct(req.body);
  const product = await prisma.product.create({
    data,
    include: { category: true },
  });
  res.status(201).json({ message: 'Product created', data: product });
});

const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { categoryId, search } = req.query;

  const where = {};
  if (categoryId) where.categoryId = parseId(categoryId);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = validateProduct(req.body, { partial: true });
  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  });
  res.json({ message: 'Product updated', data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  const transactionCount = await prisma.transaction.count({ where: { productId: id } });
  if (transactionCount > 0) {
    throw new HttpError(409, 'Product has transaction history and cannot be deleted');
  }

  await prisma.product.delete({ where: { id } });
  res.json({ message: 'Product deleted' });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
