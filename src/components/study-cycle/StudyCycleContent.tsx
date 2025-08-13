import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudyCycleSubject, StudyCycleTopic } from '@/types/study-cycle';
import { SubjectStatus, ReviewInterval } from '@/types/study-cycle';
import { mockStudyCycleSubjects } from '@/data/study-cycle-mock';
import { STATUS_CONFIG } from '@/constants/study-cycle';
import { StudyCycleSubjectCard } from './StudyCycleSubjectCard';
import { GridIcon, ListIcon, ChevronsDownIcon, ChevronsUpIcon, CheckCircleIcon } from './Icons';
import { StudyCycleNotesModal } from './StudyCycleNotesModal';

const LOCAL_STORAGE_KEY = 'studyCycleSubjects_v1';
const LOCAL_STORAGE_VIEW_KEY = 'studyCycleViewMode';
const STUDY_FOCUS_COUNT = 2;

const reviewProgression = [
  ReviewInterval.NOT_STARTED,
  ReviewInterval.REVISED_7D,
  ReviewInterval.REVISED_15D,
  ReviewInterval.REVISED_30D,
  ReviewInterval.COMPLETED,
];

const getNextReviewInterval = (currentStatus: ReviewInterval): ReviewInterval => {
  const currentIndex = reviewProgression.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === reviewProgression.length - 1) {
    return currentStatus;
  }
  return reviewProgression[currentIndex + 1];
};

