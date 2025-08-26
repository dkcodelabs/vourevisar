import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { StudyCycleSubject, StudyCycleTopic, SubjectStatus, ReviewInterval, Difficulty } from '@/types/study-cycle';
import type { Subject, Topic } from '@/types';

const STUDY_FOCUS_COUNT = 2;

// Mapping functions
const mapStatusToStudyCycleStatus = (status: string): SubjectStatus => {
  switch (status) {
    case 'Nova':
    case 'Em Estudo':
      return 'ACTIVE' as SubjectStatus;
    case 'Concluída':
      return 'FINISHED' as SubjectStatus;
    default:
      return 'ACTIVE' as SubjectStatus;
  }
};

const mapReviewStageToInterval = (reviewStage?: string, completed?: boolean): ReviewInterval => {
  if (completed) return 'COMPLETED' as ReviewInterval;
  
  switch (reviewStage) {
    case '24h':
      return 'REVISED_7D' as ReviewInterval;
    case '7 dias':
      return 'REVISED_15D' as ReviewInterval;
    case '30 dias':
      return 'REVISED_30D' as ReviewInterval;
    case 'Concluído':
      return 'COMPLETED' as ReviewInterval;
    default:
      return 'NOT_STARTED' as ReviewInterval;
  }
};

const mapDifficultyLevel = (level?: string): Difficulty => {
  switch (level) {
    case 'easy':
      return 'EASY' as Difficulty;
    case 'hard':
      return 'HARD' as Difficulty;
    default:
      return 'MEDIUM' as Difficulty;
  }
};

const mapTopicToStudyCycleTopic = (topic: Topic): StudyCycleTopic => ({
  id: topic.id,
  name: topic.name,
  reviewStatus: mapReviewStageToInterval(topic.reviewStage, topic.completed),
  notes: topic.notes?.content || '',
  difficulty: mapDifficultyLevel(topic.difficulty_level),
  subTopics: topic.subtopics?.map(st => ({ id: st.id, name: st.name })) || []
});

const mapSubjectToStudyCycleSubject = (subject: Subject): StudyCycleSubject => ({
  id: subject.id,
  name: subject.name,
  topics: subject.topics.map(mapTopicToStudyCycleTopic),
  status: mapStatusToStudyCycleStatus(subject.status)
});

// Reverse mapping functions for database updates
const mapIntervalToReviewStage = (interval: ReviewInterval): string => {
  switch (interval) {
    case 'REVISED_7D':
      return '24h';
    case 'REVISED_15D':
      return '7 dias';
    case 'REVISED_30D':
      return '30 dias';
    case 'COMPLETED':
      return 'Concluído';
    default:
      return '';
  }
};

const mapDifficultyToLevel = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'EASY':
      return 'easy';
    case 'HARD':
      return 'hard';
    default:
      return 'medium';
  }
};

