import { format, startOfDay } from 'date-fns';
import type { ReviewTopic } from '@/hooks/useReviewsData';
import { RevisionStatus, type RevisionItem, type RevisionStats } from '@/types/revision';
import type { ReviewHistoryItem } from '@/types/revision';

export type ReviewsPageStats = RevisionStats & { reviewsDoneToday: number };

export const buildReviewStats = ({
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics,
    consolidatedTopics,
    focusTopics,
    topics,
    subjects,
    reviewData,
    getCanonicalReviewTopicKey,
}: {
    delayedTopics: ReviewTopic[];
    todayTopics: ReviewTopic[];
    futureTopics: ReviewTopic[];
    completedTopics: ReviewTopic[];
    consolidatedTopics: ReviewTopic[];
    focusTopics: ReviewTopic[];
    topics: ReviewTopic[];
    subjects: unknown[];
    reviewData: ReviewHistoryItem[] | null;
    getCanonicalReviewTopicKey: (topic: ReviewTopic) => string;
}): ReviewsPageStats => {
    const allTopics = [...delayedTopics, ...todayTopics, ...futureTopics, ...completedTopics, ...consolidatedTopics];
    const totalTopics = new Set(topics.map(getCanonicalReviewTopicKey)).size;
    const completedReviews = completedTopics.length + consolidatedTopics.length;
    const todayDate = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const reviewsDoneToday = (reviewData || []).filter(review => format(startOfDay(new Date(review.reviewed_at)), 'yyyy-MM-dd') === todayDate).length;
    return {
        today: todayTopics.length,
        overdue: delayedTopics.length,
        future: futureTopics.length,
        completedTopicsCount: consolidatedTopics.length,
        completedReviews,
        reviewsDoneToday,
        totalScheduledReviews: delayedTopics.length + todayTopics.length + futureTopics.length + completedReviews,
        startedTopicsCount: allTopics.length,
        focusCount: new Set(focusTopics.map(getCanonicalReviewTopicKey)).size,
        totalTopics,
        totalSubjects: subjects.length,
    };
};

export const groupReviewItems = (items: RevisionItem[], activeTab: string): Record<string, RevisionItem[]> => {
    const groups: Record<string, RevisionItem[]> = {};
    if (activeTab === 'SUBJECTS') {
        items.forEach(item => { (groups[item.subject] ||= []).push(item); });
    } else if (activeTab === 'FOCUS') {
        if (items.length > 0) groups.FOCUS_MERGED = items;
    } else if (activeTab === 'ALL') {
        Object.values(RevisionStatus).forEach(status => { groups[status] = []; });
        items.forEach(item => { groups[item.status].push(item); });
    } else {
        const target = activeTab === 'FUTURE' ? RevisionStatus.FUTURE : RevisionStatus.CONSOLIDATED;
        groups[target] = [];
        items.forEach(item => { if (item.status === target) groups[target].push(item); });
    }
    return groups;
};
