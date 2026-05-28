import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUserAccess } from '@/hooks/useUserAccess';

interface RequireActiveSubscriptionProps {
  children: React.ReactNode;
}

export function RequireActiveSubscription({ children }: RequireActiveSubscriptionProps) {
  const location = useLocation();
  const { loading, hasFullAccess } = useUserAccess();

  if (loading) {
    return <LoadingSpinner size="large" message="Verificando seu acesso..." fullPage />;
  }

  if (!hasFullAccess) {
    return <Navigate to="/planos" state={{ from: location, reason: 'subscription_required' }} replace />;
  }

  return <>{children}</>;
}