export const useStudyCycleData = () => {
  const { user } = useAuth();
  const { subjects, refreshData, updateTopic } = useApp();
  const [studyFocusSubjectIds, setStudyFocusSubjectIds] = useState<Set<string>>(new Set());
  const [sessionMarks, setSessionMarks] = useState<Record<string, Set<string>>>({});

  // Transform subjects from database to study cycle format
  const studyCycleSubjects = useMemo(() => {
    return subjects.map(mapSubjectToStudyCycleSubject);
  }, [subjects]);

  // Initialize study focus subjects
  useEffect(() => {
    const activeSubjects = studyCycleSubjects.filter(s => s.status === 'ACTIVE');
    const initialFocusIds = new Set(activeSubjects.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
    setStudyFocusSubjectIds(initialFocusIds);
  }, [studyCycleSubjects]);

  // Group subjects by status
  const groupedSubjects = useMemo(() => {
    return studyCycleSubjects.reduce((acc, subject) => {
      const status = subject.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(subject);
      return acc;
    }, {} as Record<SubjectStatus, StudyCycleSubject[]>);
  }, [studyCycleSubjects]);

  const activeSubjects = groupedSubjects['ACTIVE'] || [];
  const completedCycleSubjects = groupedSubjects['COMPLETED_CYCLE'] || [];

  // Check if day is completed
  const isDayCompleted = useMemo(() => {
    if (studyFocusSubjectIds.size === 0) {
      return activeSubjects.length === 0 && completedCycleSubjects.length > 0;
    }
    const remainingFocusSubjects = activeSubjects.filter(s => studyFocusSubjectIds.has(s.id));
    return remainingFocusSubjects.length === 0;
  }, [activeSubjects, completedCycleSubjects, studyFocusSubjectIds]);

  // Check if all studies are completed (all subjects are finished and all topics are completed)
  const areAllStudiesCompleted = useMemo(() => {
    if (studyCycleSubjects.length === 0) return false;
    
    return studyCycleSubjects.every(subject => {
      // Subject must be finished
      if (subject.status !== 'FINISHED') return false;
      
      // All topics must be completed
      return subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
    });
  }, [studyCycleSubjects]);

  // Handle starting new cycle
  const handleStartNewCycle = useCallback(async () => {
    if (!user) return;

    try {
      // Reset subjects that completed cycle back to active
      const subjectsToReset = subjects.filter(s => s.status === 'Concluída');
      
      for (const subject of subjectsToReset) {
        await supabase
          .from('subjects')
          .update({ status: 'Em Estudo' })
          .eq('id', subject.id)
          .eq('user_id', user.id);
      }

      // Refresh data to get updated subjects
      await refreshData();

      // Set new focus subjects
      const newActiveSubjects = subjects.filter(s => s.status !== 'Concluída');
      const newFocusIds = new Set(newActiveSubjects.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
      setStudyFocusSubjectIds(newFocusIds);

    } catch (error) {
      console.error('Error starting new cycle:', error);
    }
  }, [user, subjects, refreshData]);

  // Handle topic marking for review
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

  // Handle completing a study session
  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const revisedTopicIds = Array.from(sessionMarks[subjectId] || []);
    if (revisedTopicIds.length === 0) return;

    try {
      // Update each revised topic in the database
      for (const topicId of revisedTopicIds) {
        const topic = subjects
          .find(s => s.id === subjectId)
          ?.topics.find(t => t.id === topicId);
        
        if (topic) {
          const currentInterval = mapReviewStageToInterval(topic.reviewStage, topic.completed);
          const nextInterval = getNextReviewInterval(currentInterval);
          const newReviewStage = mapIntervalToReviewStage(nextInterval);
          const isCompleted = nextInterval === 'COMPLETED';

          await updateTopic(subjectId, topicId, {
            reviewStage: newReviewStage,
            completed: isCompleted,
            last_reviewed_at: new Date(),
            review_count: (topic.review_count || 0) + 1
          });
        }
      }

      // Check if all topics in subject are completed
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        const allTopicsCompleted = subject.topics.every(t => {
          if (revisedTopicIds.includes(t.id)) {
            const currentInterval = mapReviewStageToInterval(t.reviewStage, t.completed);
            const nextInterval = getNextReviewInterval(currentInterval);
            return nextInterval === 'COMPLETED';
          }
          return t.completed;
        });

        if (allTopicsCompleted) {
          await supabase
            .from('subjects')
            .update({ status: 'Concluída' })
            .eq('id', subjectId)
            .eq('user_id', user?.id);
        }
      }

      // Clear session marks for this subject
      setSessionMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[subjectId];
        return newMarks;
      });

      // Refresh data to reflect changes
      await refreshData();

    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [sessionMarks, subjects, updateTopic, user?.id, refreshData]);

  // Handle saving topic notes
  const handleSaveNotes = useCallback(async (subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    try {
      const updatePayload: any = {};
      
      if (updatedData.notes !== undefined) {
        updatePayload.notes = { content: updatedData.notes };
      }
      
      if (updatedData.difficulty !== undefined) {
        updatePayload.difficulty_level = mapDifficultyToLevel(updatedData.difficulty);
        updatePayload.difficulty_set_at = new Date();
      }

      await updateTopic(subjectId, topicId, updatePayload);
      await refreshData();
      
    } catch (error) {
      console.error('Error saving topic notes:', error);
    }
  }, [updateTopic, refreshData]);

  return {
    studyCycleSubjects,
    groupedSubjects,
    activeSubjects,
    completedCycleSubjects,
    isDayCompleted,
    areAllStudiesCompleted,
    studyFocusSubjectIds,
    sessionMarks,
    handleStartNewCycle,
    handleToggleMark,
    handleCompleteSession,
    handleSaveNotes
  };
};

// Helper function to get next review interval
const reviewProgression = [
  'NOT_STARTED' as ReviewInterval,
  'REVISED_7D' as ReviewInterval,
  'REVISED_15D' as ReviewInterval,
  'REVISED_30D' as ReviewInterval,
  'COMPLETED' as ReviewInterval,
];

const getNextReviewInterval = (currentStatus: ReviewInterval): ReviewInterval => {
  const currentIndex = reviewProgression.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === reviewProgression.length - 1) {
    return currentStatus;
  }
  return reviewProgression[currentIndex + 1];
};