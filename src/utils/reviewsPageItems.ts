import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { RevisionItem, RevisionStatus } from '@/types/revision';
import type { ReviewTopic } from '@/hooks/useReviewsData';
import { getCanonicalSubjectName, getCanonicalTopicName } from '@/services/cycleMergeService';
import { buildReviewOriginMetadata, type ReviewOriginEdital, type ReviewFallbackOrigin } from '@/utils/reviewOriginLabels';
import { getProgrammedReviewsCompleted, isReviewProgramCompleted } from '@/utils/reviewStage';
import { getReviewScheduleBucket } from '@/utils/reviewSchedule';

const normalizeRevisionKeyPart = (value: string) =>
    value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const getRevisionItemKey = (item: RevisionItem) =>
    `${normalizeRevisionKeyPart(item.subject)}::${normalizeRevisionKeyPart(item.topic)}`;

const getRevisionStatusPriority = (status: RevisionStatus) => {
    switch (status) {
        case 'CONSOLIDATED': return 6;
        case 'COMPLETED': return 5;
        case 'OVERDUE': return 4;
        case 'TODAY': return 3;
        case 'FUTURE': return 2;
        case 'UNSTARTED': return 1;
        default: return 0;
    }
};

const chooseRevisionItemRepresentative = (current: RevisionItem, candidate: RevisionItem) => {
    const currentPriority = getRevisionStatusPriority(current.status);
    const candidatePriority = getRevisionStatusPriority(candidate.status);
    if (currentPriority !== candidatePriority) return candidatePriority > currentPriority ? candidate : current;

    const currentReviewCount = current.reviewCount || 0;
    const candidateReviewCount = candidate.reviewCount || 0;
    if (currentReviewCount !== candidateReviewCount) return candidateReviewCount > currentReviewCount ? candidate : current;

    const currentDueTime = current.dueDate ? new Date(current.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const candidateDueTime = candidate.dueDate ? new Date(candidate.dueDate).getTime() : Number.POSITIVE_INFINITY;
    return candidateDueTime < currentDueTime ? candidate : current;
};

const dedupeRevisionItemsByCanonicalName = (items: RevisionItem[]) => {
    const order: string[] = [];
    const itemByKey = new Map<string, RevisionItem>();

    for (const item of items) {
        const key = getRevisionItemKey(item);
        const current = itemByKey.get(key);
        if (!current) {
            order.push(key);
            itemByKey.set(key, item);
            continue;
        }
        itemByKey.set(key, chooseRevisionItemRepresentative(current, item));
    }

    return order.map(key => itemByKey.get(key)).filter((item): item is RevisionItem => Boolean(item));
};

type BuildReviewItemsParams = {
    sourceList: ReviewTopic[];
    subjects: Array<{ id: string; name: string }>;
    searchTerm: string;
    reviewStageFilter: string;
    activeTab: string;
    maxReviews: number;
    dynamicUnificationMap: CycleUnificationMap | null;
    editais: ReviewOriginEdital[];
    getOriginsForTopic: (topicId: string, subjectId: string, editalId?: string) => ReviewFallbackOrigin[];
    hasCompositeCycle: boolean;
};

export const buildReviewItems = ({
    sourceList,
    subjects,
    searchTerm,
    reviewStageFilter,
    activeTab,
    maxReviews,
    dynamicUnificationMap,
    editais,
    getOriginsForTopic,
    hasCompositeCycle,
}: BuildReviewItemsParams): RevisionItem[] => {
    const allItems = sourceList.map(topic => {
        const subject = subjects.find(item => item.id === topic.subject_id);
        const rawCount = topic.review_count || 0;
        const reviewCount = getProgrammedReviewsCompleted(rawCount, isReviewProgramCompleted(topic));
        const rawSubjectName = subject?.name || 'Desconhecida';
        const canonicalSubjectName = getCanonicalSubjectName(topic.subject_id, rawSubjectName, dynamicUnificationMap);
        const canonicalTopicName = getCanonicalTopicName(topic.id, topic.name, dynamicUnificationMap);
        const originMetadata = buildReviewOriginMetadata({
            editais,
            sourceEditalIds: topic.source_edital_ids,
            fallbackOrigins: getOriginsForTopic(topic.id, topic.subject_id, topic.edital_id || undefined),
            showInCompositeCycle: hasCompositeCycle,
        });
        const statusByBucket: Record<string, RevisionStatus> = {
            overdue: 'OVERDUE' as RevisionStatus,
            today: 'TODAY' as RevisionStatus,
            future: 'FUTURE' as RevisionStatus,
            completed: 'CONSOLIDATED' as RevisionStatus,
            unstarted: 'UNSTARTED' as RevisionStatus,
            unscheduled: 'UNSTARTED' as RevisionStatus,
        };
        return {
            id: topic.id,
            topic: canonicalTopicName,
            subject: canonicalSubjectName,
            subjectId: topic.subject_id,
            difficulty: topic.difficulty_level || 0,
            dueDate: topic.next_review || new Date().toISOString(),
            notes: typeof topic.notes === 'string'
                ? topic.notes
                : (topic.notes && typeof topic.notes === 'object' && 'content' in topic.notes ? String(topic.notes.content || '') : ''),
            status: statusByBucket[getReviewScheduleBucket(topic)],
            ownerImage: '',
            reviewCount,
            maxReviews,
            learningStatus: topic.learningStatus,
            memoryStability: topic.memory_stability,
            originSummary: originMetadata.summary,
            originLabels: originMetadata.labels,
            isMergedOrigin: originMetadata.isMergedOrigin,
            showOrigin: originMetadata.shouldShow,
        };
    });

    let result = dedupeRevisionItemsByCanonicalName(allItems);
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(item => item.topic.toLowerCase().includes(lower) || item.subject.toLowerCase().includes(lower));
    }
    if (reviewStageFilter !== 'all') {
        const target = parseInt(reviewStageFilter);
        result = result.filter(item => item.reviewCount === target);
    }
    if (activeTab === 'FOCUS') {
        result = result.filter(item => item.status === 'TODAY' || item.status === 'OVERDUE');
    }
    if (activeTab === 'COMPLETED') result = result.filter(item => item.status === 'CONSOLIDATED');
    return result;
};
