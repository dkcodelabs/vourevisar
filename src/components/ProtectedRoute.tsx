import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading logo ONLY if we are actually waiting for the initial auth state without a user object
  if (loading && !user) {
    return <LoadingSpinner size="large" showText fullPage />;
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
