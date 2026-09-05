import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { isEmailConfirmationPending } from '@/utils/authConfirmation';

export const ProtectedRoute = () => {
  const { user, authInitialized } = useAuth();
  const location = useLocation();

  // Never send a browser with a persisted session to Login before Supabase has
  // resolved INITIAL_SESSION. This matters after returning from Stripe and on
  // direct checkout navigation, where the page can mount before auth storage
  // has finished hydrating.
  if (!authInitialized) {
    return <LoadingSpinner size="large" fullPage />;
  }

  // If no user authenticated, redirect to login preserving the intended path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isEmailConfirmationPending(user)) {
    return <Navigate to="/confirm-email" replace />;
  }

  // If user is authenticated, render protected content
  // If accessing root path while authenticated, redirect to dashboard
  if (location.pathname === '/' && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
