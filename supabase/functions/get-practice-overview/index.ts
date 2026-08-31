import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import {
  recommendPracticeTopic,
  recommendStudyAction,
  type PracticeRecommendationReason,
  type PracticeOverviewTopic,
} from "../_shared/practiceOverview.ts";
import { getActivePracticeScope } from "../_shared/practiceScope.ts";

const inputSchema = z.object({ topicId: z.string().uuid().optional() }).strict();

const allowedOrigins = (Deno.env.get("PRACTICE_ALLOWED_ORIGINS") ??
  "http://localhost:8081,http://127.0.0.1:8081,http://localhost:9999,http://127.0.0.1:9999")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (request: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });

type SubjectRow = {
  id: string;
  name: string;
  exam_weight_points: number | null;
  exam_weight_questions: number | null;
  exam_weight_percentage: number | null;
};
type TopicRow = {
  id: string;
  name: string;
  subject_id: string;
  next_review: string | null;
  difficulty_level: number | null;
  last_reviewed_at: string | null;
};
type PackageRow = { id: string; topic_id: string; created_at: string };
type ItemRow = { id: string; package_id: string; item_type: "flashcard" | "multiple_choice" | "true_false" };
type GenerationRow = { topic_id: string };
type ScheduleRow = { item_id: string; last_rating: string | null; repetitions: number; lapses: number };
type FeedbackRow = { item_id: string };
type AttemptRow = {
  topic_id: string | null;
  result: "correct" | "incorrect" | "skipped" | "recalled" | "effortful" | "forgotten";
};
type CompletedSessionRow = {
  topic_id: string | null;
  completed_at: string | null;
  signal_snapshot: { origin?: string } | null;
};

