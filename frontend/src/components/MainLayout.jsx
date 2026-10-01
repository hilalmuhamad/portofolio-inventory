import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

const menus = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/kategori', label: 'Kategori' },
  { to: '/produk', label: 'Produk' },
  { to: '/transaksi', label: 'Transaksi' },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 bg-slate-900 p-4 text-slate-200">
        <p className="mb-6 px-2 text-sm font-bold uppercase tracking-wide">
          Inventory
        </p>
        <nav className="flex flex-col gap-1">
          {menus.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Halo, <span className="font-semibold text-slate-800">{user?.name}</span>
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-slate-200 px-3 py-1">{user?.role}</span>
            <button
              onClick={handleLogout}
              className="rounded bg-slate-900 px-3 py-1.5 text-white"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
