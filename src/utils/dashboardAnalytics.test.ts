import { describe, expect, it } from 'vitest';
import {
  calculateCompactMetrics,
  calculateSubjectPerformance,
  calculateConsistencyHeatmap,
  calculateWeeklyPlanning,
} from './dashboardAnalytics';
import type { DashboardCycleSubject } from '@/types/dashboardDecision';

describe('dashboardAnalytics', () => {
  describe('calculateCompactMetrics', () => {
    it('returns zero values when input is empty', () => {
      const result = calculateCompactMetrics({ sessions: [], historyRows: [] });
      expect(result).toEqual({
        totalStudyMinutes: 0,
        dailyAverageMinutes: 0,
        activeStudyDays: 0,
        totalPracticeItems: 0,
      });
    });

    it('aggregates minutes and counts unique active days across sessions and reviews', () => {
      const result = calculateCompactMetrics({
        sessions: [
          { study_date: '2026-10-01', session_duration_minutes: 60 },
          { study_date: '2026-10-01', session_duration_minutes: 40 },
          { study_date: '2026-10-02', session_duration_minutes: 50 },
        ],
        historyRows: [
          { reviewed_at: '2026-10-02T10:00:00Z' },
          { reviewed_at: '2026-10-03T15:00:00Z' },
        ],
        practiceAnsweredCount: 15,
        flashcardsReviewedCount: 10,
      });

      // Total minutes: 60 + 40 + 50 = 150
      // Unique active days: 2026-10-01, 2026-10-02, 2026-10-03 = 3 days
      // Daily average: 150 / 3 = 50
      // Practice items: 15 + 10 = 25
      expect(result).toEqual({
        totalStudyMinutes: 150,
        dailyAverageMinutes: 50,
        activeStudyDays: 3,
        totalPracticeItems: 25,
      });
    });
  });

  describe('calculateSubjectPerformance', () => {
    const subjects: DashboardCycleSubject[] = [
      {
        id: 'sub-1',
        name: 'Direito Constitucional',
        cyclePosition: 1,
        isCompletedInCycle: false,
        color: '#3B82F6',
        topics: [
          { id: 'top-1', name: 'Direitos Fundamentais', subjectId: 'sub-1', subjectName: 'Direito Constitucional' },
          { id: 'top-2', name: 'Controle de Constitucionalidade', subjectId: 'sub-1', subjectName: 'Direito Constitucional' },
        ],
      },
      {
        id: 'sub-2',
        name: 'Direito Administrativo',
        cyclePosition: 2,
        isCompletedInCycle: false,
        color: '#10B981',
        topics: [
          { id: 'top-3', name: 'Atos Administrativos', subjectId: 'sub-2', subjectName: 'Direito Administrativo' },
        ],
      },
    ];

    it('calculates accuracy percentage, time, and questions per subject correctly', () => {
      const result = calculateSubjectPerformance({
        subjects,
        sessions: [
          { subject_id: 'sub-1', session_duration_minutes: 90, study_date: '2026-10-01' },
          { subject_id: 'sub-2', session_duration_minutes: 45, study_date: '2026-10-01' },
        ],
        practiceAttempts: [
          { topic_id: 'top-1', result: 'correct' },
          { topic_id: 'top-1', result: 'correct' },
          { topic_id: 'top-1', result: 'incorrect' },
          { topic_id: 'top-2', result: 'skipped' },
          { topic_id: 'top-3', result: 'incorrect' },
        ],
      });

      expect(result).toHaveLength(2);

      // Subject 1: 2 correct, 1 incorrect, 1 skipped -> answered = 3 -> 2/3 = 67%
      expect(result[0]).toEqual({
        subjectId: 'sub-1',
        subjectName: 'Direito Constitucional',
        color: '#3B82F6',
        completedTopics: 0,
        totalTopics: 2,
        overdueReviewsCount: 0,
        correct: 2,
        incorrect: 1,
        skipped: 1,
        totalMinutes: 90,
        accuracyPercentage: 67,
      });

      // Subject 2: 0 correct, 1 incorrect, 0 skipped -> answered = 1 -> 0/1 = 0%
      expect(result[1]).toEqual({
        subjectId: 'sub-2',
        subjectName: 'Direito Administrativo',
        color: '#10B981',
        completedTopics: 0,
        totalTopics: 1,
        overdueReviewsCount: 0,
        correct: 0,
        incorrect: 1,
        skipped: 0,
        totalMinutes: 45,
        accuracyPercentage: 0,
      });
    });

    it('returns null accuracyPercentage when no questions were answered', () => {
      const result = calculateSubjectPerformance({
        subjects,
        sessions: [],
        practiceAttempts: [],
      });

      expect(result[0].accuracyPercentage).toBeNull();
      expect(result[0].totalMinutes).toBe(0);
    });
  });

  describe('calculateConsistencyHeatmap', () => {
    it('creates exact number of days for specified weeks and detects streak', () => {
      const ref = new Date('2026-10-07T12:00:00Z');
      const result = calculateConsistencyHeatmap({
        referenceDate: ref,
        weeksCount: 2, // 14 days
        sessions: [
          { study_date: '2026-10-06', session_duration_minutes: 70 },
          { study_date: '2026-10-07', session_duration_minutes: 35 },
        ],
        historyRows: [
          { reviewed_at: '2026-10-07T10:00:00Z' },
        ],
        practiceAttempts: [],
      });

      expect(result.days).toHaveLength(14);
      expect(result.totalActiveDays).toBe(2);
      expect(result.currentStreak).toBe(2);

      const today = result.days.find((d) => d.date === '2026-10-07');
      expect(today).toBeDefined();
      expect(today?.isToday).toBe(true);
      expect(today?.intensity).toBe('completed');
      expect(today?.studyMinutes).toBe(35);
      expect(today?.reviewsCount).toBe(1);

      const yesterday = result.days.find((d) => d.date === '2026-10-06');
      expect(yesterday?.intensity).toBe('exceeded');
    });

    it('falls back to yesterday streak if today has no activity yet', () => {
      const ref = new Date('2026-10-07T12:00:00Z');
      const result = calculateConsistencyHeatmap({
        referenceDate: ref,
        weeksCount: 2,
        sessions: [
          { study_date: '2026-10-05', session_duration_minutes: 40 },
          { study_date: '2026-10-06', session_duration_minutes: 40 },
        ],
        historyRows: [],
        practiceAttempts: [],
      });

      // Today (07) has 0, but yesterday (06) and day before (05) have activity -> streak = 2
      expect(result.currentStreak).toBe(2);
    });
  });

  describe('calculateWeeklyPlanning', () => {
    it('generates 7 days (S, T, Q, Q, S, S, D) for the current week and computes total minutes', () => {
      // 2026-10-07 is Wednesday
      const ref = new Date('2026-10-07T12:00:00Z');
      const result = calculateWeeklyPlanning({
        referenceDate: ref,
        weeklyGoalHours: 25,
        sessions: [
          { study_date: '2026-10-05', session_duration_minutes: 120 }, // Monday
          { study_date: '2026-10-07', session_duration_minutes: 60 },  // Wednesday
        ],
        upcomingReviews: {
          days: [
            {
              date: '2026-10-07',
              dayOfWeek: 'Qua',
              dayLabel: 'Quarta',
              reviewCount: 4,
              overdueCount: 2,
              isToday: true,
            },
            {
              date: '2026-10-08',
              dayOfWeek: 'Qui',
              dayLabel: 'Quinta',
              reviewCount: 6,
              isToday: false,
            },
          ],
          totalInWindow: 10,
          totalBeyondWindow: 0,
          peakDay: null,
        },
      });

      expect(result.weeklyGoalHours).toBe(25);
      expect(result.currentWeekMinutes).toBe(180);
      expect(result.days).toHaveLength(7);
      expect(result.days.map((d) => d.shortDay)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);

      const wednesday = result.days.find((d) => d.date === '2026-10-07');
      expect(wednesday?.isToday).toBe(true);
      expect(wednesday?.hasOverdue).toBe(true);
      expect(wednesday?.reviewCount).toBe(4);
      expect(wednesday?.studyMinutes).toBe(60);
    });
  });
});
