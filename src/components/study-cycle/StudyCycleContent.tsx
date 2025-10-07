import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudyCycleSubject, StudyCycleTopic } from '@/types/study-cycle';
import { SubjectStatus, ReviewInterval } from '@/types/study-cycle';
import { useStudyCycleData } from '@/hooks/useStudyCycleData';
import { STATUS_CONFIG } from '@/constants/study-cycle';
import { StudyCycleSubjectCard } from './StudyCycleSubjectCard';
import { GridIcon, ListIcon, ChevronsDownIcon, ChevronsUpIcon, CheckCircleIcon } from './Icons';
import { StudyCycleNotesModal } from './StudyCycleNotesModal';
import { TempNotesModal } from './TempNotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import AllStudiesCompletedCard from './AllStudiesCompletedCard';
import { CycleStats } from '@/components/CycleStats';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { NewCycleModal } from '@/components/NewCycleModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LOCAL_STORAGE_VIEW_KEY = 'studyCycleViewMode';

const CompletionMessage: React.FC<{ onStartNewCycle: () => void }> = ({ onStartNewCycle }) => {
  return (
    <div className="text-center p-8 md:p-16 bg-card rounded-2xl shadow-lg border border-emerald-500/20 flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-emerald-500">
        <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a25.14 25.14 0 012.916.52 6.003 6.003 0 00-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h3 className="text-3xl md:text-4xl font-bold text-card-foreground">
        Parabéns!
      </h3>
      <p className="max-w-md text-base text-muted-foreground">
        Você concluiu todas as suas revisões para o ciclo de hoje. Ótimo trabalho! Descanse ou, se estiver pronto, inicie o próximo ciclo de estudos.
      </p>
      <button
        onClick={onStartNewCycle}
        className="mt-4 px-8 py-3 bg-sky-600 text-white font-bold rounded-lg transition-all duration-300 hover:bg-sky-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        Iniciar Próximo Ciclo de Estudos
      </button>
    </div>
  );
};

