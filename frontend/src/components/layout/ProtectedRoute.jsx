import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-primary text-white">Loading...</div>; // Could replace with a spinner later
    }

    if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
