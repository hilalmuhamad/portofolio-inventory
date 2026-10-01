import { useCallback, useEffect, useState } from 'react';

import api from '../api/api';
import { useAuth } from '../context/useAuth';

const formatDate = (value) =>
  new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
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
        if (cancelled) return;
        setData(res);
        setError('');
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

  if (loading) return <p className="text-sm text-gray-400">Memuat dashboard...</p>;

  if (error) {
    return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  const { totals, transactions, recentTransactions } = data;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Dashboard</h1>
      <p className="mb-6 text-sm text-gray-500">
        Selamat datang kembali, {user?.name}.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Produk" value={totals.products} />
        <SummaryCard label="Total Kategori" value={totals.categories} />
        <SummaryCard
          label="Transaksi Masuk"
          value={transactions.masuk}
          accent="text-green-600"
        />
        <SummaryCard
          label="Transaksi Keluar"
          value={transactions.keluar}
          accent="text-red-600"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">5 Transaksi Terakhir</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Tanggal</th>
              <th className="px-5 py-3 font-medium">Produk</th>
              <th className="px-5 py-3 font-medium">Jenis</th>
              <th className="px-5 py-3 font-medium">Jumlah</th>
              <th className="px-5 py-3 font-medium">Kasir</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-gray-400">
                  Belum ada transaksi
                </td>
              </tr>
            ) : (
              recentTransactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-5 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-5 py-3 font-medium">{t.product?.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.type === 'masuk'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.type === 'masuk' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td className="px-5 py-3">{t.quantity}</td>
                  <td className="px-5 py-3 text-gray-500">{t.user?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
