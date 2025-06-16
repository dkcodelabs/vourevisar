
import React from 'react';
import { motion } from 'framer-motion';
import CycleInfo from './CycleInfo';
import SubjectCard from './SubjectCard';
import NextSubjects from './NextSubjects';
import { Subject, UserCycle } from '@/types';

interface StudyPlanMainViewProps {
  userCycle: UserCycle;
  dailySubjects: Subject[];
  nextSubjects: Subject[];
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

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const StudyPlanMainView: React.FC<StudyPlanMainViewProps> = ({
  userCycle,
  dailySubjects,
  nextSubjects,
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
      <motion.div variants={itemVariants}>
        <CycleInfo 
          userCycle={userCycle}
          disciplinasConcluidas={disciplinasConcluidas}
          totalDisciplinasCiclo={totalDisciplinasCiclo}
          isNewCycleStarted={showNewCycleStarted}
          disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
          disciplinasNaoIniciadas={disciplinasNaoIniciadas}
        />
      </motion.div>
      
      <div className="space-y-4">
        {dailySubjects.map((subject) => (
          <motion.div key={subject.id} variants={itemVariants}>
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
          </motion.div>
        ))}
      </div>

      {nextSubjects.length > 0 && !allDaySubjectsCompleted && !isCycleCompleted && !allTopicsInReview && dailySubjects.length > 0 && (
        <motion.div variants={itemVariants}>
          <NextSubjects nextSubjects={nextSubjects} />
        </motion.div>
      )}
    </>
  );
};

export default StudyPlanMainView;
