import { useEffect, useState } from 'react';

import api from '../api/api';

const formatDate = (value) =>
  new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStartISO = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export default function ReportPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [start, setStart] = useState(monthStartISO());
  const [end, setEnd] = useState(todayISO());
  const [type, setType] = useState('');

  const buildParams = () => ({
    start: start || undefined,
    end: end || undefined,
    type: type || undefined,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get('/reports/transactions', {
          params: { start: start || undefined, end: end || undefined, type: type || undefined },
        });
        if (cancelled) return;
        setItems(data.data);
        setSummary(data.summary);
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat laporan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [start, end, type]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/transactions/export', {
        params: buildParams(),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-transaksi_${start}_${end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Gagal mengunduh CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Laporan Transaksi</h1>
        <button
          onClick={handleExport}
          disabled={exporting || items.length === 0}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {exporting ? 'Mengunduh...' : 'Export CSV'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium">Dari Tanggal</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Sampai Tanggal</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Jenis</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Semua</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Total Transaksi</p>
            <p className="mt-1 text-xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Total Masuk</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {summary.masuk.count}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {summary.masuk.quantity} unit
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Total Keluar</p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {summary.keluar.count}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {summary.keluar.quantity} unit
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Produk</th>
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Jumlah</th>
              <th className="px-4 py-3 font-medium">Kasir</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Tidak ada transaksi pada rentang ini
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.product?.sku}</td>
                  <td className="px-4 py-3 font-medium">{t.product?.name}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">{t.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{t.user?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
