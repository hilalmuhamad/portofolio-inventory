import { useCallback, useEffect, useState } from 'react';

import api from '../api/api';

export default function TransactionPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const [type, setType] = useState('masuk');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [printItems, setPrintItems] = useState(null);
  const [printedAt, setPrintedAt] = useState('');

  const fetchTransactions = useCallback(async () => {
    const { data } = await api.get('/transactions', {
      params: { page, limit: 10, type: typeFilter || undefined },
    });
    return data;
  }, [page, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions()
      .then((data) => {
        if (cancelled) return;
        setItems(data.data);
        setMeta(data.meta);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat transaksi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchTransactions]);

  const refreshTransactions = async () => {
    try {
      const data = await fetchTransactions();
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal memuat transaksi');
    }
  };

  const fetchProducts = useCallback(async () => {
    const { data } = await api.get('/products', { params: { limit: 100 } });
    return data.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  const loadProducts = async () => {
    try {
      setProducts(await fetchProducts());
    } catch {
      setProducts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSaving(true);
    try {
      const { data } = await api.post('/transactions', {
        type,
        quantity: Number(quantity),
        productId: Number(productId),
      });
      setQuantity('');
      setFormSuccess(
        `Transaksi tersimpan. Stok "${data.data.product.name}" kini ${data.data.product.stock}.`,
      );
      setPage(1);
      await Promise.all([refreshTransactions(), loadProducts()]);
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Gagal menyimpan transaksi');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) =>
    new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  const handlePrint = async () => {
    try {
      const { data } = await api.get('/transactions', {
        params: { limit: 1000, type: typeFilter || undefined },
      });
      setPrintItems(data.data);
      setPrintedAt(new Date().toLocaleString('id-ID'));
      setTimeout(() => window.print(), 100);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal menyiapkan cetakan');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">Transaksi</h1>
        <button
          onClick={handlePrint}
          className="rounded border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Cetak Laporan PDF
        </button>
      </div>
      <h1 className="mb-4 hidden text-xl font-bold print:block">Transaksi</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-xl bg-white p-5 shadow-sm print:hidden"
      >
        <h2 className="mb-4 font-semibold">Catat Barang Masuk / Keluar</h2>
        {formError && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
        )}
        {formSuccess && (
          <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {formSuccess}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenis</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="masuk">Barang Masuk</option>
              <option value="keluar">Barang Keluar</option>
            </select>
          </div>
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-sm font-medium">Produk</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Pilih produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (stok {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Jumlah</label>
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-28 rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

      <div className="mb-4 flex items-center justify-between print:hidden">
        <h2 className="font-semibold">Riwayat</h2>
        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
          className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="">Semua Jenis</option>
          <option value="masuk">Masuk</option>
          <option value="keluar">Keluar</option>
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm print:hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Produk</th>
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Jumlah</th>
              <th className="px-4 py-3 font-medium">Oleh</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Belum ada transaksi
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium">
                    {t.product?.name}
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      {t.product?.sku}
                    </span>
                  </td>
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
                  <td className="px-4 py-3 text-slate-500">{t.user?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 print:hidden">
        <span>
          Total {meta.total} transaksi · halaman {meta.page}/{meta.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            disabled={page >= (meta.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {printItems && (
        <div className="hidden print:block">
          <h1 className="mb-1 text-lg font-bold">Laporan Riwayat Transaksi</h1>
          <p className="mb-4 text-sm text-gray-600">
            Dicetak {printedAt}
            {typeFilter ? ` · Filter: ${typeFilter}` : ' · Semua jenis'} · Total{' '}
            {printItems.length} baris
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 pr-4 font-semibold">Tanggal</th>
                <th className="py-2 pr-4 font-semibold">SKU</th>
                <th className="py-2 pr-4 font-semibold">Produk</th>
                <th className="py-2 pr-4 font-semibold">Jenis</th>
                <th className="py-2 pr-4 font-semibold">Jumlah</th>
                <th className="py-2 font-semibold">Kasir</th>
              </tr>
            </thead>
            <tbody>
              {printItems.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 pr-4">{formatDate(t.date)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{t.product?.sku}</td>
                  <td className="py-2 pr-4">{t.product?.name}</td>
                  <td className="py-2 pr-4">{t.type === 'masuk' ? 'Masuk' : 'Keluar'}</td>
                  <td className="py-2 pr-4">{t.quantity}</td>
                  <td className="py-2">{t.user?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
