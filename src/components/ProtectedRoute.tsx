import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ allowedRoles?: ('ADMIN' | 'CLIENTE' | 'GESTOR')[] }> = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = profile?.role;
    // Special case for the master admin email
    const isMasterAdmin = user?.email === 'samuel.bagolin@setuptecnologia.com.br';
    
    if (!userRole && !isMasterAdmin) {
      return <Navigate to="/" replace />;
    }

    const effectiveRole = isMasterAdmin ? 'ADMIN' : userRole;
    
    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
