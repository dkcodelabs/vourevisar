import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PageLoadingStateProps {
  className?: string;
  label?: string;
  rows?: number;
}

/**
 * Preserves the page frame while its own data resolves. Route/access gates own
 * the only blocking loader; pages use this non-blocking placeholder instead.
 */
export function PageLoadingState({
  className,
  label = 'Carregando conteúdo',
  rows = 4,
}: PageLoadingStateProps) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      className={cn('w-full space-y-5 py-2', className)}
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex min-h-20 items-center justify-between gap-5 rounded-xl border border-border/70 bg-card/60 px-4 py-4 sm:px-5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4/5 max-w-md" />
              <Skeleton className="h-3 w-2/5 max-w-xs" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
