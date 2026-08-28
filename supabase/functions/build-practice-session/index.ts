import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildPracticeSessionSchema,
  type BuildPracticeSessionInput,
} from "../_shared/practiceContracts.ts";
import {
  selectPracticeItems,
  type SelectablePracticeItem,
} from "../_shared/practiceSessionSelection.ts";
import {
  getActivePracticeScope,
  noActivePracticeScopeMessage,
  outsidePracticeScopeMessage,
} from "../_shared/practiceScope.ts";

type PracticeItemRow = {
  id: string;
  package_id: string;
  item_type: SelectablePracticeItem["itemType"];
  prompt: string;
  options: unknown;
  learning_objective: string | null;
  depth: string | null;
  target_difficulty: string | null;
  created_at: string;
};

type PracticeSessionPayload = {
  id: string;
  mode: string;
  status: string;
  topicId: string | null;
  items: Array<{
    id: string;
    type: SelectablePracticeItem["itemType"];
    prompt: string;
    options: unknown;
    learningObjective: string | null;
    depth: string | null;
    targetDifficulty: string | null;
    position: number;
    servedReason: string;
  }>;
};

const allowedOrigins = (Deno.env.get("PRACTICE_ALLOWED_ORIGINS")
  ?? "http://localhost:8081,http://127.0.0.1:8081,http://localhost:9999,http://127.0.0.1:9999")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins.includes(origin);
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível montar o treino.";
}

async function readSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<PracticeSessionPayload | null> {
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .select("id, mode, status, topic_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data: servedItems, error: servedItemsError } = await supabase
    .from("practice_session_items")
    .select("item_id, position, served_reason")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position");

  if (servedItemsError) throw servedItemsError;
  if (!servedItems?.length) return null;

  const { data: items, error: itemsError } = await supabase
    .from("practice_items")
    .select("id, item_type, prompt, options, learning_objective, depth, target_difficulty")
    .in("id", servedItems.map((item) => item.item_id));

  if (itemsError) throw itemsError;
  const byId = new Map((items as PracticeItemRow[] | null ?? []).map((item) => [item.id, item]));

  const payloadItems = servedItems.flatMap((servedItem) => {
    const item = byId.get(servedItem.item_id);
    if (!item) return [];

    return [{
      id: item.id,
      type: item.item_type,
      prompt: item.prompt,
      options: item.options,
      learningObjective: item.learning_objective,
      depth: item.depth,
      targetDifficulty: item.target_difficulty,
      position: servedItem.position,
      servedReason: servedItem.served_reason,
    }];
  });

  return payloadItems.length === servedItems.length
    ? {
      id: session.id,
      mode: session.mode,
      status: session.status,
      topicId: session.topic_id,
      items: payloadItems,
    }
    : null;
}

async function getOwnedTopic(
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
): Promise<{ id: string; name: string; subjectId: string; subjectName: string } | null> {
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError) throw topicError;
  if (!topic) return null;

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", topic.subject_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (subjectError) throw subjectError;
  if (!subject) return null;

  return { id: topic.id, name: topic.name, subjectId: subject.id, subjectName: subject.name };
}

async function getOwnedSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (subjectError) throw subjectError;
  if (!subject) return null;
  return subject;
}

function servedReason(mode: BuildPracticeSessionInput["mode"], itemId: string, attemptedItemIds: ReadonlySet<string>): string {
  if (mode === "flashcards_due") return "flashcard_due";
  if (mode === "quick") return "quick_recap";
  return attemptedItemIds.has(itemId) ? "spaced_reuse" : "unseen_practice_item";
}