export const StudyCycleContent: React.FC = () => {
  // Use the new hook for real database data
  const {
    studyCycleSubjects: subjects,
    groupedSubjects,
    activeSubjects,
    completedCycleSubjects,

    areAllStudiesCompleted,

    sessionMarks,
    userCycle,
    dailySubjectsWithViews,
    handleStartNewCycle: handleStartNewCycleData,
    handleToggleMark,
    handleCompleteSession: handleCompleteSessionData,
    handleSaveNotes,
    refreshCycleData
  } = useStudyCycleData();

  // Escutar eventos de atualização do ciclo
  useEffect(() => {
    const handleCycleUpdate = () => {
      refreshCycleData();
    };
    
    const handleNewCycleStarted = (event: CustomEvent) => {
      console.log('🎉 Evento newCycleStarted recebido:', event.detail);
      const { cycleNumber, totalSubjects } = event.detail;
      setNewCycleModal({
        isOpen: true,
        cycleNumber,
        totalSubjects
      });
      console.log('🎉 Modal definido para abrir:', { cycleNumber, totalSubjects });
    };
    
    window.addEventListener('cycleUpdated', handleCycleUpdate);
    window.addEventListener('newCycleStarted', handleNewCycleStarted as EventListener);
    
    return () => {
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
      window.removeEventListener('newCycleStarted', handleNewCycleStarted as EventListener);
    };
  }, [refreshCycleData]);

  // Refresh cycle data when component mounts
  useEffect(() => {
    try {
      refreshCycleData();
    } catch (error) {
      console.error('Erro ao carregar dados do ciclo:', error);
    }
  }, []); // Executar apenas uma vez quando o componente monta

  // Detectar quando um novo ciclo foi iniciado
  useEffect(() => {
    if (userCycle && userCycle.ciclos_realizados !== null && userCycle.ciclos_realizados !== undefined) {
      if (previousCycleNumber !== null && userCycle.ciclos_realizados > previousCycleNumber) {
        // Novo ciclo foi iniciado
        setShowNewCycleMessage(true);
        setTimeout(() => setShowNewCycleMessage(false), 8000); // Esconder após 8 segundos
      }
      setPreviousCycleNumber(userCycle.ciclos_realizados);
    }
  }, [userCycle?.ciclos_realizados]);

  // Debug logs removidos para evitar spam

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedViewMode = localStorage.getItem(LOCAL_STORAGE_VIEW_KEY);
    return (savedViewMode === 'grid' || savedViewMode === 'list') ? savedViewMode : 'grid';
  });

  const [editingTopic, setEditingTopic] = useState<{ subjectId: string; topicId: string } | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [subjectNotesModal, setSubjectNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });

  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [previousCycleNumber, setPreviousCycleNumber] = useState<number | null>(null);
  const [newCycleModal, setNewCycleModal] = useState<{
    isOpen: boolean;
    cycleNumber: number;
    totalSubjects: number;
  }>({
    isOpen: false,
    cycleNumber: 0,
    totalSubjects: 0
  });

  // Hook para status do ciclo
  const { markSubjectAsStudied, isSubjectStudied } = useCycleStatus();
  const { user } = useAuth();

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, viewMode);
    setExpandedSubjects(new Set());
  }, [viewMode]);
  
  const handleToggleExpand = useCallback((subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const expandableSubjects = [
      ...(groupedSubjects[SubjectStatus.ACTIVE] || []),
      ...(groupedSubjects[SubjectStatus.COMPLETED_CYCLE] || [])
    ];
    const allIds = expandableSubjects.map(s => s.id);
    setExpandedSubjects(new Set(allIds));
  }, [groupedSubjects]);

  const handleCollapseAll = useCallback(() => {
    setExpandedSubjects(new Set());
  }, []);

  // Use the handlers from the hook

  const handleOpenNotes = useCallback((subjectId: string, topicId: string) => {
    setEditingTopic({ subjectId, topicId });
  }, []);

  const handleCloseNotes = useCallback(() => {
    setEditingTopic(null);
  }, []);
  
  const handleSaveNotesWithClose = useCallback((subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    handleSaveNotes(subjectId, topicId, updatedData);
    handleCloseNotes();
  }, [handleSaveNotes]);

  const handleOpenSubjectNotes = useCallback((subject: StudyCycleSubject) => {
    setSubjectNotesModal({
      isOpen: true,
      subjectId: subject.id,
      subjectName: subject.name
    });
  }, []);

  const topicToEdit = useMemo(() => {
    if (!editingTopic) return null;
    const subject = subjects.find(s => s.id === editingTopic.subjectId);
    const topic = subject?.topics.find(t => t.id === editingTopic.topicId);
    return subject && topic ? { subject, topic } : null;
  }, [subjects, editingTopic]);

  const renderSection = (status: SubjectStatus) => {
    const sectionSubjects = groupedSubjects[status] || [];
    const config = STATUS_CONFIG[status];

    if (!config || sectionSubjects.length === 0) return null;

    const isFinishedSection = status === SubjectStatus.FINISHED;
    const isActionableSection = status === SubjectStatus.ACTIVE;
    
    const containerClasses = viewMode === 'grid'
      ? "grid grid-cols-1 md:grid-cols-2 gap-8"
      : "flex flex-col items-center gap-4";

    return (
      <section key={status} className="mb-12">
        <div className="flex items-center mb-6">
          <span className={`mr-4 text-${config.borderColor.split('-')[1]}-500`}>{config.icon}</span>
          <h2 className={`text-xl font-bold text-foreground border-b-2 ${config.borderColor} pb-2`}>
            {config.title}
          </h2>
        </div>
        <div className={containerClasses}>
          {sectionSubjects.map((subject) => (
            <StudyCycleSubjectCard
              key={`${subject.id}-${subject.status}`}
              subject={subject}
              onCompleteSession={handleCompleteSessionData}
              onOpenNotes={handleOpenNotes}
              onSubjectNotesClick={() => handleOpenSubjectNotes(subject)}
              isActionable={isActionableSection}
              isStudyFocus={false}
              viewMode={viewMode}
              isExpanded={expandedSubjects.has(subject.id)}
              onToggleExpand={() => handleToggleExpand(subject.id)}
              markedTopicIds={sessionMarks[subject.id] || new Set()}
              onToggleMark={(topicId) => handleToggleMark(subject.id, topicId)}
            />
          ))}
        </div>
      </section>
    );
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="container mx-auto p-4 md:p-8 pr-[calc(1rem+15px)] md:pr-[calc(2rem+15px)]">
        {/* Estatísticas do Ciclo */}
        <div className="mb-6">
          <CycleStats />

        </div>

        {/* Mensagem de Novo Ciclo Iniciado */}
        {showNewCycleMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="text-lg font-bold text-blue-700">Novo Ciclo Iniciado!</h3>
                  <p className="text-blue-600 text-sm">
                    Ciclo #{userCycle?.ciclos_realizados || 0} foi iniciado com sucesso. 
                    Todas as matérias foram resetadas para um novo ciclo de estudos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewCycleMessage(false)}
                className="text-blue-400 hover:text-blue-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <div className="flex justify-end items-center mb-6">
            {viewMode === 'list' && (
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mr-2">
              <button
                onClick={handleExpandAll}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Expandir Todos"
              >
                <ChevronsDownIcon />
              </button>
              <button
                onClick={handleCollapseAll}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Recolher Todos"
              >
                <ChevronsUpIcon />
              </button>
            </div>
            )}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Visualização em Grade"
              >
                <GridIcon />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Visualização em Lista"
              >
                <ListIcon />
              </button>
            </div>
        </div>
        
        <>
          {/* Verificar se todas as matérias ativas foram estudadas no ciclo atual */}
          {activeSubjects.length > 0 && activeSubjects.every(subject => {
            const markedTopics = sessionMarks[subject.id] || new Set();
            return markedTopics.size > 0 || subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
          }) && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-green-700 mb-2">🎉 Parabéns!</h2>
                <p className="text-green-600 mb-4">
                  Você concluiu todas as matérias ativas do ciclo atual! 
                  Um novo ciclo será iniciado automaticamente quando você concluir a última sessão.
                </p>
              </div>
            </div>
          )}
          
          {renderSection(SubjectStatus.ACTIVE)}
          {renderSection(SubjectStatus.COMPLETED_CYCLE)}
          {renderSection(SubjectStatus.FINISHED)}
        </>

      </main>
      
      {topicToEdit && (
        <StudyCycleNotesModal
          subject={topicToEdit.subject}
          topic={topicToEdit.topic}
          onClose={handleCloseNotes}
          onSave={handleSaveNotesWithClose}
        />
      )}
      
      {/* Subject Notes Modal */}
      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => setSubjectNotesModal(prev => ({ ...prev, isOpen: false }))}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />

      {/* New Cycle Modal */}
      <NewCycleModal
        isOpen={newCycleModal.isOpen}
        onClose={() => setNewCycleModal(prev => ({ ...prev, isOpen: false }))}
        cycleNumber={newCycleModal.cycleNumber}
        totalSubjects={newCycleModal.totalSubjects}
      />
    </div>
  );
};

export default StudyCycleContent;