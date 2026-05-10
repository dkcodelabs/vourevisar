import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyCycleSubject, StudyCycleTopic } from '@/types/study-cycle';
import { ReviewInterval, SubjectStatus } from '@/types/study-cycle';
import type { MentorAlert } from '@/types/mentor';
import { FileText, ArrowRight, RotateCcw, Flame, Target, CheckCircle2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers locais
// ---------------------------------------------------------------------------

function normalizeText(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const HighlightText: React.FC<{ text: string; searchQuery: string }> = ({ text, searchQuery }) => {
  if (!searchQuery.trim()) return <>{text}</>;
  const normText = normalizeText(text);
  const normQuery = normalizeText(searchQuery);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100 px-0.5 rounded">
        {text.substring(idx, idx + searchQuery.length)}
      </mark>
      {text.substring(idx + searchQuery.length)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Badge de status
// ---------------------------------------------------------------------------
function getTopicStatusConfig(topic: StudyCycleTopic, isConsolidated: boolean) {
  if (isConsolidated || topic.reviewStatus === ReviewInterval.COMPLETED) {
    const completedDate = topic.lastReviewedAt
      ? new Date(topic.lastReviewedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;
    if (isConsolidated) {
      return {
        text: 'Consolidado',
        className: 'bg-emerald-100/50 text-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300/60 opacity-60',
        indicatorClassName: 'bg-emerald-500',
        actionClassName: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:border-emerald-800',
        dateInfo: completedDate ? `Última revisão: ${completedDate}` : null,
      };
    }
    return {
      text: 'Concluído',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      indicatorClassName: 'bg-emerald-500',
      actionClassName: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:border-emerald-800',
      dateInfo: completedDate ? `Em: ${completedDate}` : null,
    };
  }

  if (topic.reviewStatus === ReviewInterval.NOT_STARTED) {
    return {
      text: 'Não estudado',
      className: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-300',
      indicatorClassName: 'bg-slate-400 dark:bg-slate-500',
      actionClassName: 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
      dateInfo: null
    };
  }

  const calcDiff = () => {
    if (!topic.nextReviewDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(topic.nextReviewDate);
    next.setHours(0, 0, 0, 0);
    return Math.ceil((next.getTime() - today.getTime()) / 86400000);
  };

  if (topic.reviewStatus === ReviewInterval.FIRST_CONTACT) {
    const diff = calcDiff();
    const formattedDate = topic.nextReviewDate
      ? new Date(topic.nextReviewDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;
    if (diff !== null) {
      if (diff < 0) return {
        text: 'Atrasado',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        indicatorClassName: 'bg-red-500',
        actionClassName: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 dark:border-red-800',
        dateInfo: formattedDate ? `Em: ${formattedDate}` : null
      };
      if (diff === 0) return {
        text: 'Hoje',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        indicatorClassName: 'bg-orange-500',
        actionClassName: 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 dark:border-orange-800',
        dateInfo: formattedDate ? `Em: ${formattedDate}` : null
      };
      return {
        text: `Em ${diff} dia${diff !== 1 ? 's' : ''}`,
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        indicatorClassName: 'bg-blue-500',
        actionClassName: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:border-blue-800',
        dateInfo: formattedDate ? `Em: ${formattedDate}` : null
      };
    }
    return {
      text: 'Primeiro Contato',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      indicatorClassName: 'bg-blue-500',
      actionClassName: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:border-blue-800',
      dateInfo: null
    };
  }

  const diff = calcDiff();
  const formattedDate = topic.nextReviewDate
    ? new Date(topic.nextReviewDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  if (diff !== null) {
    if (diff < 0) return {
      text: 'Atrasado',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      indicatorClassName: 'bg-red-500',
      actionClassName: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 dark:border-red-800',
      dateInfo: formattedDate ? `Em: ${formattedDate}` : null
    };
    if (diff === 0) return {
      text: 'Hoje',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      indicatorClassName: 'bg-orange-500',
      actionClassName: 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 dark:border-orange-800',
      dateInfo: formattedDate ? `Em: ${formattedDate}` : null
    };
    return {
      text: `Em ${diff} dia${diff !== 1 ? 's' : ''}`,
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      indicatorClassName: 'bg-blue-500',
      actionClassName: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:border-blue-800',
      dateInfo: formattedDate ? `Em: ${formattedDate}` : null
    };
  }

  return {
    text: 'Em revisão',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    indicatorClassName: 'bg-blue-500',
    actionClassName: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:border-blue-800',
    dateInfo: null
  };
}

// ---------------------------------------------------------------------------
// Limiar para alerta de dificuldade nível 3
// ---------------------------------------------------------------------------
function isHardAlert(reviewCount: number, hardReviewCount: number): boolean {
  if (reviewCount < 2 || hardReviewCount === 0) return false;
  return hardReviewCount >= 2 || hardReviewCount / reviewCount >= 0.4;
}

function formatReviewSummary(totalContactCount: number) {
  const contactCount = Math.max(0, totalContactCount);
  const actualReviewCount = Math.max(0, contactCount - 1);
  const contactText = contactCount === 1 ? '1 contato registrado' : `${contactCount} contatos registrados`;
  const reviewText = actualReviewCount === 1 ? '1 revisão realizada' : `${actualReviewCount} revisões realizadas`;
  return { actualReviewCount, tooltip: `${contactText}. ${reviewText}.` };
}

function getNotesContent(notes: StudyCycleTopic['notes'] | { content?: string } | null | undefined) {
  return typeof notes === 'string' ? notes : notes?.content;
}

const HARD_TOOLTIP =
  'Este tópico possui um alto volume de revisões marcadas com dificuldade "Difícil" (Nível 3).';

// ---------------------------------------------------------------------------
// Linha de tópico
// ---------------------------------------------------------------------------
interface TopicRowProps {
  topic: StudyCycleTopic;
  isActionable: boolean;
  isConsolidated: boolean;
  searchQuery: string;
  onOpenNotes: () => void;
  onCheckboxClick: () => void;
  mentorAlert?: MentorAlert;
}

const TopicRow: React.FC<TopicRowProps> = ({
  topic,
  isActionable,
  isConsolidated,
  searchQuery,
  onOpenNotes,
  onCheckboxClick,
  mentorAlert,
}) => {
  const navigate = useNavigate();
  const statusConfig = getTopicStatusConfig(topic, isConsolidated);
  const totalContactCount = topic.reviewCount ?? 0;
  const hardCount = topic.hardReviewCount ?? 0;
  const showHardAlert = isHardAlert(totalContactCount, hardCount);
  const isStudiedInCycle = topic.reviewStatus !== ReviewInterval.NOT_STARTED;
  const reviewSummary = formatReviewSummary(totalContactCount);
  const notesContent = getNotesContent(topic.notes);

  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5 pl-5 border-b border-border/40 dark:border-white/5 hover:bg-accent/50 dark:hover:bg-white/[0.03] transition-colors group">
      <div
        className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${statusConfig.indicatorClassName}`}
        aria-hidden="true"
      />
      {/* Nome do tópico */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-foreground break-words leading-snug line-clamp-2">
          <HighlightText text={topic.name} searchQuery={searchQuery} />
        </span>
        {isStudiedInCycle && (
          <CheckCircle2
            size={14}
            className="flex-shrink-0 text-slate-400 dark:text-slate-500"
            aria-label={`Estudado no ciclo: ${topic.name}`}
            role="img"
          >
            <title>{totalContactCount <= 1 ? 'Primeiro contato registrado' : `${totalContactCount} contatos registrados`}</title>
          </CheckCircle2>
        )}
        {mentorAlert && (
          <div
            className={`flex-shrink-0 flex items-center justify-center p-1 rounded-md ${mentorAlert.level === 'critical' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}
            title="Ação Recomendada pelo Mentor AI"
          >
            {mentorAlert.level === 'critical' ? <Flame size={12} /> : <Target size={12} />}
          </div>
        )}
      </div>

      {/* Badge de status */}
      <div className="flex-shrink-0 relative group/badge cursor-help">
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${statusConfig.className}`}
          title={statusConfig.dateInfo || ''}
        >
          {statusConfig.text}
        </span>
        {statusConfig.dateInfo && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {statusConfig.dateInfo}
          </div>
        )}
      </div>

      {/* Contador de revisões com alerta de dificuldade 3 */}
      <div
        className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold tabular-nums ${showHardAlert ? 'text-orange-400' : 'text-content-muted'}`}
        title={`${reviewSummary.tooltip}${showHardAlert ? ' ' + HARD_TOOLTIP : ''}`}
      >
        <RotateCcw size={11} className={showHardAlert ? 'text-orange-400' : 'text-content-muted'} />
        <span>{reviewSummary.actualReviewCount}</span>
      </div>

      {/* Ações */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onOpenNotes}
          className={`p-1 transition-colors rounded ${
            notesContent?.trim() && notesContent !== '<p><br></p>'
              ? 'text-primary/50 hover:text-primary'
              : 'text-gray-400 hover:text-primary/70'
          }`}
          aria-label={`Anotações para ${topic.name}`}
        >
          <FileText size={15} />
        </button>

        {topic.reviewStatus === ReviewInterval.NOT_STARTED ? (
          <button
            onClick={onCheckboxClick}
            disabled={!isActionable}
            className={`w-5 h-5 rounded-full border-2 border-border dark:border-white/20 bg-secondary hover:bg-accent flex items-center justify-center transition-all ${!isActionable ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label={`Marcar ${topic.name} como estudado`}
          />
        ) : (
          <button
            onClick={() => navigate(`/revisoes?topicId=${topic.id}`)}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border ${statusConfig.actionClassName}`}
            title="Ir para Revisões"
            aria-label={`Ver ${topic.name} em Revisões`}
          >
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cabeçalho de matéria (sticky)
// ---------------------------------------------------------------------------
interface SubjectHeaderProps {
  subject: StudyCycleSubject;
  topicCount: number;
}

const SubjectHeader: React.FC<SubjectHeaderProps> = ({ subject, topicCount }) => (
  <div className="sticky top-0 z-10 bg-background flex items-center gap-3 px-4 py-2 border-b border-primary/10">
    <span className="text-xs font-black uppercase tracking-widest text-primary/80">
      {subject.name.replace(/(\d+ª) visualização/g, '$1')}
    </span>
    <span className="text-[10px] text-content-muted font-semibold tabular-nums">
      {topicCount} tópico{topicCount !== 1 ? 's' : ''}
    </span>
    {subject.status === SubjectStatus.COMPLETED_CYCLE && (
      <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
        Estudado hoje
      </span>
    )}
    {subject.status === SubjectStatus.FINISHED && (
      <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
        Concluída
      </span>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
interface StudyCycleVerticalViewProps {
  subjects: StudyCycleSubject[];
  searchQuery: string;
  filterTopicsBySearch?: (topics: StudyCycleTopic[]) => StudyCycleTopic[];
  onOpenNotes: (subjectId: string, topicId: string) => void;
  onCheckboxClick: (topicId: string) => void;
  criticalByTopic?: Map<string, MentorAlert>;
  gargaloByTopic?: Map<string, MentorAlert>;
  consolidatedTopicIds?: Set<string>;
  isActionable?: boolean;
}

export const StudyCycleVerticalView: React.FC<StudyCycleVerticalViewProps> = ({
  subjects,
  searchQuery,
  filterTopicsBySearch,
  onOpenNotes,
  onCheckboxClick,
  criticalByTopic,
  gargaloByTopic,
  consolidatedTopicIds,
  isActionable = true,
}) => {
  const sortTopics = (topics: StudyCycleTopic[]) =>
    [...topics].sort((a, b) => {
      if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const visibleSubjects = useMemo(() => {
    return subjects
      .map(subject => {
        const sorted = sortTopics(subject.topics);
        const filtered = filterTopicsBySearch ? filterTopicsBySearch(sorted) : sorted;
        return { subject, topics: filtered };
      })
      .filter(({ topics }) => topics.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, filterTopicsBySearch, searchQuery]);

  if (visibleSubjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <p className="text-sm">Nenhum tópico encontrado{searchQuery ? ` para "${searchQuery}"` : ''}.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full rounded-xl border border-border/40 dark:border-white/5 overflow-hidden bg-card">
      {visibleSubjects.map(({ subject, topics }) => (
        <div key={subject.id}>
          <SubjectHeader subject={subject} topicCount={topics.length} />
          {topics.map(topic => (
            <TopicRow
              key={topic.id}
              topic={topic}
              isActionable={isActionable && subject.status === SubjectStatus.ACTIVE}
              isConsolidated={consolidatedTopicIds?.has(topic.id) ?? false}
              searchQuery={searchQuery}
              onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
              onCheckboxClick={() => onCheckboxClick(topic.id)}
              mentorAlert={criticalByTopic?.get(topic.id) || gargaloByTopic?.get(topic.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default StudyCycleVerticalView;
