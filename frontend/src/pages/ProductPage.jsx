import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../api/api';
import { useAuth } from '../context/useAuth';

const emptyForm = { sku: '', name: '', price: '', stock: '', categoryId: '' };

export default function ProductPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const searchTimer = useRef(null);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(value.trim());
    }, 400);
  };

  const fetchProducts = useCallback(async () => {
    const { data } = await api.get('/products', {
      params: {
        page,
        limit: 10,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
      },
    });
    return data;
  }, [page, search, categoryFilter]);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (cancelled) return;
        setItems(data.data);
        setMeta(data.meta);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat produk');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  const refreshProducts = async () => {
    try {
      const data = await fetchProducts();
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal memuat produk');
    }
  };

  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => setCategories(data.data))
      .catch(() => setCategories([]));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: String(product.categoryId),
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      sku: form.sku,
      name: form.name,
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: Number(form.categoryId),
    };
    try {
      if (editingId) await api.put(`/products/${editingId}`, payload);
      else await api.post('/products', payload);
      setShowModal(false);
      refreshProducts();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else refreshProducts();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Gagal menghapus produk');
    }
  };

  const rupiah = (value) => `Rp ${value.toLocaleString('id-ID')}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Produk</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            + Tambah Produk
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama / SKU..."
          className="w-64 rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
          className="rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Harga</th>
              <th className="px-4 py-3 font-medium">Stok</th>
              {isAdmin && <th className="px-4 py-3 text-right font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  Belum ada produk
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category?.name}</td>
                  <td className="px-4 py-3">{rupiah(p.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Total {meta.total} produk · halaman {meta.page}/{meta.totalPages || 1}
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

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-4 font-bold">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            {formError && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}

            <label className="mb-1 block text-sm font-medium">SKU</label>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="cth: KB-001"
            />

            <label className="mb-1 block text-sm font-medium">Nama</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="cth: Kabel USB"
            />

            <label className="mb-1 block text-sm font-medium">Kategori</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="mb-6 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Harga</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="50000"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Stok</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded border px-3 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
