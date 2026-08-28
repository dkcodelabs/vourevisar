import { useState } from 'react';
import { Info, Loader2, Plus } from 'lucide-react';

export type ManualEditalFormData = {
  origin: string;
  position: string;
  year: string;
  examDate: string;
  examBoard: string;
};

type ManualEditalFormProps = {
  initialData?: Partial<ManualEditalFormData>;
  onSubmit: (data: ManualEditalFormData) => Promise<void> | void;
  isLoading?: boolean;
};

export function ManualEditalForm({
  initialData,
  onSubmit,
  isLoading = false,
}: ManualEditalFormProps) {
  const [origin, setOrigin] = useState(initialData?.origin || '');
  const [position, setPosition] = useState(initialData?.position || '');
  const [year, setYear] = useState(initialData?.year || new Date().getFullYear().toString());
  const [examDate, setExamDate] = useState(initialData?.examDate || '');
  const [examBoard, setExamBoard] = useState(initialData?.examBoard || '');

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isOriginValid = origin.trim().length > 0;
  const isPositionValid = position.trim().length > 0;
  const isYearValid = /^\d{4}$/.test(year.trim()) && Number(year) >= 1990 && Number(year) <= 2100;

  const isFormValid = isOriginValid && isPositionValid && isYearValid;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ origin: true, position: true, year: true });
    if (!isFormValid || isLoading) return;

    onSubmit({
      origin: origin.trim(),
      position: position.trim(),
      year: year.trim(),
      examDate: examDate.trim(),
      examBoard: examBoard.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card p-5 dark:border-white/10 dark:bg-zinc-900/40 sm:p-6">
        <div className="mb-6">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Criar edital manualmente
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-content-muted sm:text-sm">
            Preencha os dados básicos do concurso. Matérias e tópicos serão adicionados na próxima tela.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Órgão / Concurso */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="manual-origin" className="text-xs font-bold text-foreground">
                Órgão ou Concurso <span className="text-red-500">*</span>
              </label>
              <input
                id="manual-origin"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onBlur={() => handleBlur('origin')}
                placeholder="Ex: Polícia Federal, INSS, TJ-SP"
                className={`h-11 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:ring-2 focus:ring-primary/40 ${
                  touched.origin && !isOriginValid
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-border focus:border-primary dark:border-white/10'
                }`}
                disabled={isLoading}
              />
              {touched.origin && !isOriginValid && (
                <p className="text-[11px] font-semibold text-red-500">
                  Informe o órgão ou instituição do concurso.
                </p>
              )}
            </div>

            {/* Cargo / Função */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="manual-position" className="text-xs font-bold text-foreground">
                Cargo, Função ou Área <span className="text-red-500">*</span>
              </label>
              <input
                id="manual-position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                onBlur={() => handleBlur('position')}
                placeholder="Ex: Agente Administrativo, Analista Judiciário"
                className={`h-11 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:ring-2 focus:ring-primary/40 ${
                  touched.position && !isPositionValid
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-border focus:border-primary dark:border-white/10'
                }`}
                disabled={isLoading}
              />
              {touched.position && !isPositionValid && (
                <p className="text-[11px] font-semibold text-red-500">
                  Informe o cargo ou área pretendida.
                </p>
              )}
            </div>

            {/* Ano do Edital */}
            <div className="space-y-1.5">
              <label htmlFor="manual-year" className="text-xs font-bold text-foreground">
                Ano do Edital <span className="text-red-500">*</span>
              </label>
              <input
                id="manual-year"
                type="text"
                maxLength={4}
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                onBlur={() => handleBlur('year')}
                placeholder="Ex: 2026"
                className={`h-11 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:ring-2 focus:ring-primary/40 ${
                  touched.year && !isYearValid
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-border focus:border-primary dark:border-white/10'
                }`}
                disabled={isLoading}
              />
              {touched.year && !isYearValid && (
                <p className="text-[11px] font-semibold text-red-500">
                  Informe um ano válido (4 dígitos).
                </p>
              )}
            </div>

            {/* Banca examinadora */}
            <div className="space-y-1.5">
              <label htmlFor="manual-board" className="text-xs font-bold text-foreground">
                Banca examinadora <span className="text-xs font-normal text-content-muted">(opcional)</span>
              </label>
              <input
                id="manual-board"
                type="text"
                value={examBoard}
                onChange={(e) => setExamBoard(e.target.value)}
                placeholder="Ex: Cebraspe, FGV, FCC, Vunesp"
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-white/10"
                disabled={isLoading}
              />
            </div>

            {/* Data da Prova */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="manual-exam-date" className="text-xs font-bold text-foreground">
                Data da Prova <span className="text-xs font-normal text-content-muted">(opcional)</span>
              </label>
              <input
                id="manual-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-white/10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-content-muted">
            <Info size={16} className="shrink-0 text-primary" aria-hidden="true" />
            <p className="leading-relaxed">
              Após criar o edital, a tela para adicionar matérias, tópicos e pesos será aberta automaticamente.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  Criando edital...
                </>
              ) : (
                <>
                  <Plus size={17} aria-hidden="true" />
                  Criar edital e adicionar matérias
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
