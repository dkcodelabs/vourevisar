import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUserAccess } from '@/hooks/useUserAccess';

interface RequireActiveSubscriptionProps {
  children: React.ReactNode;
}

export function RequireActiveSubscription({ children }: RequireActiveSubscriptionProps) {
  const location = useLocation();
  const { loading, error, hasFullAccess, refetch, blockedReason } = useUserAccess();
  const [isRetrying, setIsRetrying] = React.useState(false);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-2xl"
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            Não foi possível confirmar seu acesso
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sua assinatura não foi alterada. Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={isRetrying}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={isRetrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            {isRetrying ? 'Verificando...' : 'Tentar novamente'}
          </button>
        </div>
      </div>
    );
  }

  if (!hasFullAccess) {
    return <Navigate to="/planos" state={{ from: location, reason: blockedReason }} replace />;
  }

  return <>{children}</>;
}
