import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