const getOverview = async (
  supabase: SupabaseClient,
  userId: string,
  requestedTopicId?: string,
) => {
  const scope = await getActivePracticeScope(supabase, userId);
  if (scope.status !== "active") {
    return {
      scope,
      recommendedTopic: null,
      selectedTopic: null,
      materialTopics: [],
      flashcards: { dueCount: 0, dueTopicCount: 0, newCount: 0, newTopicCount: 0 },
      studyAction: { kind: "cycle", topic: null, reason: "continue_cycle" },
      dailyRecommendation: {
        kind: "clear",
        count: 0,
        pendingCount: 0,
        topicCount: 0,
        reason: "clear",
        estimatedMinutes: 0,
      },
    };
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, exam_weight_points, exam_weight_questions, exam_weight_percentage")
    .eq("user_id", userId)
    .in("id", scope.subjectIds)
    .order("name");
  if (subjectsError) throw subjectsError;

  const subjectRows = (subjects ?? []) as SubjectRow[];
  const subjectNameById = new Map(subjectRows.map((subject) => [subject.id, subject.name]));
  const subjectIds = subjectRows.map((subject) => subject.id);
  if (!subjectIds.length) {
    return {
      scope,
      recommendedTopic: null,
      selectedTopic: null,
      materialTopics: [],
      flashcards: { dueCount: 0, dueTopicCount: 0, newCount: 0, newTopicCount: 0 },
      studyAction: { kind: "cycle", topic: null, reason: "continue_cycle" },
      dailyRecommendation: {
        kind: "clear",
        count: 0,
        pendingCount: 0,
        topicCount: 0,
        reason: "clear",
        estimatedMinutes: 0,
      },
    };
  }

  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id, name, subject_id, next_review, difficulty_level, last_reviewed_at")
    .in("subject_id", subjectIds)
    .neq("is_active", false);
  if (topicsError) throw topicsError;

  const topicRows = (topics ?? []) as TopicRow[];
  const subjectWeightById = new Map(subjectRows.map((subject) => [
    subject.id,
    subject.exam_weight_percentage ?? subject.exam_weight_points ?? subject.exam_weight_questions ?? 0,
  ]));
  const overviewTopics: PracticeOverviewTopic[] = topicRows.flatMap((topic) => {
    const subjectName = subjectNameById.get(topic.subject_id);
    return subjectName ? [{
      id: topic.id,
      name: topic.name,
      subjectId: topic.subject_id,
      subjectName,
      nextReview: topic.next_review,
      difficultyLevel: topic.difficulty_level,
      lastReviewedAt: topic.last_reviewed_at,
      subjectWeight: subjectWeightById.get(topic.subject_id) ?? 0,
    }] : [];
  });
  const now = Date.now();
  const recentAttemptsStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const completedSessionStart = new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: packages, error: packagesError }, { data: activeGenerations, error: generationsError }, { data: recentAttempts, error: recentAttemptsError }, { data: completedSessions, error: completedSessionsError }] = await Promise.all([
    supabase
      .from("practice_packages")
      .select("id, topic_id, created_at")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false }),
    supabase
      .from("practice_generation_runs")
      .select("topic_id")
      .eq("user_id", userId)
      .eq("status", "generating"),
    supabase
      .from("practice_attempts")
      .select("topic_id, result")
      .eq("user_id", userId)
      .is("invalidated_at", null)
      .gte("created_at", recentAttemptsStart),
    supabase
      .from("practice_sessions")
      .select("topic_id, completed_at, signal_snapshot")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", completedSessionStart),
  ]);
  if (packagesError) throw packagesError;
  if (generationsError) throw generationsError;
  if (recentAttemptsError) throw recentAttemptsError;
  if (completedSessionsError) throw completedSessionsError;

  const recentFailureCountByTopicId = new Map<string, number>();
  const recentAttemptCountByTopicId = new Map<string, number>();
  const recentCorrectCountByTopicId = new Map<string, number>();
  for (const attempt of (recentAttempts ?? []) as AttemptRow[]) {
    if (!attempt.topic_id || !["correct", "incorrect", "skipped"].includes(attempt.result)) continue;
    recentAttemptCountByTopicId.set(attempt.topic_id, (recentAttemptCountByTopicId.get(attempt.topic_id) ?? 0) + 1);
    if (attempt.result === "correct") {
      recentCorrectCountByTopicId.set(attempt.topic_id, (recentCorrectCountByTopicId.get(attempt.topic_id) ?? 0) + 1);
    } else {
      recentFailureCountByTopicId.set(attempt.topic_id, (recentFailureCountByTopicId.get(attempt.topic_id) ?? 0) + 1);
    }
  }
  for (const topic of overviewTopics) {
    topic.recentFailureCount = recentFailureCountByTopicId.get(topic.id) ?? 0;
    topic.recentAttemptCount = recentAttemptCountByTopicId.get(topic.id) ?? 0;
    topic.recentCorrectCount = recentCorrectCountByTopicId.get(topic.id) ?? 0;
  }

  // A baixa frequência só é acionável depois de haver histórico suficiente.
  // Sem duas sessões concluídas antes da janela recente, o aluno pode estar
  // apenas começando e não deve receber uma cobrança artificial.
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const completedPracticeSessions = (completedSessions ?? []) as CompletedSessionRow[];
  const activePracticeDays = new Set(
    completedPracticeSessions
      .filter((session) => session.completed_at && new Date(session.completed_at).getTime() >= sevenDaysAgo)
      .map((session) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(session.completed_at!))),
  );
  const historicalPracticeSessions = completedPracticeSessions.filter((session) =>
    session.completed_at && new Date(session.completed_at).getTime() < sevenDaysAgo,
  );
  const hasPracticeConsistencyGap = historicalPracticeSessions.length >= 2 && activePracticeDays.size < 2;

  // Material privado só entra na recomendação quando o tópico ainda pertence
  // ao ciclo ativo. Sem esse filtro, a tela podia contar um flashcard de um
  // edital anterior que a sessão corretamente recusaria abrir.
  const activeTopicIds = new Set(overviewTopics.map((topic) => topic.id));
  const packageRows = ((packages ?? []) as PackageRow[])
    .filter((item) => activeTopicIds.has(item.topic_id));
  const packagesByTopicId = new Map<string, string[]>();
  for (const row of packageRows) {
    packagesByTopicId.set(row.topic_id, [...(packagesByTopicId.get(row.topic_id) ?? []), row.id]);
  }
  const packageIds = packageRows.map((item) => item.id);
  const { data: items, error: itemsError } = packageIds.length
    ? await supabase
      .from("practice_items")
      .select("id, package_id, item_type")
      .in("package_id", packageIds)
      .eq("status", "private_ready")
    : { data: [], error: null };
  if (itemsError) throw itemsError;

  const itemRows = (items ?? []) as ItemRow[];
  const { data: negativeFeedback, error: negativeFeedbackError } = itemRows.length
    ? await supabase
      .from("practice_item_feedback")
      .select("item_id")
      .eq("user_id", userId)
      .eq("rating", -1)
      .in("item_id", itemRows.map((item) => item.id))
    : { data: [], error: null };
  if (negativeFeedbackError) throw negativeFeedbackError;
  const hiddenItemIds = new Set((negativeFeedback ?? [] as FeedbackRow[]).map((row) => row.item_id));
  const eligibleItemRows = itemRows.filter((item) => !hiddenItemIds.has(item.id));
  const topicIdByPackageId = new Map(packageRows.map((item) => [item.id, item.topic_id]));
  const questionCountByTopicId = new Map<string, number>();
  const flashcardCountByTopicId = new Map<string, number>();
  for (const item of eligibleItemRows) {
    const topicId = topicIdByPackageId.get(item.package_id);
    if (!topicId) continue;
    const target = item.item_type === "flashcard"
      ? flashcardCountByTopicId
      : questionCountByTopicId;
    target.set(topicId, (target.get(topicId) ?? 0) + 1);
  }

  // The daily recommendation must be an action the student can take now.
  // Creation of new material is deliberately not a fallback recommendation.
  const todayInSaoPaulo = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const completedDailyTopicIds = new Set(
    ((completedSessions ?? []) as CompletedSessionRow[]).flatMap((session) => {
      const completedDailySession = session.topic_id
        && session.signal_snapshot?.origin === "daily_recommendation"
        && session.completed_at
        && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(session.completed_at)) === todayInSaoPaulo;
      return completedDailySession ? [session.topic_id] : [];
    }),
  );
  const readyQuestionTopics = overviewTopics.filter((topic) =>
    (questionCountByTopicId.get(topic.id) ?? 0) > 0
    && !completedDailyTopicIds.has(topic.id)
  );
  for (const topic of readyQuestionTopics) {
    topic.practiceConsistencyGap = hasPracticeConsistencyGap
      && Boolean(topic.lastReviewedAt)
      && (topic.recentAttemptCount ?? 0) === 0;
  }
  const recommendation = recommendPracticeTopic(readyQuestionTopics);
  const studyAction = recommendStudyAction(overviewTopics);
  const selectedTopic = requestedTopicId
    ? overviewTopics.find((topic) => topic.id === requestedTopicId) ?? null
    : recommendation.topic;
  const toPracticeTopic = (topic: PracticeOverviewTopic | null, reason?: PracticeRecommendationReason | null) => {
    if (!topic) return null;
    return {
      ...topic,
      ...(reason ? { reason } : {}),
      questionCount: questionCountByTopicId.get(topic.id) ?? 0,
      flashcardCount: flashcardCountByTopicId.get(topic.id) ?? 0,
      isGenerating: (activeGenerations as GenerationRow[] ?? []).some((row) => row.topic_id === topic.id),
      hasReadyPackage: Boolean(packagesByTopicId.get(topic.id)?.length),
    };
  };
  const flashcardItems = eligibleItemRows.filter((item) => item.item_type === "flashcard");
  const { data: dueSchedules, error: dueSchedulesError } = flashcardItems.length
    ? await supabase
      .from("flashcard_schedules")
      .select("item_id, last_rating, repetitions, lapses")
      .eq("user_id", userId)
      .lte("due_at", new Date().toISOString())
      .in("item_id", flashcardItems.map((item) => item.id))
    : { data: [], error: null };
  if (dueSchedulesError) throw dueSchedulesError;

  const flashcardTopicByItemId = new Map(
    flashcardItems.map((item) => [item.id, topicIdByPackageId.get(item.package_id) ?? null]),
  );
  const dueRows = (dueSchedules ?? []) as ScheduleRow[];
  const isNewFlashcard = (schedule: ScheduleRow) => schedule.last_rating === null && schedule.repetitions === 0 && schedule.lapses === 0;
  const reviewRows = dueRows.filter((schedule) => !isNewFlashcard(schedule));
  const newRows = dueRows.filter((schedule) => {
    if (!isNewFlashcard(schedule)) return false;
    const topicId = flashcardTopicByItemId.get(schedule.item_id);
    return Boolean(topicId && overviewTopics.find((topic) => topic.id === topicId)?.lastReviewedAt);
  });
  const dueTopicIds = new Set(reviewRows.flatMap((schedule) => {
    const topicId = flashcardTopicByItemId.get(schedule.item_id);
    return topicId ? [topicId] : [];
  }));
  const dueFlashcardCountByTopicId = new Map<string, number>();
  for (const schedule of reviewRows) {
    const topicId = flashcardTopicByItemId.get(schedule.item_id);
    if (!topicId) continue;
    dueFlashcardCountByTopicId.set(topicId, (dueFlashcardCountByTopicId.get(topicId) ?? 0) + 1);
  }
  const newTopicIds = new Set(newRows.flatMap((schedule) => {
    const topicId = flashcardTopicByItemId.get(schedule.item_id);
    return topicId ? [topicId] : [];
  }));
  const latestPackageCreatedAtByTopicId = new Map<string, string>();
  for (const packageRow of packageRows) {
    if (!latestPackageCreatedAtByTopicId.has(packageRow.topic_id)) {
      latestPackageCreatedAtByTopicId.set(packageRow.topic_id, packageRow.created_at);
    }
  }
  const activeGenerationTopicIds = new Set(
    ((activeGenerations ?? []) as GenerationRow[]).map((row) => row.topic_id),
  );
  const materialTopics = overviewTopics
    .filter((topic) => Boolean(packagesByTopicId.get(topic.id)?.length) || activeGenerationTopicIds.has(topic.id))
    .map((topic) => ({
      ...toPracticeTopic(topic)!,
      questionCount: questionCountByTopicId.get(topic.id) ?? 0,
      flashcardCount: flashcardCountByTopicId.get(topic.id) ?? 0,
      dueFlashcardCount: dueFlashcardCountByTopicId.get(topic.id) ?? 0,
      latestPackageCreatedAt: latestPackageCreatedAtByTopicId.get(topic.id) ?? null,
      isGenerating: activeGenerationTopicIds.has(topic.id),
      hasReadyPackage: Boolean(packagesByTopicId.get(topic.id)?.length),
    }))
    .sort((left, right) => {
      if (left.latestPackageCreatedAt && right.latestPackageCreatedAt) {
        return right.latestPackageCreatedAt.localeCompare(left.latestPackageCreatedAt);
      }
      if (left.latestPackageCreatedAt) return -1;
      if (right.latestPackageCreatedAt) return 1;
      return left.name.localeCompare(right.name, "pt-BR");
    });

  const firstDueTopicId = reviewRows
    .map((schedule) => flashcardTopicByItemId.get(schedule.item_id))
    .find((topicId): topicId is string => Boolean(topicId));
  const firstDueTopic = firstDueTopicId
    ? overviewTopics.find((topic) => topic.id === firstDueTopicId) ?? null
    : null;

  return {
    scope,
    recommendedTopic: toPracticeTopic(recommendation.topic, recommendation.reason),
    selectedTopic: toPracticeTopic(selectedTopic),
    materialTopics,
    flashcards: { dueCount: reviewRows.length, dueTopicCount: dueTopicIds.size, newCount: newRows.length, newTopicCount: newTopicIds.size },
    studyAction: studyAction.topic
      ? {
        kind: "reviews",
        topic: toPracticeTopic(studyAction.topic),
        reason: studyAction.reason,
      }
      : { kind: "cycle", topic: null, reason: "continue_cycle" },
    dailyRecommendation: reviewRows.length
      ? {
        kind: "flashcards_due",
        count: Math.min(reviewRows.length, 6),
        pendingCount: reviewRows.length,
        topicCount: dueTopicIds.size,
        topic: firstDueTopic ? toPracticeTopic(firstDueTopic, "review_due_today") : undefined,
        reason: "flashcards_due",
        estimatedMinutes: Math.max(2, Math.ceil(Math.min(reviewRows.length, 6) / 3)),
      }
      : recommendation.topic
        ? {
          kind: "questions",
          count: Math.min(questionCountByTopicId.get(recommendation.topic.id) ?? 0, 3),
          pendingCount: questionCountByTopicId.get(recommendation.topic.id) ?? 0,
          topicCount: 1,
          topic: toPracticeTopic(recommendation.topic, recommendation.reason),
          reason: recommendation.reason,
          estimatedMinutes: 2,
        }
        : newRows.length
          ? {
            kind: "flashcards_new",
            count: Math.min(newRows.length, 6),
            pendingCount: newRows.length,
            topicCount: newTopicIds.size,
            topic: (() => {
              const topicId = newRows.map((schedule) => flashcardTopicByItemId.get(schedule.item_id)).find((id): id is string => Boolean(id));
              const topic = topicId ? overviewTopics.find((item) => item.id === topicId) ?? null : null;
              return topic ? toPracticeTopic(topic) : null;
            })(),
            reason: "flashcards_new",
            estimatedMinutes: Math.max(2, Math.ceil(Math.min(newRows.length, 6) / 3)),
          }
          : { kind: "clear", count: 0, pendingCount: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 },
  };
};

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: "Origem não permitida." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json(request, { error: "Sessão obrigatória." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração Supabase ausente.");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(authorization.slice(7));
    if (userError || !userData.user) return json(request, { error: "Sessão inválida." }, 401);

    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return json(request, { error: "Dados de prática inválidos." }, 400);

    return json(request, await getOverview(supabase, userData.user.id, parsed.data.topicId));
  } catch (error) {
    console.error("get-practice-overview failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "Não foi possível carregar sua prática." }, 500);
  }
});
