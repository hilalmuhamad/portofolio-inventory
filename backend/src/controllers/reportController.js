const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const safeUser = { id: true, name: true, email: true, role: true };

const buildWhere = (query) => {
  const { start, end, type, productId } = query;
  const where = {};

  if (type) {
    if (type !== 'masuk' && type !== 'keluar') {
      throw new HttpError(400, "type must be 'masuk' or 'keluar'");
    }
    where.type = type;
  }

  if (productId) {
    const id = Number(productId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid productId');
    where.productId = id;
  }

  if (start || end) {
    where.date = {};
    if (start) {
      const d = new Date(start);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid start date');
      where.date.gte = d;
    }
    if (end) {
      const d = new Date(end);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid end date');
      d.setHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  return where;
};

const getReport = asyncHandler(async (req, res) => {
  const where = buildWhere(req.query);

  const [rows, summary] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { product: true, user: { select: safeUser } },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
      _sum: { quantity: true },
    }),
  ]);

  const byType = Object.fromEntries(
    summary.map((s) => [s.type, { count: s._count._all, quantity: s._sum.quantity ?? 0 }]),
  );

  res.json({
    data: rows,
    summary: {
      total: rows.length,
      masuk: byType.masuk ?? { count: 0, quantity: 0 },
      keluar: byType.keluar ?? { count: 0, quantity: 0 },
    },
  });
});

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCsv = asyncHandler(async (req, res) => {
  const where = buildWhere(req.query);

  const rows = await prisma.transaction.findMany({
    where,
    include: { product: true, user: { select: safeUser } },
    orderBy: { date: 'desc' },
  });

  const header = ['ID', 'Tanggal', 'SKU', 'Produk', 'Jenis', 'Jumlah', 'Kasir'];
  const lines = rows.map((t) =>
    [
      t.id,
      t.date.toISOString(),
      t.product?.sku,
      t.product?.name,
      t.type,
      t.quantity,
      t.user?.name,
    ]
      .map(csvCell)
      .join(','),
  );

  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-transaksi.csv"');
  res.send(csv);
});

module.exports = { getReport, exportCsv };
