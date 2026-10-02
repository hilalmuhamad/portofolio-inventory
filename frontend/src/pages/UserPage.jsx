import { useCallback, useEffect, useState } from 'react';

import api from '../api/api';
import { useAuth } from '../context/useAuth';

const emptyForm = { name: '', email: '', password: '', role: 'staff' };

export default function UserPage() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    const { data } = await api.get('/users');
    return data.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message ?? 'Gagal memuat user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  const refreshUsers = async () => {
    try {
      setItems(await fetchUsers());
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal memuat user');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, { name: form.name, role: form.role });
      } else {
        await api.post('/users', form);
      }
      setShowModal(false);
      refreshUsers();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Gagal menyimpan user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.put(`/users/${resetTarget.id}/password`, { password: newPassword });
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Gagal reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Hapus user "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      refreshUsers();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Gagal menghapus user');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Manajemen User</h1>
        <button
          onClick={openCreate}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + Tambah User
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Memuat...
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-gray-400">(Anda)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-slate-800 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setResetTarget(u);
                        setNewPassword('');
                        setFormError('');
                      }}
                      className="mr-2 text-amber-600 hover:underline"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                      className="text-red-600 hover:underline disabled:opacity-30"
                    >
                      Hapus
                    </button>
                  </td>
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
            <h2 className="mb-4 font-bold">{editingId ? 'Edit User' : 'Tambah User'}</h2>
            {formError && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}

            <label className="mb-1 block text-sm font-medium">Nama</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              required
              type="email"
              disabled={Boolean(editingId)}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-gray-100"
            />

            {!editingId && (
              <>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mb-4 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </>
            )}

            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mb-6 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>

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

      {resetTarget && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-1 font-bold">Reset Password</h2>
            <p className="mb-4 text-sm text-gray-500">
              User: <span className="font-medium">{resetTarget.name}</span>
            </p>
            {formError && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}
            <label className="mb-1 block text-sm font-medium">Password Baru</label>
            <input
              required
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-6 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="flex-1 rounded border px-3 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Reset'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
