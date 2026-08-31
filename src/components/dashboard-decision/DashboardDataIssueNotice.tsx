import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashboardDataIssueNoticeProps = {
  title: string;
  description: string;
  hasPreviousData?: boolean;
  onRetry?: () => Promise<void>;
};

export function DashboardDataIssueNotice({ title, description, hasPreviousData = false, onRetry }: DashboardDataIssueNoticeProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const retry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div role="status" className="flex min-w-0 flex-col gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-3 sm:flex-row sm:items-center">
      <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-content-muted">{description}</p>
        {hasPreviousData ? <p className="mt-1 text-[10px] text-content-muted">Os dados exibidos abaixo podem estar desatualizados.</p> : null}
      </div>
      <Button variant="outline" className="h-auto min-h-11 shrink-0 text-xs" disabled={!onRetry || isRetrying} onClick={() => void retry()}>
        <RefreshCw aria-hidden="true" className={isRetrying ? 'animate-spin motion-reduce:animate-none' : ''} />
        {isRetrying ? 'Tentando…' : 'Tentar novamente'}
      </Button>
    </div>
  );
}
