import { CheckCircle2, FileText, Plus, Trash2 } from 'lucide-react';

type AiContentSourceRecoveryProps = {
  message: string;
  files: File[];
  originalFileCount: number;
  selectedCargoName: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function AiContentSourceRecovery({
  message,
  files,
  originalFileCount,
  selectedCargoName,
  onAdd,
  onRemove,
}: AiContentSourceRecoveryProps) {
  const addedFiles = files.slice(originalFileCount);

  return (
    <section className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4" aria-labelledby="missing-content-title">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <FileText size={17} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="missing-content-title" className="text-sm font-bold text-amber-700 dark:text-amber-300">
            O conteúdo está em outro arquivo
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/85 dark:text-amber-100/80">
            {message}
          </p>
        </div>
      </div>

      {addedFiles.length > 0 ? (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          {addedFiles.map((file, addedIndex) => {
            const fileIndex = originalFileCount + addedIndex;
            return (
              <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">Anexo adicionado</p>
                  <p className="truncate text-[11px] text-content-muted" title={file.name}>{file.name}</p>
                  {selectedCargoName ? <p className="mt-0.5 truncate text-[10px] text-content-muted">Será usado para {selectedCargoName}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(fileIndex)}
                  aria-label={`Remover ${file.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:text-amber-100 sm:w-auto"
        >
          <Plus size={15} aria-hidden="true" />
          Adicionar o anexo indicado
        </button>
      )}
    </section>
  );
}
