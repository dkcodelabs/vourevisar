import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Database,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export type ReadyEditalSubject = {
  id?: string;
  name: string;
  color?: string;
  priority?: number;
  topics?: { id?: string; name: string }[];
};

export type ReadyEdital = {
  id: string;
  name?: string;
  organ: string;
  position: string;
  year?: string;
  origin?: string;
  status?: string;
  exam_date?: string;
  exam_board?: string;
  category?: string;
  subjects?: ReadyEditalSubject[];
  published_at?: string;
  updated_at?: string | null;
};

type ReadyEditalCatalogProps = {
  editais: ReadyEdital[];
  userEditalSourceIds: Set<string>;
  loading?: boolean;
  onImportEdital: (edital: ReadyEdital) => Promise<void> | void;
  importingEditalId: string | null;
  onSwitchToIa: () => void;
  onSwitchToManual: () => void;
  onOpenSuggest?: () => void;
};

const CATEGORIES = [
  'Todos',
  'Carreiras Policiais',
  'Tribunais',
  'Bancárias',
  'Administrativo',
  'Educação',
] as const;

export function ReadyEditalCatalog({
  editais,
  userEditalSourceIds,
  loading = false,
  onImportEdital,
  importingEditalId,
  onSwitchToIa,
  onSwitchToManual,
  onOpenSuggest,
}: ReadyEditalCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [expandedEditalId, setExpandedEditalId] = useState<string | null>(null);
  const [expandedSubjectKeys, setExpandedSubjectKeys] = useState<Set<string>>(new Set());

  const filteredEditais = editais.filter((edital) => {
    const matchesCategory =
      selectedCategory === 'Todos' ||
      (edital.category && edital.category.toLowerCase() === selectedCategory.toLowerCase());

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const organ = (edital.organ || '').toLowerCase();
    const position = (edital.position || '').toLowerCase();
    const year = (edital.year || '').toLowerCase();
    const banca = (edital.exam_board || '').toLowerCase();

    return (
      organ.includes(query) ||
      position.includes(query) ||
      year.includes(query) ||
      banca.includes(query)
    );
  });

  const toggleEditalExpand = (id: string) => {
    setExpandedEditalId((prev) => (prev === id ? null : id));
  };

  const toggleSubjectExpand = (subjectKey: string) => {
    setExpandedSubjectKeys((prev) => {
      const next = new Set(prev);
      if (next.has(subjectKey)) {
        next.delete(subjectKey);
      } else {
        next.add(subjectKey);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca e Filtros */}
      <div className="space-y-3">
        <div className="relative w-full">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"
            size={18}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar por concurso, órgão, cargo ou banca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-content-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-white/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2 dark:border-white/5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-secondary/60 text-content-muted hover:bg-secondary hover:text-foreground dark:bg-zinc-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo: Loading, Lista ou Vazio */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="medium" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-content-muted">
            Carregando catálogo oficial...
          </p>
        </div>
      ) : filteredEditais.length > 0 ? (
        <div className="space-y-3">
          {filteredEditais.map((edital) => {
            const isAlreadyImported = userEditalSourceIds.has(edital.id);
            const isExpanded = expandedEditalId === edital.id;
            const totalTopics =
              edital.subjects?.reduce((acc, s) => acc + (s.topics?.length || 0), 0) || 0;
            const isImportingThis = importingEditalId === edital.id;
            const isImportingAny = importingEditalId !== null;

            return (
              <div
                key={edital.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isAlreadyImported
                    ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'border-border bg-card hover:border-primary/40 dark:border-white/10 dark:bg-zinc-900/40'
                }`}
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleEditalExpand(edital.id)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold uppercase tracking-tight text-foreground truncate">
                          {edital.organ}
                        </h4>
                        {isAlreadyImported && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            <CheckCircle2 size={11} /> Já importado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-content-muted">
                        <span>{edital.position}</span>
                        <span className="mx-1.5 opacity-40">•</span>
                        <span className="font-semibold text-foreground">{edital.year}</span>
                        {edital.exam_board && (
                          <>
                            <span className="mx-1.5 opacity-40">•</span>
                            <span>{edital.exam_board}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2.5 sm:justify-end">
                    {edital.subjects && edital.subjects.length > 0 ? (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-content-muted">
                        <span className="rounded-lg border border-border bg-secondary px-2 py-1 dark:border-white/5 dark:bg-zinc-800">
                          {edital.subjects.length} MATÉRIAS
                        </span>
                        <span className="rounded-lg border border-border bg-secondary px-2 py-1 dark:border-white/5 dark:bg-zinc-800">
                          {totalTopics} TÓPICOS
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400">
                        <AlertTriangle size={11} /> Sem matérias
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleEditalExpand(edital.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-content-muted transition-colors hover:text-foreground dark:border-white/10 dark:bg-zinc-800"
                      aria-label={isExpanded ? 'Recolher detalhes' : 'Ver matérias do edital'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <Eye size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => !isAlreadyImported && onImportEdital(edital)}
                      disabled={isImportingAny || isAlreadyImported}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
                        isAlreadyImported
                          ? 'cursor-default bg-emerald-500/15 text-emerald-400'
                          : 'bg-primary text-white shadow hover:bg-primary/90 disabled:opacity-50'
                      }`}
                    >
                      {isImportingThis ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Importando...
                        </>
                      ) : isAlreadyImported ? (
                        <>
                          <CheckCircle2 size={13} />
                          Importado
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Acordeão de Matérias e Tópicos */}
                <AnimatePresence initial={false}>
                  {isExpanded && edital.subjects && edital.subjects.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border bg-background/50 p-4 dark:border-white/5 dark:bg-zinc-950/30"
                    >
                      <div className="mb-3 flex items-center justify-between text-xs font-bold text-content-muted">
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={14} className="text-primary" />
                          <span>Conteúdo do edital homologado</span>
                        </div>
                        <span>
                          {edital.subjects.length} matérias · {totalTopics} tópicos
                        </span>
                      </div>

                      <div className="space-y-2">
                        {edital.subjects.map((subject, sIdx) => {
                          const subjectKey = `${edital.id}-${subject.name}-${sIdx}`;
                          const subjectExpanded = expandedSubjectKeys.has(subjectKey);
                          const topics = subject.topics || [];

                          return (
                            <div
                              key={subjectKey}
                              className="overflow-hidden rounded-xl border border-border bg-card dark:border-white/5 dark:bg-zinc-900/50"
                            >
                              <button
                                type="button"
                                onClick={() => toggleSubjectExpand(subjectKey)}
                                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-secondary/40"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                                    {sIdx + 1}
                                  </span>
                                  <span className="text-xs font-bold uppercase text-foreground truncate">
                                    {subject.name}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-[10px] text-content-muted">
                                  <span>{topics.length} tópicos</span>
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${
                                      subjectExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {subjectExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="border-t border-border/60 bg-background/70 px-4 py-2.5 dark:border-white/5"
                                  >
                                    {topics.length > 0 ? (
                                      <ul className="space-y-1 text-xs text-content-muted">
                                        {topics.map((t, tIdx) => (
                                          <li key={tIdx} className="flex items-start gap-2 py-0.5">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                            <span>{t.name}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-content-muted">
                                        Nenhum tópico detalhado nesta matéria.
                                      </p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado Vazio com Alternativas Inteligentes */
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-content-muted dark:bg-zinc-800">
            <Search size={24} />
          </div>

          <h3 className="text-sm font-bold text-foreground sm:text-base">
            {searchQuery.trim()
              ? `Nenhum resultado para "${searchQuery}"`
              : 'Nenhum edital disponível nesta categoria'}
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed text-content-muted sm:text-sm">
            Esse concurso ainda não está no catálogo oficial. Você pode importar com IA ou cadastrar manualmente:
          </p>

          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onSwitchToIa}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
            >
              <Sparkles size={14} />
              Importar com IA
            </button>
            <button
              type="button"
              onClick={onSwitchToManual}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary dark:border-white/10 dark:bg-zinc-800"
            >
              <Plus size={14} />
              Criar Manualmente
            </button>
          </div>

          {onOpenSuggest && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onOpenSuggest}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-muted transition-colors hover:text-foreground"
              >
                <MessageSquare size={13} />
                Sugerir inclusão deste concurso no catálogo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
