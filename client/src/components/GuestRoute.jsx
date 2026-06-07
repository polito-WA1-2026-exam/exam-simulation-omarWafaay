import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

/** Login page — skip if already authenticated. */
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="page-message">Loading session…</p>;
  }
  if (user) {
    return <Navigate to="/game" replace />;
  }
  return children;
}
