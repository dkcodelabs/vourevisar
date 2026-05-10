import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers,
  ListChecks,
  MessageSquareText,
  NotebookTabs,
  Sparkles,
  Target,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Subject, Topic } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { useCycleState } from '@/hooks/useCycleState';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';

const getNoteContent = (notes: Subject['notes'] | Topic['notes'] | string | null | undefined) => {
  if (!notes) return '';
  if (typeof notes === 'string') return notes;
  return notes.content || '';
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const hasUsefulNote = (notes: Subject['notes'] | Topic['notes'] | string | null | undefined) => {
  const content = stripHtml(getNoteContent(notes));
  return Boolean(content && content !== '{}' && content !== 'null' && content !== 'undefined');
};

const getPreview = (notes: Subject['notes'] | Topic['notes'] | string | null | undefined) => {
  const content = stripHtml(getNoteContent(notes));
  if (!content) return '';
  return content.length > 180 ? `${content.slice(0, 180)}...` : content;
};

const getTopicDifficultyLabel = (topic: Topic) => {
  const difficulty = topic.difficulty_level;
  if (!difficulty) return 'Sem dificuldade marcada';
  if (difficulty <= 2) return 'Baixa dificuldade';
  if (difficulty === 3) return 'Dificuldade média';
  return 'Alta dificuldade';
};

const Cadernos = () => {
  const navigate = useNavigate();
  const { subjects, isLoading, isDataLoaded } = useApp();
  const { userCycle, isLoading: cycleLoading } = useCycleState();
  const { editaisData } = useEditalOriginsWithMerge();
  const visibleSubjects = useMemo(
    () => subjects.filter(subject => subject.is_visible !== false),
    [subjects]
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!visibleSubjects.length) {
      setSelectedSubjectId(null);
      return;
    }

    const currentStillExists = visibleSubjects.some(subject => subject.id === selectedSubjectId);
    if (!currentStillExists) {
      const subjectWithNotes = visibleSubjects.find(subject =>
        hasUsefulNote(subject.notes) || subject.topics?.some(topic => hasUsefulNote(topic.notes))
      );
      setSelectedSubjectId((subjectWithNotes || visibleSubjects[0]).id);
    }
  }, [selectedSubjectId, visibleSubjects]);

  const selectedSubject = useMemo(
    () => visibleSubjects.find(subject => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, visibleSubjects]
  );

  const subjectSummaries = useMemo(() => {
    return visibleSubjects.map(subject => {
      const topics = subject.topics || [];
      const topicsWithNotes = topics.filter(topic => hasUsefulNote(topic.notes));
      const hardTopics = topics.filter(topic => (topic.difficulty_level || 0) >= 3);

      return {
        subject,
        topicCount: topics.length,
        topicsWithNotesCount: topicsWithNotes.length,
        hasSubjectNote: hasUsefulNote(subject.notes),
        hardTopicsCount: hardTopics.length,
      };
    });
  }, [visibleSubjects]);

  const selectedTopicsWithNotes = useMemo(
    () => (selectedSubject?.topics || []).filter(topic => hasUsefulNote(topic.notes)),
    [selectedSubject]
  );

  const selectedHardTopics = useMemo(
    () => (selectedSubject?.topics || []).filter(topic => (topic.difficulty_level || 0) >= 3),
    [selectedSubject]
  );

  if (isLoading || !isDataLoaded || cycleLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const hasActiveCycle = Boolean(userCycle?.ciclo_atual?.length);
  const hasAnyEdital = editaisData.length > 0 || visibleSubjects.length > 0;

  if (!hasActiveCycle) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <StudyEmptyState
          kind={hasAnyEdital ? 'no-cycle' : 'no-edital'}
          variant="center"
          onAction={() => navigate('/meus-editais')}
        />
      </div>
    );
  }

  if (!visibleSubjects.length) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl p-8 text-center">
            <NotebookTabs size={34} className="mx-auto text-primary mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Cadernos</h1>
            <p className="text-sm text-content-muted max-w-lg mx-auto">
              Cadastre matérias e tópicos para montar um caderno de consolidação por matéria.
            </p>
            <button
              onClick={() => navigate('/meus-editais')}
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              Abrir Meus Editais
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-5 lg:px-6 py-5">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 border-b border-border dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <NotebookTabs size={18} />
              <span className="text-[11px] font-black uppercase tracking-[0.18em]">Caderno da matéria</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Cadernos</h1>
            <p className="text-sm text-content-muted mt-1 max-w-2xl">
              Consolidação por matéria: anotações, tópicos, dificuldades e revisão rápida.
            </p>
          </div>

          <button
            onClick={() => navigate('/ciclo-estudos')}
            className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-bold text-content-muted hover:text-primary hover:border-primary/30 transition-colors w-fit"
          >
            Voltar ao ciclo
            <ChevronRight size={14} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
          <aside className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border dark:border-white/10">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-content-muted">Matérias</p>
            </div>
            <div className="max-h-[calc(100vh-210px)] overflow-y-auto">
              {subjectSummaries.map(({ subject, topicCount, topicsWithNotesCount, hasSubjectNote, hardTopicsCount }) => {
                const selected = subject.id === selectedSubject?.id;

                return (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border/70 dark:border-white/[0.06] transition-colors',
                      selected
                        ? 'bg-primary/8 dark:bg-primary/10'
                        : 'hover:bg-secondary/70 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn('text-[13px] font-bold truncate', selected ? 'text-primary' : 'text-foreground')}>
                          {subject.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-content-muted">
                          <span>{topicCount} {topicCount === 1 ? 'tópico' : 'tópicos'}</span>
                          <span className="h-1 w-1 rounded-full bg-content-muted/40" />
                          <span>{topicsWithNotesCount} {topicsWithNotesCount === 1 ? 'anotado' : 'anotados'}</span>
                          {hasSubjectNote && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-content-muted/40" />
                              <span>nota da matéria</span>
                            </>
                          )}
                        </div>
                      </div>
                      {hardTopicsCount > 0 && (
                        <span className="shrink-0 rounded-full border border-orange-400/25 bg-orange-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-400">
                          {hardTopicsCount} difícil
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="space-y-4">
            {selectedSubject && (
              <>
                <section className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-content-muted mb-1">
                        Matéria selecionada
                      </p>
                      <h2 className="text-xl font-black tracking-tight text-foreground truncate">
                        {selectedSubject.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
                        <span>{selectedSubject.topics?.length || 0} tópicos</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-content-muted/40" />
                        <span>{selectedTopicsWithNotes.length} com anotações</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-content-muted/40" />
                        <span>{selectedHardTopics.length} dificuldades marcadas</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
                      <Metric icon={FileText} label="Anotações" value={selectedTopicsWithNotes.length + (hasUsefulNote(selectedSubject.notes) ? 1 : 0)} />
                      <Metric icon={Brain} label="Difíceis" value={selectedHardTopics.length} />
                      <Metric icon={ListChecks} label="Tópicos" value={selectedSubject.topics?.length || 0} />
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl p-4 sm:p-5">
                    <SectionTitle icon={BookOpen} title="Anotações da Matéria" />
                    {hasUsefulNote(selectedSubject.notes) ? (
                      <p className="mt-3 text-sm leading-6 text-content-main">
                        {getPreview(selectedSubject.notes)}
                      </p>
                    ) : (
                      <EmptyState text="Ainda não existe anotação geral desta matéria." />
                    )}
                  </div>

                  <div className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl p-4 sm:p-5">
                    <SectionTitle icon={Brain} title="Principais Dificuldades" />
                    {selectedHardTopics.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {selectedHardTopics.slice(0, 4).map(topic => (
                          <div key={topic.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 dark:border-white/[0.06] px-3 py-2">
                            <span className="text-xs font-semibold text-foreground truncate">{topic.name}</span>
                            <span className="text-[10px] font-bold text-orange-400 shrink-0">{getTopicDifficultyLabel(topic)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState text="Nenhum tópico foi marcado como alta dificuldade." />
                    )}
                  </div>
                </section>

                <section className="border border-border dark:border-white/10 bg-card dark:bg-zinc-900 rounded-2xl p-4 sm:p-5">
                  <SectionTitle icon={MessageSquareText} title="Anotações dos Tópicos" />
                  {selectedTopicsWithNotes.length > 0 ? (
                    <div className="mt-3 divide-y divide-border/70 dark:divide-white/[0.06]">
                      {selectedTopicsWithNotes.map(topic => (
                        <article key={topic.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <h3 className="text-sm font-bold text-foreground">{topic.name}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                              {getTopicDifficultyLabel(topic)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-content-muted">
                            {getPreview(topic.notes)}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Os tópicos desta matéria ainda não têm anotações salvas." />
                  )}
                </section>

                <section className="border border-dashed border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.06] rounded-2xl p-4 sm:p-5">
                  <SectionTitle icon={Sparkles} title="Estudo Assistido" />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    <FutureItem icon={Bot} title="Resumo por IA" />
                    <FutureItem icon={Layers} title="Junção dos tópicos" />
                    <FutureItem icon={Target} title="Revisão pré-prova" />
                    <FutureItem icon={CheckCircle2} title="Flashcards" />
                    <FutureItem icon={FileText} title="Questões geradas" />
                    <FutureItem icon={Brain} title="Pontos fracos" />
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2">
    <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
      <Icon size={16} />
    </span>
    <h2 className="text-[13px] font-black uppercase tracking-[0.14em] text-foreground">{title}</h2>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="mt-3 rounded-lg border border-border/70 dark:border-white/[0.06] px-3 py-4 text-xs text-content-muted">
    {text}
  </div>
);

const Metric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) => (
  <div className="rounded-lg border border-border/70 dark:border-white/[0.06] px-3 py-2">
    <Icon size={14} className="text-primary mb-1" />
    <p className="text-lg font-black leading-none text-foreground">{value}</p>
    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-content-muted">{label}</p>
  </div>
);

const FutureItem = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-card/70 dark:bg-zinc-950/30 px-3 py-2 text-xs font-bold text-content-main">
    <Icon size={14} className="text-primary shrink-0" />
    <span>{title}</span>
    <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-content-muted/70">depois</span>
  </div>
);

export default Cadernos;
