import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumStateCardProps {
  icon: LucideIcon;
  label?: string;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  helperText?: string;
  technicalDetail?: string;
  className?: string;
}

export const PremiumStateCard = ({
  icon: Icon,
  label,
  title,
  description,
  imageSrc = '/images/offline-study-state.png',
  imageAlt = 'Mesa de estudos com notebook indicando conexão indisponível',
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  helperText,
  technicalDetail,
  className
}: PremiumStateCardProps) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setImageStatus('loading');
  }, [imageSrc]);

  return (
    <div
      className={cn(
        'w-full max-w-5xl overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-2xl shadow-black/40',
        className
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr]">
        <div className="relative min-h-[220px] overflow-hidden bg-primary/5 md:min-h-[340px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,hsl(var(--primary)/0.22),transparent_42%),radial-gradient(circle_at_80%_75%,rgba(251,191,36,0.14),transparent_36%)]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),transparent_45%),radial-gradient(circle_at_42%_38%,hsl(var(--primary)/0.22),transparent_26%)]"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-2xl shadow-primary/20">
              <Icon size={48} strokeWidth={1.5} />
            </div>
          </div>
          {imageStatus !== 'error' && (
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="eager"
              decoding="async"
              onLoad={() => setImageStatus('loaded')}
              onError={() => setImageStatus('error')}
              className={cn(
                'relative h-full w-full object-cover transition-opacity duration-300',
                imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-card" />
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Icon size={22} />
          </div>

          {label && (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {label}
            </p>
          )}

          <h2 className="font-['Manrope'] text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-content-muted">
            {description}
          </p>

          {(actionLabel || helperText) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {actionLabel && onAction && (
                <Button
                  onClick={onAction}
                  className="h-11 rounded-xl px-5 font-bold text-primary-foreground shadow-lg shadow-primary/20"
                >
                  {ActionIcon && <ActionIcon size={16} />}
                  {actionLabel}
                </Button>
              )}
              {helperText && (
                <span className="text-xs text-content-muted">
                  {helperText}
                </span>
              )}
            </div>
          )}

          {technicalDetail && (
            <div className="mt-6 rounded-2xl border border-border bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                Detalhe técnico
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-content-muted">
                {technicalDetail}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
