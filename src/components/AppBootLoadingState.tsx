import { PageLoadingState } from '@/components/ui/PageLoadingState';

interface AppBootLoadingStateProps {
  label?: string;
}

/**
 * Keeps the viewport visually stable while the persisted Supabase session is
 * being restored. It deliberately has no logo or spinner: this is application
 * boot, not an action the student initiated.
 */
export function AppBootLoadingState({ label = 'Preparando seu espaço de estudo' }: AppBootLoadingStateProps) {
  return (
    <div className="min-h-dvh bg-background px-3 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-[1680px] pt-16 sm:pt-20">
        <PageLoadingState label={label} rows={5} />
      </div>
    </div>
  );
}
