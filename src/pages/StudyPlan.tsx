
import React from 'react';
import { motion } from 'framer-motion';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import StudyPlanHeader from '@/components/study-plan/StudyPlanHeader';
import CycleInfo from '@/components/study-plan/CycleInfo';
import CompletionMessage from '@/components/study-plan/CompletionMessage';
import SubjectCard from '@/components/study-plan/SubjectCard';
import NextSubjects from '@/components/study-plan/NextSubjects';
import DayCompletedMessage from '@/components/study-plan/DayCompletedMessage';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

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

const StudyPlan = () => {
  const {
    isLoading,
    expandedSubject,
    tempMarkedTopics,
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    isNewCycleStarted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview
  } = useStudyPlanLogic();

  return (
    <motion.div 
      className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {isLoading ? (
        <motion.div 
          className="flex justify-center items-center h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      ) : (
        <motion.div className="space-y-4" variants={containerVariants}>
          <StudyPlanHeader onNextDay={handleNextDay} />

          {userCycle && (
            <motion.div variants={itemVariants}>
              <CycleInfo 
                userCycle={userCycle}
                disciplinasConcluidas={disciplinasConcluidas}
                totalDisciplinasCiclo={totalDisciplinasCiclo}
                isNewCycleStarted={isNewCycleStarted}
              />
            </motion.div>
          )}

          <div className="space-y-4">
            {allDaySubjectsCompleted ? (
              <motion.div variants={itemVariants}>
                <DayCompletedMessage onNextDay={handleNextDay} />
              </motion.div>
            ) : (
              dailySubjects.length > 0 && dailySubjects.map((subject) => (
                <motion.div key={subject.id} variants={itemVariants}>
                  <SubjectCard
                    subject={subject}
                    isExpanded={expandedSubject === subject.id}
                    tempMarkedTopics={tempMarkedTopics}
                    onToggleExpand={handleToggleExpand}
                    onMarkTopicForReview={handleMarkTopicForReview}
                    onCancelTopicReview={handleCancelTopicReview}
                    onCompleteSession={handleCompleteSession}
                    isDaySubject={true}
                  />
                </motion.div>
              ))
            )}
          </div>

          {nextSubjects.length > 0 && (
            <motion.div variants={itemVariants}>
              <NextSubjects nextSubjects={nextSubjects} />
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudyPlan;
