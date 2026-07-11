import { AlertCircle, RefreshCw } from 'lucide-react';

type StudyCycleLoadErrorProps = {
  loadError: string;
  onRetry: () => void;
};

export function StudyCycleLoadError({
  loadError,
  onRetry,
}: StudyCycleLoadErrorProps) {
  return (
    <div className="flex min-h-[520px] w-full items-center justify-center px-4 text-center" role="alert">
      <div className="flex max-w-md flex-col items-center">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle size={26} />
        </div>
        <h2 className="text-xl font-bold text-title-section">{loadError}</h2>
        <p className="mt-2 text-sm leading-relaxed text-content-muted">
          Seus dados continuam salvos. Verifique sua conexão e tente carregar novamente.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="app-primary-button mt-6 gap-2 px-5 py-2.5"
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
