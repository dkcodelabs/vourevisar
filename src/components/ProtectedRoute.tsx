import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading logo while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background transition-colors duration-300">
        <LoadingSpinner size="large" showText={true} className="scale-125 sm:scale-150" />
      </div>
    );
  }

  // If no user authenticated, redirect to login preserving the intended path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated, render protected content
  // If accessing root path while authenticated, redirect to dashboard
  if (location.pathname === '/' && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
