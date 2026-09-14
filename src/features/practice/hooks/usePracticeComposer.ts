import { useEffect, useMemo, useRef, useState } from "react";

import { usePracticeTopics } from "@/features/practice/hooks/usePracticeTopicOptions";
import type { PracticeSubjectOption } from "@/features/practice/hooks/usePracticeTopicOptions";
import type {
  BuildPracticeSessionInput,
  PracticeFormat,
  PracticeOverview,
} from "@/features/practice/services/practiceService";

type ComposerInput = Omit<BuildPracticeSessionInput, "idempotencyKey">;

const recommendationReasonCopy = {
  recent_failure: "Falha recente nas questões",
  recorded_difficulty: "Dificuldade registrada",
  practice_inactive: "Prática interrompida",
  flashcards_due: "Flashcards vencidos hoje",
  flashcards_new: "Primeiro contato com os cartões",
} as const;

const countForFormat = (
  format: PracticeFormat,
  material: { questions: number; flashcards: number },
) => format === "questions"
  ? material.questions
  : format === "flashcards"
    ? material.flashcards
    : material.questions + material.flashcards;

export type PracticeComposerState = ReturnType<typeof usePracticeComposer>;

export const usePracticeComposer = ({
  userId,
  overview,
  subjects,
}: {
  userId?: string;
  overview?: PracticeOverview;
  subjects: PracticeSubjectOption[];
}) => {
  const recommendation = overview?.dailyRecommendation;
  const recommendationKey = recommendation
    ? [recommendation.kind, recommendation.topic?.id ?? "cycle", recommendation.count, recommendation.reason].join(":")
    : "pending";
  const appliedRecommendationKey = useRef<string | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [format, setFormat] = useState<PracticeFormat>("questions");
  const [quantity, setQuantity] = useState(3);
  const [recommendationActive, setRecommendationActive] = useState(false);
  const [dueCycleQueue, setDueCycleQueue] = useState(false);
  const topicsQuery = usePracticeTopics(userId, subjectId || undefined);

  const restoreRecommendation = () => {
    if (!recommendation || recommendation.kind === "clear") return;
    const isDueQueue = recommendation.kind === "flashcards_due";
    appliedRecommendationKey.current = recommendationKey;
    setRecommendationActive(true);
    setDueCycleQueue(isDueQueue);
    setSubjectId(isDueQueue ? "" : recommendation.topic?.subjectId ?? "");
    setTopicId(isDueQueue ? "" : recommendation.topic?.id ?? "");
    setTopicPickerOpen(Boolean(!isDueQueue && recommendation.topic?.id));
    setFormat(isDueQueue || recommendation.kind === "flashcards_new" ? "flashcards" : "questions");
    setQuantity(recommendation.count);
  };

  useEffect(() => {
    if (!recommendation || appliedRecommendationKey.current === recommendationKey) return;
    appliedRecommendationKey.current = recommendationKey;

    if (recommendation.kind === "clear") {
      setRecommendationActive(false);
      setDueCycleQueue(false);
      return;
    }

    const isDueQueue = recommendation.kind === "flashcards_due";
    setRecommendationActive(true);
    setDueCycleQueue(isDueQueue);
    setSubjectId(isDueQueue ? "" : recommendation.topic?.subjectId ?? "");
    setTopicId(isDueQueue ? "" : recommendation.topic?.id ?? "");
    setTopicPickerOpen(Boolean(!isDueQueue && recommendation.topic?.id));
    setFormat(isDueQueue || recommendation.kind === "flashcards_new" ? "flashcards" : "questions");
    setQuantity(recommendation.count);
  }, [recommendation, recommendationKey]);

  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? null;
  const selectedTopic = (topicsQuery.data ?? []).find((topic) => topic.id === topicId) ?? null;
  const selectedTopicName = selectedTopic?.name
    ?? (recommendation?.topic?.id === topicId ? recommendation.topic.name : "");
  const selectedSubjectName = selectedSubject?.name
    ?? (recommendation?.topic?.subjectId === subjectId ? recommendation.topic.subjectName : "");

  const material = useMemo(() => {
    const relevantTopics = dueCycleQueue
      ? overview?.materialTopics ?? []
      : topicId
        ? (overview?.materialTopics ?? []).filter((topic) => topic.id === topicId)
        : (overview?.materialTopics ?? []).filter((topic) => topic.subjectId === subjectId);

    return relevantTopics.reduce(
      (total, topic) => ({
        questions: total.questions + topic.questionCount,
        flashcards: total.flashcards + topic.flashcardCount,
        dueFlashcards: total.dueFlashcards + topic.dueFlashcardCount,
      }),
      { questions: 0, flashcards: 0, dueFlashcards: 0 },
    );
  }, [dueCycleQueue, overview?.materialTopics, subjectId, topicId]);

  const availableCount = dueCycleQueue
    ? overview?.flashcards.dueCount ?? 0
    : countForFormat(format, material);
  const mixedIsAvailable = material.questions > 0 && material.flashcards > 0;
  const availableFormatCount = format === "mixed" && !mixedIsAvailable
    ? 0
    : countForFormat(format, material);
  const sessionQuantity = Math.min(quantity, availableCount);
  const hasSelectedFocus = dueCycleQueue || Boolean(subjectId);
  const needsTopicForGeneration = !dueCycleQueue && !topicId && availableFormatCount === 0;
  const canStart = dueCycleQueue
    ? availableCount > 0
    : Boolean(subjectId) && availableFormatCount > 0;
  const canGenerate = !dueCycleQueue && Boolean(topicId) && availableFormatCount === 0;

  const markManual = () => {
    setRecommendationActive(false);
    setDueCycleQueue(false);
  };

  const chooseSubject = (value: string) => {
    markManual();
    setSubjectId(value);
    setTopicId("");
    setTopicPickerOpen(false);
  };

  const chooseTopic = (value: string) => {
    markManual();
    setTopicId(value);
  };

  const chooseFormat = (value: PracticeFormat) => {
    markManual();
    setFormat(value);
  };

  const chooseQuantity = (value: number) => {
    markManual();
    setQuantity(value);
  };

  const clearRecommendation = () => {
    appliedRecommendationKey.current = recommendationKey;
    setRecommendationActive(false);
    setDueCycleQueue(false);
    setSubjectId("");
    setTopicId("");
    setTopicPickerOpen(false);
    setFormat("questions");
    setQuantity(3);
  };

  const focusTopicSelection = () => {
    markManual();
    setTopicPickerOpen(true);
  };

  const applySessionPrefill = (prefill?: {
    subjectId?: string;
    topicId?: string;
    format?: PracticeFormat;
  }) => {
    if (!prefill) return;
    appliedRecommendationKey.current = recommendationKey;
    setRecommendationActive(false);
    setDueCycleQueue(false);
    setSubjectId(prefill.subjectId ?? "");
    setTopicId(prefill.topicId ?? "");
    setTopicPickerOpen(Boolean(prefill.topicId));
    setFormat(prefill.format ?? "questions");
  };

  const buildInput = (): ComposerInput | null => {
    if (!canStart) return null;
    if (dueCycleQueue) {
      return {
        mode: "flashcards_due",
        format: "flashcards",
        flashcardPurpose: "review",
        origin: "daily_recommendation",
        quantity,
      };
    }

    const isNewFlashcardRecommendation = recommendationActive && recommendation?.kind === "flashcards_new";
    const isQuestionRecommendation = recommendationActive && recommendation?.kind === "questions";
    return {
      mode: format === "questions" ? "questions" : isNewFlashcardRecommendation ? "flashcards_due" : "quick",
      format,
      ...(isNewFlashcardRecommendation ? { flashcardPurpose: "new" as const } : {}),
      // New cards can be suggested, but only the due-cycle queue is allowed to reschedule reviews.
      origin: isQuestionRecommendation ? "daily_recommendation" : "manual",
      ...(topicId ? { topicId } : { subjectId }),
      quantity: sessionQuantity,
    };
  };

  const recommendationReason = recommendationActive && recommendation?.kind !== "clear"
    ? recommendationReasonCopy[recommendation.reason as keyof typeof recommendationReasonCopy]
    : null;

  return {
    subjectId,
    topicId,
    topicPickerOpen,
    format,
    quantity,
    selectedSubjectName,
    selectedTopicName,
    topics: topicsQuery.data ?? [],
    topicsLoading: topicsQuery.isLoading,
    material,
    availableCount,
    mixedIsAvailable,
    sessionQuantity,
    hasSelectedFocus,
    needsTopicForGeneration,
    canStart,
    canGenerate,
    recommendationActive,
    recommendationAvailable: Boolean(recommendation && recommendation.kind !== "clear" && !recommendationActive),
    recommendationReason,
    dueCycleQueue,
    estimatedMinutes: recommendationActive ? recommendation?.estimatedMinutes ?? null : null,
    chooseSubject,
    chooseTopic,
    chooseFormat,
    chooseQuantity,
    clearRecommendation,
    restoreRecommendation,
    focusTopicSelection,
    setTopicPickerOpen,
    applySessionPrefill,
    buildInput,
  };
};
