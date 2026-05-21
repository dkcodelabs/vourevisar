import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';

interface NetworkStatusOverlayProps {
  appError?: string | null;
}

export const NetworkStatusOverlay = ({ appError }: NetworkStatusOverlayProps) => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const shouldShowAppDataError = appError === 'Erro ao carregar dados';
  const shouldShow = !isOnline || shouldShowAppDataError;

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-background/78 px-4 py-6 backdrop-blur-md">
      <PremiumStateCard
        icon={WifiOff}
        label="Conexão interrompida"
        title="Seus estudos estão salvos. Só não consegui buscar os dados agora."
        description="Parece que a internet caiu ou ficou instável por alguns segundos. Confira sua conexão e tente novamente para recarregar o painel."
        actionLabel="Tentar novamente"
        actionIcon={RefreshCw}
        onAction={() => window.location.reload()}
        helperText="Quando a conexão voltar, você continua de onde parou."
        technicalDetail={appError ? (isOnline ? appError : 'Sem conexão com a internet') : undefined}
      />
    </div>
  );
};
