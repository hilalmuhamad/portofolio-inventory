import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
