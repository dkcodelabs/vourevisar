import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUserAccess } from '@/hooks/useUserAccess';

interface RequireActiveSubscriptionProps {
  children: React.ReactNode;
}

export function RequireActiveSubscription({ children }: RequireActiveSubscriptionProps) {
  const location = useLocation();
  const { loading, error, hasFullAccess, refetch } = useUserAccess();

  React.useEffect(() => {
    if (!error) return;

    const retryAccessCheck = () => {
      void refetch();
    };

    const retryTimer = window.setTimeout(retryAccessCheck, 2500);
    window.addEventListener('online', retryAccessCheck);
    window.addEventListener('focus', retryAccessCheck);

    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener('online', retryAccessCheck);
      window.removeEventListener('focus', retryAccessCheck);
    };
  }, [error, refetch]);

  if (loading) {
    return <LoadingSpinner size="large" message="Verificando seu acesso..." fullPage />;
  }

  if (error) {
    return <LoadingSpinner size="large" message="Reconectando e confirmando seu acesso..." fullPage />;
  }

  if (!hasFullAccess) {
    return <Navigate to="/planos" state={{ from: location, reason: 'subscription_required' }} replace />;
  }

  return <>{children}</>;
}
