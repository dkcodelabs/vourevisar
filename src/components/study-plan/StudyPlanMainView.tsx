
import React from 'react';
import CycleInfo from './CycleInfo';
import SubjectCard from './SubjectCard';
import NextSubjects from './NextSubjects';
import { Subject, UserCycle } from '@/types';
import { SubjectWithStatus } from '@/hooks/useNextSubjects';

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
  return (
    <>
      <CycleInfo 
        userCycle={userCycle}
        disciplinasConcluidas={disciplinasConcluidas}
        totalDisciplinasCiclo={totalDisciplinasCiclo}
        isNewCycleStarted={showNewCycleStarted}
        disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
        disciplinasNaoIniciadas={disciplinasNaoIniciadas}
      />
      
      <div className="space-y-4">
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

      {Object.values(subjectsByStatus).some(arr => arr.length > 0) && !allDaySubjectsCompleted && !isCycleCompleted && !allTopicsInReview && dailySubjects.length > 0 && (
        <NextSubjects subjectsByStatus={subjectsByStatus} nextCycleSubjects={nextCycleSubjects} />
      )}
    </>
  );
};

export default StudyPlanMainView;
