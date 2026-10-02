import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CategoryPage from './pages/CategoryPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProductPage from './pages/ProductPage';
import ReportPage from './pages/ReportPage';
import TransactionPage from './pages/TransactionPage';
import UserPage from './pages/UserPage';

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
        <Route path="produk" element={<ProductPage />} />
        <Route path="transaksi" element={<TransactionPage />} />
        <Route path="laporan" element={<ReportPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute adminOnly>
              <UserPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
