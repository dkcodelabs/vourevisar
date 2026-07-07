import {
  BookOpen,
  CheckCircle2,
  FileText,
  Gauge,
  ListTodo,
  Target,
} from 'lucide-react';

type VerticalSummaryEdital = {
  exam_board?: string | null;
  exam_date?: string | null;
  name?: string | null;
  organ?: string | null;
  position?: string | null;
};

type VerticalSummaryMetrics = {
  completedTopics: number;
  dailyNewTopicsGoal: number;
  daysUntilExam: number | null;
  dueTodayReviews: number;
  estimatedDaysToFirstContact: number | null;
  overdueReviews: number;
  pace?: {
    recentFirstContact?: {
      state: 'ready' | 'insufficient_data';
      projectedDaysToFirstContact: number | null;
      topicsPerDay: number | null;
      windowDays: number;
    };
  };
  startedTopics: number;
  totalTopics: number;
  unstartedTopics: number;
};

type VerticalEditalSummaryProps = {
  edital: VerticalSummaryEdital | null;
  metrics: VerticalSummaryMetrics;
  onOpenReviews: () => void;
};

const formatVerticalDate = (value?: string | null) => {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function VerticalEditalSummary({
  edital,
  metrics,
  onOpenReviews,
}: VerticalEditalSummaryProps) {
  const examBoard = edital?.exam_board?.trim() || null;
  const position = edital?.position?.trim() || null;
  const editalName = edital
    ? (edital.organ?.trim() || edital.name?.trim() || 'Edital carregado')
    : 'Edital carregado';
  const examDate = formatVerticalDate(edital?.exam_date || null);
  const totalTopics = metrics.totalTopics;
  const startedTopics = metrics.startedTopics;
  const completedTopics = metrics.completedTopics;
  const unstartedTopics = metrics.unstartedTopics;
  const inProgressTopics = Math.max(startedTopics - completedTopics, 0);
  const coverage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;
  const reviewSummary = metrics.overdueReviews > 0
    ? `${metrics.overdueReviews} atrasada${metrics.overdueReviews === 1 ? '' : 's'}`
    : metrics.dueTodayReviews > 0
      ? `${metrics.dueTodayReviews} hoje`
      : 'em dia';
  const recentFirstContact = metrics.pace?.recentFirstContact;
  const paceText = metrics.daysUntilExam !== null && unstartedTopics > 0
    ? `${metrics.dailyNewTopicsGoal} tópico${metrics.dailyNewTopicsGoal === 1 ? '' : 's'}/dia para tocar tudo até a prova.`
    : recentFirstContact?.state === 'ready' && recentFirstContact.projectedDaysToFirstContact !== null && unstartedTopics > 0
      ? `No ritmo recente, o primeiro contato fecha em cerca de ${recentFirstContact.projectedDaysToFirstContact} dias.`
    : metrics.estimatedDaysToFirstContact !== null && unstartedTopics > 0
      ? `No ritmo atual, o primeiro contato fecha em cerca de ${metrics.estimatedDaysToFirstContact} dias.`
      : unstartedTopics === 0
        ? 'Todos os tópicos ativos já tiveram primeiro contato.'
        : 'Informe a data da prova para calcular o ritmo necessário.';
  const metaItems = [
    examBoard ? `Banca ${examBoard}` : null,
    position,
    examDate ? `Prova ${examDate}` : null,
  ].filter(Boolean);

  const summaryItems = [
    { label: 'Iniciados', value: `${startedTopics}/${totalTopics}`, icon: ListTodo },
    { label: 'Pendentes', value: unstartedTopics, icon: Target },
    { label: 'Em estudo', value: inProgressTopics, icon: BookOpen },
    { label: 'Concluídos', value: completedTopics, icon: CheckCircle2 },
  ];

  return (
    <section className="app-strategic-map-panel mb-3 overflow-hidden rounded-2xl px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <FileText size={14} />
            <h3 className="app-type-section-title text-primary">Mapa do edital</h3>
          </div>
          <p className="mt-1 line-clamp-1 app-type-card-title text-title-card">
            {editalName}
          </p>
          {metaItems.length > 0 && (
            <div className="app-type-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-content-muted">
              {metaItems.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
                  {index > 0 && <span className="h-1 w-1 rounded-full bg-content-muted/40" aria-hidden="true" />}
                  <span className="truncate">{item}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-3 lg:w-[18rem]">
          <div className="shrink-0">
            <span className="app-type-eyebrow block text-content-muted">Iniciado</span>
            <span className="text-lg font-bold leading-none text-title-card tabular-nums">{coverage}%</span>
          </div>
          <div className="app-progress-track h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
            <div
              className="app-progress-fill h-full rounded-full transition-all duration-500"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {summaryItems.map(({ label, value, icon: Icon }) => (
          <span
            key={label}
            className="app-map-chip app-type-meta inline-flex min-h-7 items-center gap-1.5 rounded-lg px-2 text-content-muted"
          >
            <Icon size={12} className="shrink-0 text-primary/75" />
            <span className="font-semibold text-title-card tabular-nums">{value}</span>
            <span>{label.toLowerCase()}</span>
          </span>
        ))}

        <span className="app-map-chip app-type-meta inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-lg px-2 text-content-muted">
          <Gauge size={12} className="shrink-0 text-info" />
          <span className="min-w-0 truncate">{paceText}</span>
        </span>

        <button
          type="button"
          onClick={onOpenReviews}
          className="app-map-chip app-type-meta inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-lg px-2 text-left text-content-muted transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          <BookOpen size={12} className="shrink-0" />
          <span className="min-w-0 truncate">Revisões: {reviewSummary}</span>
        </button>
      </div>
    </section>
  );
}
