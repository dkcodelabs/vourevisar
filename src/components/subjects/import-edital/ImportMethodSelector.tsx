import { BookOpen, Database, Sparkles } from 'lucide-react';

export type ImportMethod = 'ready' | 'ia' | 'manual';

type ImportMethodSelectorProps = {
  value: ImportMethod;
  onChange: (method: ImportMethod) => void;
};

const methods: Array<{ value: ImportMethod; label: string; icon: typeof Database }> = [
  { value: 'ready', label: 'Catálogo', icon: Database },
  { value: 'ia', label: 'PDF com IA', icon: Sparkles },
  { value: 'manual', label: 'Manual', icon: BookOpen },
];

export function ImportMethodSelector({ value, onChange }: ImportMethodSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-secondary/45 p-1 dark:border-white/10 dark:bg-white/[0.03]" role="tablist" aria-label="Forma de adicionar edital">
      {methods.map(({ value: method, label, icon: Icon }) => (
        <button
          key={method}
          type="button"
          role="tab"
          aria-selected={value === method}
          onClick={() => onChange(method)}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
            value === method
              ? 'bg-card text-foreground shadow-sm dark:bg-white/10'
              : 'text-content-muted hover:bg-card/60 hover:text-foreground dark:hover:bg-white/[0.06]'
          }`}
        >
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
