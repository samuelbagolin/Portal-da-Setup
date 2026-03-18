import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ allowedRoles?: ('ADMIN' | 'CLIENTE')[] }> = ({ allowedRoles }) => {
  const { user, profile, loading, isAdmin } = useAuth();

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
    const userRole = isAdmin ? 'ADMIN' : profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
