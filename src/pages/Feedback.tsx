import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { FeedbackModal } from '@/components/student-hub/FeedbackModal';
import { Button } from '@/components/ui/button';
import { getSupportEmailUrl } from '@/config/support';
import { useUserFeedbacks, type FeedbackStatus, type UserFeedback } from '@/hooks/useUserFeedbacks';
import { useStudentHubBadge } from '@/hooks/useStudentHubBadge';
import { getFeedbackStatusLabel } from '@/services/feedbackService';

type Filter = 'todos' | 'em_aberto' | 'respondidos';

const statusStyles: Record<FeedbackStatus, { dot: string; surface: string; text: string }> = {
  nova: { dot: 'bg-amber-400', surface: 'bg-amber-500/10', text: 'text-amber-400' },
  planejada: { dot: 'bg-violet-400', surface: 'bg-violet-500/10', text: 'text-violet-400' },
  em_desenvolvimento: { dot: 'bg-blue-400', surface: 'bg-blue-500/10', text: 'text-blue-400' },
  concluida: { dot: 'bg-emerald-400', surface: 'bg-emerald-500/10', text: 'text-emerald-400' },
  nao_planejada: { dot: 'bg-slate-400', surface: 'bg-slate-500/10', text: 'text-content-muted' },
};

const typeLabels: Record<string, string> = {
  melhoria: 'Melhoria',
  nova_funcionalidade: 'Nova funcionalidade',
  problema: 'Problema',
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(value)).replace('.', '');

const isOpen = (feedback: UserFeedback) => feedback.status !== 'concluida' && feedback.status !== 'nao_planejada';

const FeedbackCard = ({ feedback }: { feedback: UserFeedback }) => {
  const status = statusStyles[feedback.status];

  return (
    <article className="group rounded-xl border border-border/70 bg-card px-4 py-3.5 transition-colors duration-200 hover:border-primary/35 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-muted">
          <span className="font-medium text-foreground">{typeLabels[feedback.type] ?? 'Solicitação'}</span>
          <span aria-hidden="true" className="text-content-muted/40">·</span>
          <span>{feedback.protocol_code}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${status.surface} ${status.text}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {getFeedbackStatusLabel(feedback.status)}
        </span>
      </div>

      <h3 className="mt-2.5 text-sm font-semibold text-foreground">{feedback.title}</h3>
      <p className="mt-1 text-sm leading-5 text-content-muted">{feedback.description}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs text-content-muted">
        <span>Enviada em {formatDate(feedback.created_at)}</span>
        {feedback.admin_reply ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
            <CheckCircle2 size={14} aria-hidden="true" />
            Resposta da equipe
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} aria-hidden="true" />
            Aguardando retorno
          </span>
        )}
      </div>

      {feedback.admin_reply && (
        <div className="mt-3 border-l-2 border-emerald-500/70 pl-3">
          <p className="text-xs font-semibold text-emerald-500">Resposta da equipe</p>
          <p className="mt-1 text-sm leading-5 text-content-muted">{feedback.admin_reply}</p>
        </div>
      )}
    </article>
  );
};

const Feedback = () => {
  const { feedbacks, isLoading, isSubmitting, error, submitFeedback, refetch } = useUserFeedbacks();
  const { markFeedbackAsRead } = useStudentHubBadge();
  const [filter, setFilter] = useState<Filter>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supportUrl = getSupportEmailUrl('Ajuda para usar o vouRevisar');

  const filteredFeedbacks = useMemo(() => feedbacks.filter((feedback) => {
    if (filter === 'em_aberto') return isOpen(feedback);
    if (filter === 'respondidos') return Boolean(feedback.admin_reply);
    return true;
  }), [feedbacks, filter]);

  const openCount = feedbacks.filter(isOpen).length;
  const repliedCount = feedbacks.filter((feedback) => Boolean(feedback.admin_reply)).length;

  useEffect(() => {
    if (isLoading) return;

    feedbacks
      .filter((feedback) => feedback.status !== 'nova' || Boolean(feedback.admin_reply))
      .forEach((feedback) => markFeedbackAsRead(feedback.id));
  }, [feedbacks, isLoading, markFeedbackAsRead]);

  const handleSubmit = async (type: string, title: string, description: string) => {
    const result = await submitFeedback({
      type: type as 'melhoria' | 'nova_funcionalidade' | 'problema',
      title,
      description,
    });

    if (result?.protocol_code) {
      setIsModalOpen(false);
      await refetch({ silent: true });
    }

    return result?.protocol_code ?? null;
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-8 sm:space-y-5">
      <section aria-labelledby="help-actions-title" className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="mb-3">
          <h1 id="help-actions-title" className="text-base font-semibold text-foreground">Ajuda e suporte</h1>
          <p className="mt-1 text-sm text-content-muted">Escolha como quer falar com a equipe.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={() => setIsModalOpen(true)} className="h-auto min-h-14 justify-start gap-3 rounded-lg px-4 py-3 text-left shadow-sm">
            <MessageSquarePlus size={18} aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">Nova solicitação</span>
              <span className="mt-0.5 block text-xs font-normal text-primary-foreground/75">Enviar uma ideia, dúvida ou problema</span>
            </span>
          </Button>
          <a href={supportUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-500 transition-colors hover:bg-emerald-500/10">
            <Mail size={18} aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">Falar no WhatsApp</span>
              <span className="mt-0.5 block text-xs text-content-muted">Atendimento direto para casos urgentes</span>
            </span>
            <ArrowUpRight size={15} className="ml-auto" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-base font-semibold text-foreground">Minhas solicitações</h2>
              <span className="text-xs text-content-muted">{feedbacks.length} no total</span>
            </div>
            <p className="mt-1 text-sm text-content-muted">Acompanhe status e respostas da equipe.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar solicitações">
            {([
              ['todos', 'Todas'],
              ['em_aberto', 'Em acompanhamento'],
              ['respondidos', 'Respondidas'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${filter === key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-content-muted hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {isLoading && [1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-secondary" />)}

          {!isLoading && error && (
            <div className="flex flex-col items-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
              <CircleHelp className="text-destructive" size={28} aria-hidden="true" />
              <p className="mt-3 font-semibold text-foreground">Não foi possível carregar suas solicitações.</p>
              <p className="mt-1 text-sm text-content-muted">Tente novamente em alguns instantes.</p>
              <Button type="button" variant="outline" onClick={() => refetch()} className="mt-5 gap-2">
                <RefreshCw size={15} aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && filteredFeedbacks.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} />)}

          {!isLoading && !error && filteredFeedbacks.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search size={19} aria-hidden="true" /></div>
              <p className="mt-3 font-semibold text-foreground">Nenhuma solicitação neste filtro</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-content-muted">Quando você enviar uma ideia ou pedir ajuda, ela aparecerá aqui.</p>
              <Button type="button" onClick={() => setIsModalOpen(true)} className="mt-5 gap-2">
                <MessageSquarePlus size={16} aria-hidden="true" />
                Enviar solicitação
              </Button>
            </div>
          )}
        </div>
      </section>

      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default Feedback;
