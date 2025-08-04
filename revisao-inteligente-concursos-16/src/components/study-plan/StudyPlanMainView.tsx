import React, { useState } from 'react';
import CycleInfo from './CycleInfo';
import SubjectCard from './SubjectCard';
import NextSubjects from './NextSubjects';
import { Subject, UserCycle } from '@/types';
import { SubjectWithStatus } from '@/hooks/useNextSubjects';
import { ChevronDownIcon } from './icons';

interface StudyPlanMainViewProps {
  userCycle: UserCycle;
  dailySubjects: Subject[];
  nextSubjects: SubjectWithStatus[];
  nextCycleSubjects: Subject[];
  subjectsByStatus: {
    available: SubjectWithStatus[];
    'in-review': SubjectWithStatus[];
    completed: SubjectWithStatus[];
    'no-topics': SubjectWithStatus[];
    unavailable: SubjectWithStatus[];
  };
  expandedSubject: string;
  tempMarkedTopics: Record<string, string[]>;
  disciplinasConcluidas: number;
  totalDisciplinasCiclo: number;
  disciplinasIniciadasCiclo: number;
  disciplinasNaoIniciadas: number;
  showNewCycleStarted: boolean;
  allDaySubjectsCompleted: boolean;
  isCycleCompleted: boolean;
  allTopicsInReview: boolean;
  onToggleExpand: (subjectId: string) => void;
  onMarkTopicForReview: (subjectId: string, topicId: string) => void;
  onCancelTopicReview: (subjectId: string, topicId: string) => void;
  onCompleteSession: (subjectId: string) => void;
}

// Componente CollapsibleSection aplicado
interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, count, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="mb-6">
      <button 
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="mt-4 pl-2 pr-1">
          {children}
        </div>
      )}
    </section>
  );
};

const StudyPlanMainView: React.FC<StudyPlanMainViewProps> = ({
  userCycle,
  dailySubjects,
  nextSubjects,
  nextCycleSubjects,
  subjectsByStatus,
  expandedSubject,
  tempMarkedTopics,
  disciplinasConcluidas,
  totalDisciplinasCiclo,
  disciplinasIniciadasCiclo,
  disciplinasNaoIniciadas,
  showNewCycleStarted,
  allDaySubjectsCompleted,
  isCycleCompleted,
  allTopicsInReview,
  onToggleExpand,
  onMarkTopicForReview,
  onCancelTopicReview,
  onCompleteSession
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  
  return (
    <>
      <CycleInfo 
        userCycle={userCycle}
        disciplinasConcluidas={disciplinasConcluidas}
        totalDisciplinasCiclo={totalDisciplinasCiclo}
        isNewCycleStarted={showNewCycleStarted}
        disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
        disciplinasNaoIniciadas={disciplinasNaoIniciadas}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Seção: Matérias para hoje - FIXA (sem CollapsibleSection) */}
      {dailySubjects.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-12">
            <span className="text-2xl">📝</span>
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-1 flex items-center gap-3">Matérias para hoje</h2>
            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {dailySubjects.length}
            </span>
          </div>
          <div className="space-y-4 mb-6">
            {dailySubjects.map((subject) => (
              <div key={subject.id}>
                <SubjectCard
                  subject={subject}
                  isExpanded={expandedSubject === subject.id}
                  tempMarkedTopics={tempMarkedTopics}
                  onToggleExpand={onToggleExpand}
                  onMarkTopicForReview={onMarkTopicForReview}
                  onCancelTopicReview={onCancelTopicReview}
                  onCompleteSession={onCompleteSession}
                  isDaySubject={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.values(subjectsByStatus).some(arr => arr.length > 0) && !allDaySubjectsCompleted && !isCycleCompleted && !allTopicsInReview && dailySubjects.length > 0 && (
        <NextSubjects 
          subjectsByStatus={subjectsByStatus} 
          nextCycleSubjects={nextCycleSubjects} 
          viewMode={viewMode}
        />
      )}
    </>
  );
};

export default StudyPlanMainView;