serve(async (request) => {
  if (!isAllowedOrigin(request)) return json(request, { error: "Origem não permitida." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(request, { error: "Sessão obrigatória." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração Supabase ausente.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json(request, { error: "Sessão inválida." }, 401);

    const parsed = buildPracticeSessionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json(request, {
        error: "Dados de treino inválidos.",
        details: parsed.error.issues.map((issue) => issue.message),
      }, 400);
    }

    const input = parsed.data;
    const scope = await getActivePracticeScope(supabase, user.id);
    if (scope.status !== "active") {
      return json(request, { error: noActivePracticeScopeMessage }, 409);
    }

    const existing = await supabase
      .from("practice_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) {
      const session = await readSession(supabase, user.id, existing.data.id);
      if (session) return json(request, { status: "ready", session, reused: true });
    }

    const topic = input.topicId ? await getOwnedTopic(supabase, user.id, input.topicId) : null;
    if (input.topicId && !topic) {
      return json(request, { error: "Tópico não encontrado." }, 404);
    }
    if (topic && !scope.subjectIds.includes(topic.subjectId)) {
      return json(request, { error: outsidePracticeScopeMessage }, 409);
    }

    const subject = input.subjectId
      ? await getOwnedSubject(supabase, user.id, input.subjectId)
      : null;
    if (input.subjectId && !subject) {
      return json(request, { error: "Matéria não encontrada." }, 404);
    }
    if (subject && !scope.subjectIds.includes(subject.id)) {
      return json(request, { error: outsidePracticeScopeMessage }, 409);
    }

    const { data: scopedTopics, error: scopedTopicsError } = await supabase
      .from("topics")
      .select("id, subject_id")
      .in("subject_id", scope.subjectIds)
      .neq("is_active", false);
    if (scopedTopicsError) throw scopedTopicsError;

    const scopedTopicIds = (scopedTopics ?? []).flatMap((item) => {
      if (topic) return item.id === topic.id ? [item.id] : [];
      if (subject) return item.subject_id === subject.id ? [item.id] : [];
      return [item.id];
    });
    if (!scopedTopicIds.length) {
      return json(request, {
        status: "needs_material",
        topicId: input.topicId ?? null,
        reason: "no_package",
      });
    }

    const packageQuery = supabase
      .from("practice_packages")
      .select("id, topic_id")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .in("topic_id", scopedTopicIds);

    const { data: packages, error: packagesError } = await packageQuery;
    if (packagesError) throw packagesError;
    if (!packages?.length) {
      return json(request, {
        status: "needs_material",
        topicId: input.topicId ?? null,
        reason: "no_package",
      });
    }

    const packageTopicById = new Map(packages.map((item) => [item.id, item.topic_id]));
    const { data: databaseItems, error: itemsError } = await supabase
      .from("practice_items")
      .select("id, package_id, item_type, prompt, options, learning_objective, depth, target_difficulty, created_at")
      .in("package_id", packages.map((item) => item.id))
      .eq("status", "private_ready")
      .limit(60);

    if (itemsError) throw itemsError;
    if (!databaseItems?.length) {
      return json(request, {
        status: "needs_material",
        topicId: input.topicId ?? null,
        reason: "no_eligible_item",
      });
    }

    const itemRows = databaseItems as PracticeItemRow[];
    const itemIds = itemRows.map((item) => item.id);
    const [{ data: feedback, error: feedbackError }, { data: attempts, error: attemptsError }] = await Promise.all([
      supabase
        .from("practice_item_feedback")
        .select("item_id")
        .eq("user_id", user.id)
        .eq("rating", -1)
        .in("item_id", itemIds),
      supabase
        .from("practice_attempts")
        .select("item_id")
        .eq("user_id", user.id)
        .is("invalidated_at", null)
        .in("item_id", itemIds),
    ]);
    if (feedbackError) throw feedbackError;
    if (attemptsError) throw attemptsError;

    const hiddenItemIds = new Set((feedback ?? []).map((item) => item.item_id));
    const attemptedItemIds = new Set((attempts ?? []).map((item) => item.item_id));
    const dueAtByItemId = new Map<string, string>();

    if (input.mode === "flashcards_due") {
      const { data: schedules, error: schedulesError } = await supabase
        .from("flashcard_schedules")
        .select("item_id, due_at")
        .eq("user_id", user.id)
        .lte("due_at", new Date().toISOString())
        .in("item_id", itemIds);
      if (schedulesError) throw schedulesError;
      for (const schedule of schedules ?? []) dueAtByItemId.set(schedule.item_id, schedule.due_at);
    }

    const selected = selectPracticeItems({
      mode: input.mode,
      format: input.format,
      quantity: input.quantity,
      attemptedItemIds,
      candidates: itemRows
        .filter((item) => !hiddenItemIds.has(item.id))
        .map((item) => ({
          id: item.id,
          itemType: item.item_type,
          topicId: packageTopicById.get(item.package_id) ?? "",
          createdAt: item.created_at,
          dueAt: dueAtByItemId.get(item.id),
        })),
    });

    if (!selected.length) {
      return json(request, {
        status: "needs_material",
        topicId: input.topicId ?? null,
        reason: input.mode === "flashcards_due" ? "no_due_flashcard" : "no_eligible_item",
      });
    }

    const { data: sessionId, error: sessionCreateError } = await supabase.rpc(
      "create_practice_session_internal",
      {
        p_user_id: user.id,
        p_topic_id: input.topicId ?? null,
        p_mode: input.mode,
        p_idempotency_key: input.idempotencyKey,
        p_signal_snapshot: {
          source: "existing_private_package",
          origin: input.origin,
          requestedMode: input.mode,
          requestedFormat: input.format ?? (input.mode === "flashcards_due" ? "flashcards" : "questions"),
          rescheduleFlashcards: input.origin === "daily_recommendation" && input.mode === "flashcards_due",
          selectedCount: selected.length,
        },
        p_items: selected.map((item, index) => ({
          item_id: item.id,
          position: index + 1,
          served_reason: input.origin === "post_study"
            ? "post_study_reinforcement"
            : servedReason(input.mode, item.id, attemptedItemIds),
        })),
      },
    );
    if (sessionCreateError || !sessionId) throw sessionCreateError ?? new Error("Sessão não criada.");

    const session = await readSession(supabase, user.id, sessionId as string);
    if (!session) throw new Error("Sessão criada sem itens elegíveis.");

    return json(request, {
      status: "ready",
      session,
      reused: false,
    });
  } catch (error) {
    console.error("build-practice-session failed", safeError(error));
    return json(request, { error: "Não foi possível montar o treino. Tente novamente." }, 500);
  }
});