const CompletionMessage: React.FC<{ onStartNewCycle: () => void }> = ({ onStartNewCycle }) => {
  return (
    <div className="text-center p-8 md:p-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-emerald-500/20 flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-emerald-500">
        <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a25.14 25.14 0 012.916.52 6.003 6.003 0 00-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100">
        Parabéns!
      </h3>
      <p className="max-w-md text-base text-gray-600 dark:text-slate-400">
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
  const [subjects, setSubjects] = useState<StudyCycleSubject[]>(() => {
    try {
      const savedSubjects = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedSubjects ? JSON.parse(savedSubjects) : mockStudyCycleSubjects;
    } catch (error) {
      console.error("Failed to load subjects from localStorage:", error);
      return mockStudyCycleSubjects;
    }
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedViewMode = localStorage.getItem(LOCAL_STORAGE_VIEW_KEY);
    return (savedViewMode === 'grid' || savedViewMode === 'list') ? savedViewMode : 'grid';
  });

  const [editingTopic, setEditingTopic] = useState<{ subjectId: string; topicId: string } | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [sessionMarks, setSessionMarks] = useState<Record<string, Set<string>>>({});
  const [studyFocusSubjectIds, setStudyFocusSubjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Determine the focus subjects only once when the component loads.
    const activeSubjectsOnLoad = subjects.filter(s => s.status === SubjectStatus.ACTIVE);
    const initialFocusIds = new Set(activeSubjectsOnLoad.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
    setStudyFocusSubjectIds(initialFocusIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This effect runs only once on mount to "freeze" the focus for the session.

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subjects));
    } catch (error) {
      console.error("Failed to save subjects to localStorage:", error);
    }
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, viewMode);
    setExpandedSubjects(new Set());
  }, [viewMode]);

  const handleStartNewCycle = useCallback(() => {
    setSubjects(currentSubjects => {
      const activeSubjects = currentSubjects.filter(s => s.status === SubjectStatus.ACTIVE);
      const completedCycleSubjects = currentSubjects.filter(s => s.status === SubjectStatus.COMPLETED_CYCLE);
  
      // Case 1: All subjects in the cycle are done. Time to reset and start a new grand cycle.
      if (activeSubjects.length === 0 && completedCycleSubjects.length > 0) {
        const newSubjects = currentSubjects.map(subject =>
          subject.status === SubjectStatus.COMPLETED_CYCLE
            ? { ...subject, status: SubjectStatus.ACTIVE }
            : subject
        );
        const allActiveNow = newSubjects.filter(s => s.status === SubjectStatus.ACTIVE);
        const newFocusIds = new Set(allActiveNow.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
        setStudyFocusSubjectIds(newFocusIds);
        return newSubjects;
      } else {
        // Case 2: Daily cycle is done, but more subjects are active. Set the next focus group.
        const newFocusIds = new Set(activeSubjects.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
        setStudyFocusSubjectIds(newFocusIds);
        return currentSubjects;
      }
    });
  }, []);
  
  const groupedSubjects = useMemo(() => {
    return subjects.reduce((acc, subject) => {
      const status = subject.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(subject);
      return acc;
    }, {} as Record<SubjectStatus, StudyCycleSubject[]>);
  }, [subjects]);

  const activeSubjects = groupedSubjects[SubjectStatus.ACTIVE] || [];
  const completedCycleSubjects = groupedSubjects[SubjectStatus.COMPLETED_CYCLE] || [];

  const isDayCompleted = useMemo(() => {
    if (studyFocusSubjectIds.size === 0) {
        return activeSubjects.length === 0 && completedCycleSubjects.length > 0;
    }
    const remainingFocusSubjects = activeSubjects.filter(s => studyFocusSubjectIds.has(s.id));
    return remainingFocusSubjects.length === 0;
  }, [activeSubjects, completedCycleSubjects, studyFocusSubjectIds]);
  
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

  const handleToggleMark = useCallback((subjectId: string, topicId: string) => {
    setSessionMarks(prev => {
      const currentMarks = prev[subjectId] ? new Set(prev[subjectId]) : new Set<string>();
      if (currentMarks.has(topicId)) {
        currentMarks.delete(topicId);
      } else {
        currentMarks.add(topicId);
      }
      return {
        ...prev,
        [subjectId]: currentMarks,
      };
    });
  }, []);

  const handleCompleteSession = useCallback((subjectId: string) => {
    const revisedTopicIds = Array.from(sessionMarks[subjectId] || []);
    if (revisedTopicIds.length === 0) return;
    
    setSubjects(currentSubjects => 
      currentSubjects.map(subject => {
        if (subject.id === subjectId) {
          const newTopics = subject.topics.map(topic => 
            revisedTopicIds.includes(topic.id) 
              ? { ...topic, reviewStatus: getNextReviewInterval(topic.reviewStatus) } 
              : topic
          );
          
          const allCompleted = newTopics.every(t => t.reviewStatus === ReviewInterval.COMPLETED);
          const newStatus = allCompleted ? SubjectStatus.FINISHED : SubjectStatus.COMPLETED_CYCLE;
          
          return { ...subject, topics: newTopics, status: newStatus };
        }
        return subject;
      })
    );

    setSessionMarks(prev => {
      const newMarks = { ...prev };
      delete newMarks[subjectId];
      return newMarks;
    });
  }, [sessionMarks]);

  const handleOpenNotes = useCallback((subjectId: string, topicId: string) => {
    setEditingTopic({ subjectId, topicId });
  }, []);

  const handleCloseNotes = useCallback(() => {
    setEditingTopic(null);
  }, []);
  
  const handleSaveNotes = useCallback((subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    setSubjects(currentSubjects =>
      currentSubjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            topics: s.topics.map(t =>
              t.id === topicId ? { ...t, ...updatedData } : t
            ),
          };
        }
        return s;
      })
    );
    handleCloseNotes();
  }, [handleCloseNotes]);

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
          <h2 className={`text-xl font-bold text-gray-900 dark:text-slate-100 border-b-2 ${config.borderColor} pb-2`}>
            {config.title}
          </h2>
        </div>
        <div className={containerClasses}>
          {sectionSubjects.map((subject) => (
            <StudyCycleSubjectCard
              key={`${subject.id}-${subject.status}`}
              subject={subject}
              onCompleteSession={handleCompleteSession}
              onOpenNotes={handleOpenNotes}
              isActionable={isActionableSection}
              isStudyFocus={isActionableSection && studyFocusSubjectIds.has(subject.id)}
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
    <div className="min-h-screen text-gray-900 dark:text-slate-100 font-sans">
      <main className="container mx-auto p-4 md:p-8 pr-[calc(1rem+15px)] md:pr-[calc(2rem+15px)]">
        <div className="flex justify-end items-center mb-6">
            {viewMode === 'list' && !isDayCompleted && (
              <div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-slate-700 rounded-lg mr-2">
                <button
                  onClick={handleExpandAll}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                  aria-label="Expandir Todos"
                >
                  <ChevronsDownIcon />
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                  aria-label="Recolher Todos"
                >
                  <ChevronsUpIcon />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-sky-500 shadow' : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
                aria-label="Visualização em Grade"
              >
                <GridIcon />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-sky-500 shadow' : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
                aria-label="Visualização em Lista"
              >
                <ListIcon />
              </button>
            </div>
        </div>
        
        {isDayCompleted ? (
          <section className="mb-12">
            <div className="flex items-center mb-6">
                <span className="mr-4 text-emerald-500"><CheckCircleIcon /></span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 border-b-2 border-emerald-500 pb-2">
                    Dia de Estudos Concluído
                </h2>
            </div>
            <CompletionMessage onStartNewCycle={handleStartNewCycle} />
          </section>
        ) : (
          <>
            {renderSection(SubjectStatus.ACTIVE)}
            {renderSection(SubjectStatus.COMPLETED_CYCLE)}
            {renderSection(SubjectStatus.FINISHED)}
          </>
        )}

      </main>
      
      {topicToEdit && (
        <StudyCycleNotesModal
          subject={topicToEdit.subject}
          topic={topicToEdit.topic}
          onClose={handleCloseNotes}
          onSave={handleSaveNotes}
        />
      )}
    </div>
  );
};

export default StudyCycleContent;