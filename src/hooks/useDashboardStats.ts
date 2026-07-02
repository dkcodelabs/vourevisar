import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, format } from 'date-fns';
import { Subject } from '@/types';

export interface DashboardStats {
  month: {
    firstContacts: number;
    reviewsCompleted: number;
    overdueCount: number;
    todayReviewCount: number;
    futureReviewCount: number;
    totalReviews: number;
    activeDays: number;
    totalDaysInMonth: number;
    activityRate: number;
  };
  general: {
    firstContacts: number;
    reviewsCompleted: number;
    overdueCount: number;
    todayReviewCount: number;
    futureReviewCount: number;
    totalReviews: number;
    totalActiveDays: number;
    averagePerDay: number;
    completedTopics: number;
  };
}

export const useDashboardStats = (
  subjects: Subject[],
  reviewData: unknown[],
  currentMonth: Date = new Date()
): DashboardStats => {
  const today = startOfDay(new Date());

  // --- Mês Stats ---
  const calculateMonthStats = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let reviewsCompleted = 0;
    const activeDaysSet = new Set<string>();
    const firstContactTopicIds = new Set<string>();

    // 1. Analisar Histórico (Review Data)
    reviewData.forEach(review => {
      const reviewDate = new Date(review.reviewed_at);
      if (reviewDate >= monthStart && reviewDate <= monthEnd) {
        activeDaysSet.add(format(reviewDate, 'yyyy-MM-dd'));

        if (review.review_stage === 'first_contact' || review.review_stage === 'Primeiro Contato') {
          firstContactTopicIds.add(review.topic_id);
        } else {
          reviewsCompleted++;
        }
      }
    });

    // 2. Analisar Tópicos (First Studied At) que não estão no histórico
    let firstContactsFromTopics = 0;
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (topic.first_studied_at || topic.firstStudiedAt) {
          const firstStudyDate = new Date(topic.first_studied_at || (topic.firstStudiedAt as unknown as string));
          const firstStudyDay = startOfDay(firstStudyDate);

          if (firstStudyDay >= monthStart && firstStudyDay <= monthEnd) {
            if (!firstContactTopicIds.has(topic.id)) {
              firstContactsFromTopics++;
            }
          }
        }
      });
    });

    const firstContacts = firstContactTopicIds.size + firstContactsFromTopics;

    // 3. Contar Agendadas (Futuro/Hoje/Atrasado) - APENAS do mês
    let overdueCount = 0;
    let todayReviewCount = 0;
    let futureReviewCount = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Só contar tópicos já iniciados (excluir Não Iniciados)
        const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
        if (!wasStudied || !topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));

        if (reviewDate >= monthStart && reviewDate <= monthEnd) {
          if (reviewDate < today) {
            overdueCount++;
          } else if (isSameDay(reviewDate, today)) {
            todayReviewCount++;
          } else {
            futureReviewCount++;
          }
        }
      });
    });

    const activeDays = activeDaysSet.size;
    const totalDaysInMonth = days.length;
    const activityRate = totalDaysInMonth > 0 ? Math.round((activeDays / totalDaysInMonth) * 100) : 0;

    return {
      firstContacts,
      reviewsCompleted,
      overdueCount,
      todayReviewCount,
      futureReviewCount,
      totalReviews: overdueCount + todayReviewCount + futureReviewCount,
      activeDays,
      totalDaysInMonth,
      activityRate
    };
  };

  // --- Geral Stats ---
  const calculateAllTimeStats = () => {
    let reviewsCompleted = 0;
    const allDaysSet = new Set<string>();
    const firstContactTopicIds = new Set<string>();

    // 1. Analisar Histórico Completo
    reviewData.forEach(review => {
      const reviewDate = new Date(review.reviewed_at);
      allDaysSet.add(format(reviewDate, 'yyyy-MM-dd'));

      if (review.review_stage === 'first_contact' || review.review_stage === 'Primeiro Contato') {
        firstContactTopicIds.add(review.topic_id);
      } else {
        reviewsCompleted++;
      }
    });

    // 2. Analisar Tópicos (First Studied At)
    let firstContactsFromTopics = 0;
    let completedTopics = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Contar contatos iniciais
        if (topic.first_studied_at || topic.firstStudiedAt) {
          if (!firstContactTopicIds.has(topic.id)) {
            firstContactsFromTopics++;
          }
        }

        // Contar tópicos concluídos
        if (topic.is_completed || topic.review_stage === 'Concluído' || topic.reviewStage === 'Concluído' || topic.review_stage === '60d') {
          completedTopics++;
        }
      });
    });

    const firstContacts = firstContactTopicIds.size + firstContactsFromTopics;

    // 3. Contar Agendadas (Totais)
    let overdueCount = 0;
    let todayReviewCount = 0;
    let futureReviewCount = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Só contar tópicos já iniciados (excluir Não Iniciados)
        const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
        if (!wasStudied || !topic.nextReview || topic.is_completed) return;
        
        const reviewDate = startOfDay(new Date(topic.nextReview));

        if (reviewDate < today) {
          overdueCount++;
        } else if (isSameDay(reviewDate, today)) {
          todayReviewCount++;
        } else {
          futureReviewCount++;
        }
      });
    });

    const totalActiveDays = allDaysSet.size;
    const totalActivity = firstContacts + reviewsCompleted;
    const averagePerDay = totalActiveDays > 0 ? Math.round(totalActivity / totalActiveDays) : 0;

    return {
      firstContacts,
      reviewsCompleted,
      overdueCount,
      todayReviewCount,
      futureReviewCount,
      totalReviews: overdueCount + todayReviewCount + futureReviewCount,
      totalActiveDays,
      averagePerDay,
      completedTopics
    };
  };

  return {
    month: calculateMonthStats(),
    general: calculateAllTimeStats()
  };
};
