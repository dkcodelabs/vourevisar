import { Skeleton } from '@/components/ui/skeleton';

export function EvolutionLoadingState() {
  return (
    <div className="space-y-4 px-4 py-4 md:px-6" aria-label="Carregando evolução">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
