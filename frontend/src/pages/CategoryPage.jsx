import { useCallback, useEffect, useState } from 'react';

import api from '../api/api';
import { useAuth } from '../context/useAuth';

export default function CategoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/categories');
        if (cancelled) return;
        setItems(data.data);
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat kategori');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setItems(data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal memuat kategori');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/categories', {
        name,
        description: description || undefined,
      });
      setName('');
      setDescription('');
      setShowModal(false);
      refreshCategories();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Kategori</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            + Tambah Kategori
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Deskripsi</th>
              <th className="px-4 py-3 font-medium">Jml Produk</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Belum ada kategori
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3">{c.id}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.description ?? '-'}</td>
                  <td className="px-4 py-3">{c._count?.products ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-4 font-bold">Tambah Kategori</h2>
            {formError && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}
            <label className="mb-1 block text-sm font-medium">Nama</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="cth: Elektronik"
            />
            <label className="mb-1 block text-sm font-medium">
              Deskripsi <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-6 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="cth: Kabel & adaptor"
            />
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
