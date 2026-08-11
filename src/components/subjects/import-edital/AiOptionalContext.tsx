import { ChevronDown } from 'lucide-react';

type AiOptionalContextProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banca: string;
  organ: string;
  cargo: string;
  onBancaChange: (value: string) => void;
  onOrganChange: (value: string) => void;
  onCargoChange: (value: string) => void;
};

export function AiOptionalContext(props: AiOptionalContextProps) {
  const { open, onOpenChange, banca, organ, cargo, onBancaChange, onOrganChange, onCargoChange } = props;
  return (
    <section className="rounded-2xl border border-border/70 bg-card dark:border-white/10 dark:bg-zinc-900/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">Já sabe a banca ou o cargo?</span>
          <span className="block text-xs text-content-muted">Adicione detalhes opcionais para melhorar a primeira leitura.</span>
        </span>
        <ChevronDown size={17} className={`shrink-0 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-border/70 px-4 pb-4 pt-4 dark:border-white/10 sm:grid-cols-12">
          <label className="space-y-1.5 sm:col-span-3">
            <span className="text-xs font-semibold text-content-muted">Banca</span>
            <input value={banca} onChange={(event) => onBancaChange(event.target.value)} placeholder="Ex.: IDCAP" className="h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm text-content-main outline-none focus:border-primary/60 dark:border-white/10" />
          </label>
          <label className="space-y-1.5 sm:col-span-4">
            <span className="text-xs font-semibold text-content-muted">Órgão ou concurso</span>
            <input value={organ} onChange={(event) => onOrganChange(event.target.value)} placeholder="Ex.: Prefeitura de Vitória" className="h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm text-content-main outline-none focus:border-primary/60 dark:border-white/10" />
          </label>
          <label className="space-y-1.5 sm:col-span-5">
            <span className="text-xs font-semibold text-content-muted">Cargo, área ou ênfase</span>
            <input value={cargo} onChange={(event) => onCargoChange(event.target.value)} placeholder="Ex.: Assistente Social" className="h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm text-content-main outline-none focus:border-primary/60 dark:border-white/10" />
          </label>
        </div>
      )}
    </section>
  );
}
