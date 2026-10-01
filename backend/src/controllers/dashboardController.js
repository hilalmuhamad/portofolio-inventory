const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');

const LOW_STOCK_THRESHOLD = 5;

const getDashboard = asyncHandler(async (req, res) => {
  const [productCount, categoryCount, userCount, stockAgg, byType, lowStock, recent] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.product.aggregate({ _sum: { stock: true } }),
      prisma.transaction.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        include: { category: true },
        orderBy: { stock: 'asc' },
        take: 5,
      }),
      prisma.transaction.findMany({
        include: { product: true, user: { select: { id: true, name: true, role: true } } },
        orderBy: { id: 'desc' },
        take: 5,
      }),
    ]);

  const valueRows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(price * stock), 0)::int AS value FROM "Product"
  `;

  const counts = Object.fromEntries(byType.map((t) => [t.type, t._count._all]));

  res.json({
    data: {
      totals: {
        products: productCount,
        categories: categoryCount,
        users: userCount,
        stock: stockAgg._sum.stock ?? 0,
        inventoryValue: Number(valueRows[0]?.value ?? 0),
      },
      transactions: {
        masuk: counts.masuk ?? 0,
        keluar: counts.keluar ?? 0,
        total: (counts.masuk ?? 0) + (counts.keluar ?? 0),
      },
      lowStock,
      recentTransactions: recent,
    },
  });
});

module.exports = { getDashboard };
