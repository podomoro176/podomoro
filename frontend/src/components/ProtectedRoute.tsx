import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from './Spinner';
import type { Role } from '@/types';

interface Props { roles?: Role[] }

export default function ProtectedRoute({ roles }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Spinner size={40} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-4">
        <p className="text-4xl font-bold text-danger">403</p>
        <p className="text-gray-600">U heeft geen toegang tot deze pagina.</p>
      </div>
    );
  }

  return <Outlet />;
}
