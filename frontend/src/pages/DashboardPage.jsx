import { useCallback, useEffect, useState } from 'react';

import api from '../api/api';
import { useAuth } from '../context/useAuth';

const rupiah = (value) => `Rp ${Number(value).toLocaleString('id-ID')}`;

const formatDate = (value) =>
  new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    const { data: res } = await api.get('/dashboard');
    return res.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDashboard]);

  if (loading) return <p className="text-sm text-slate-400">Memuat dashboard...</p>;

  if (error) {
    return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  const { totals, transactions, lowStock, recentTransactions } = data;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        Selamat datang kembali, {user?.name}.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Produk" value={totals.products} />
        <StatCard label="Total Kategori" value={totals.categories} />
        <StatCard label="Total Stok" value={totals.stock} />
        <StatCard
          label="Nilai Inventaris"
          value={rupiah(totals.inventoryValue)}
          accent="text-emerald-600"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Stok Menipis (≤ 5)</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400">Semua stok aman.</p>
          ) : (
            <ul className="divide-y text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{p.sku}</span>
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Transaksi Terbaru</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada transaksi.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium">{t.product?.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatDate(t.date)}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.type === 'masuk'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {t.type === 'masuk' ? '+' : '-'}
                    {t.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Total {transactions.total} transaksi tercatat ({transactions.masuk} masuk,{' '}
        {transactions.keluar} keluar).
      </p>
    </div>
  );
}
