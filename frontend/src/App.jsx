import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CategoryPage from './pages/CategoryPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="kategori" element={<CategoryPage />} />
        <Route path="produk" element={<PlaceholderPage title="Produk" />} />
        <Route path="transaksi" element={<PlaceholderPage title="Transaksi" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
