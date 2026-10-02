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

  const trend = await prisma.$queryRaw`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(CASE WHEN t.type = 'masuk' THEN t.quantity END), 0)::int AS masuk,
           COALESCE(SUM(CASE WHEN t.type = 'keluar' THEN t.quantity END), 0)::int AS keluar
    FROM generate_series(
      (CURRENT_DATE - INTERVAL '13 days'),
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS d(day)
    LEFT JOIN "Transaction" t ON t.date::date = d.day::date
    GROUP BY d.day
    ORDER BY d.day
  `;

  const topProducts = await prisma.$queryRaw`
    SELECT p.id, p.sku, p.name,
           COALESCE(SUM(t.quantity) FILTER (WHERE t.type = 'keluar'), 0)::int AS terjual
    FROM "Product" p
    LEFT JOIN "Transaction" t ON t."productId" = p.id
    GROUP BY p.id, p.sku, p.name
    ORDER BY terjual DESC, p.name ASC
    LIMIT 5
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
      trend,
      topProducts,
      lowStock,
      recentTransactions: recent,
    },
  });
});

module.exports = { getDashboard };
