const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { validateCategory } = require('../utils/validate');

const createCategory = asyncHandler(async (req, res) => {
  const data = validateCategory(req.body);
  const category = await prisma.category.create({ data });
  res.status(201).json({ message: 'Category created', data: category });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ data: categories });
});

const getCategoryById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid category id');

  const category = await prisma.category.findUnique({
    where: { id },
    include: { products: true },
  });
  if (!category) throw new HttpError(404, 'Category not found');

  res.json({ data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid category id');

  const data = validateCategory(req.body, { partial: true });
  const category = await prisma.category.update({ where: { id }, data });
  res.json({ message: 'Category updated', data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid category id');

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new HttpError(409, 'Category still has products; move or delete them first');
  }

  await prisma.category.delete({ where: { id } });
  res.json({ message: 'Category deleted' });
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
