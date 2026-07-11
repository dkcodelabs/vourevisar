import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

import { toast, type PremiumToast, usePremiumToasts } from '@/lib/toast';

const toastMeta = {
  success: {
    icon: CheckCircle2,
    label: 'Sucesso',
    className: 'app-toast-success',
  },
  error: {
    icon: XCircle,
    label: 'Erro',
    className: 'app-toast-error',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenção',
    className: 'app-toast-warning',
  },
  info: {
    icon: Info,
    label: 'Informação',
    className: 'app-toast-info',
  },
  loading: {
    icon: Loader2,
    label: 'Processando',
    className: 'app-toast-loading',
  },
} as const;

function PremiumToastCard({ item, index }: { item: PremiumToast; index: number }) {
  const meta = toastMeta[item.kind];
  const Icon = item.isLoading ? Loader2 : meta.icon;
  const pauseDismiss = () => toast.pause(item.id);
  const resumeDismiss = () => toast.resume(item.id);

  return (
    <div
      className={`app-toast ${meta.className}`}
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      style={{ '--toast-index': index } as CSSProperties}
      onBlur={resumeDismiss}
      onFocus={pauseDismiss}
      onMouseEnter={pauseDismiss}
      onMouseLeave={resumeDismiss}
      onPointerCancel={resumeDismiss}
      onPointerDown={pauseDismiss}
      onPointerUp={resumeDismiss}
    >
      <div className="app-toast-glow" aria-hidden="true" />
      <div className="app-toast-icon" aria-hidden="true">
        <Icon className={item.isLoading ? 'animate-spin' : ''} size={18} strokeWidth={2.35} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="app-toast-label">{meta.label}</p>
        <div className="app-toast-message">
          {item.message}
        </div>
        {item.action ? (
          <button
            type="button"
            className="app-toast-action"
            onClick={() => {
              item.action?.onClick();
              toast.dismiss(item.id);
            }}
          >
            {item.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="app-toast-close"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Fechar notificação"
      >
        <X size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function PremiumToastViewport() {
  const items = usePremiumToasts();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="app-toast-viewport" aria-label="Notificações do sistema">
      {items.map((item, index) => (
        <PremiumToastCard key={item.id} item={item} index={index} />
      ))}
    </div>,
    document.body,
  );
}
