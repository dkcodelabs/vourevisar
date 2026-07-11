import type { RefObject } from 'react';
import { Search, X } from 'lucide-react';

type CycleSearchControlProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onActivate: () => void;
  onChange: (query: string) => void;
  onClear: () => void;
  query: string;
};

export function CycleSearchControl({
  inputRef,
  onActivate,
  onChange,
  onClear,
  query,
}: CycleSearchControlProps) {
  return (
    <div
      className="relative h-7 min-w-0 flex-1 transition-[width] duration-200 sm:max-w-[15rem] sm:flex-none sm:focus-within:w-[220px]"
      onClick={onActivate}
    >
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-content-muted" size={11} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar"
        value={query}
        onFocus={onActivate}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClear();
        }}
        className="app-field app-type-control h-7 w-full py-0.5 pl-6 pr-6 backdrop-blur placeholder:text-content-muted/45"
        aria-label="Buscar na fila do ciclo"
      />
      {query.trim() && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="absolute right-1 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded text-content-muted transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
