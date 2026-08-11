import { FilePlus2, FileText, Sparkles, Trash2, Type } from 'lucide-react';

export type AiSourceMode = 'pdf' | 'text';

type AiSourceStepProps = {
  mode: AiSourceMode;
  onModeChange: (mode: AiSourceMode) => void;
  files: File[];
  inputText: string;
  onTextChange: (value: string) => void;
  onSelectFiles: () => void;
  onRemoveFile: (index: number) => void;
  onAnalyze: () => void;
  disabled: boolean;
};

export function AiSourceStep({ mode, onModeChange, files, inputText, onTextChange, onSelectFiles, onRemoveFile, onAnalyze, disabled }: AiSourceStepProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 dark:border-white/10 dark:bg-zinc-900/40 sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">Envie o conteúdo do edital</h3>
        <p className="mt-1 text-sm leading-relaxed text-content-muted">Use o edital principal e, se o conteúdo estiver em outro arquivo, adicione também o anexo indicado nele.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fonte do edital">
        <button type="button" role="radio" aria-checked={mode === 'pdf'} onClick={() => onModeChange('pdf')} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${mode === 'pdf' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-content-muted dark:border-white/10'}`}>
          <span className="inline-flex items-center gap-2"><FileText size={16} /> Anexar PDF</span>
        </button>
        <button type="button" role="radio" aria-checked={mode === 'text'} onClick={() => onModeChange('text')} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${mode === 'text' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-content-muted dark:border-white/10'}`}>
          <span className="inline-flex items-center gap-2"><Type size={16} /> Colar texto</span>
        </button>
      </div>

      {mode === 'pdf' ? (
        <div className="space-y-3">
          <button type="button" onClick={onSelectFiles} className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 text-center transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            <FilePlus2 size={22} className="mb-2 text-primary" />
            <span className="text-sm font-semibold text-foreground">{files.length ? 'Adicionar edital ou anexo' : 'Selecionar PDF'}</span>
            <span className="mt-1 text-xs text-content-muted">Até 5 MB por arquivo · máximo de 4 documentos</span>
          </button>
          {files.length > 0 && (
            <div className="space-y-2" aria-label="Documentos selecionados">
              {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-secondary/35 px-3 dark:border-white/10">
                  <FileText size={15} className="shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-content-main">{file.name}</p>
                    <p className="text-[11px] text-content-muted">{index === 0 ? 'Edital principal' : `Anexo ${index}`}</p>
                  </div>
                  <button type="button" onClick={() => onRemoveFile(index)} aria-label={`Remover ${file.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-content-muted">Texto do conteúdo programático</span>
          <textarea value={inputText} onChange={(event) => onTextChange(event.target.value)} placeholder="Cole aqui o texto do edital ou do conteúdo programático." className="min-h-48 w-full resize-y rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-relaxed text-content-main outline-none focus:border-primary/60 dark:border-white/10" />
        </label>
      )}

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onAnalyze} disabled={disabled} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">
          <Sparkles size={16} /> Analisar edital
        </button>
      </div>
    </section>
  );
}
