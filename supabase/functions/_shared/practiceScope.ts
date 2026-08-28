import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type PracticeScopeStatus = "active" | "no_edital" | "no_active_edital";

export type PracticeActiveScope = {
  status: PracticeScopeStatus;
  subjectIds: string[];
  activeEditalCount: number;
};

type CycleScopeRow = { ciclo_atual: string[] | null };
type EditalScopeRow = {
  merged_into_cycle: boolean | null;
  active_subject_ids: string[] | null;
};

const unique = (values: readonly string[]) => [...new Set(values)];

export const resolvePracticeActiveScope = (
  cycleSubjectIds: readonly string[] | null | undefined,
  editais: readonly EditalScopeRow[],
): PracticeActiveScope => {
  if (!editais.length) {
    return { status: "no_edital", subjectIds: [], activeEditalCount: 0 };
  }

  const cycleIds = unique(cycleSubjectIds ?? []);
  const mergedEditais = editais.filter((edital) => edital.merged_into_cycle === true);
  const activeSubjectIds = new Set(
    mergedEditais.flatMap((edital) => edital.active_subject_ids ?? []),
  );
  const subjectIds = cycleIds.filter((subjectId) => activeSubjectIds.has(subjectId));

  if (!subjectIds.length) {
    return {
      status: "no_active_edital",
      subjectIds: [],
      activeEditalCount: mergedEditais.length,
    };
  }

  return {
    status: "active",
    subjectIds,
    activeEditalCount: mergedEditais.length,
  };
};

export const getActivePracticeScope = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PracticeActiveScope> => {
  const [{ data: cycle, error: cycleError }, { data: editais, error: editaisError }] = await Promise.all([
    supabase
      .from("user_cycles")
      .select("ciclo_atual")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("user_editais")
      .select("merged_into_cycle, active_subject_ids")
      .eq("user_id", userId),
  ]);
  if (cycleError) throw cycleError;
  if (editaisError) throw editaisError;

  return resolvePracticeActiveScope(
    (cycle as CycleScopeRow | null)?.ciclo_atual,
    (editais ?? []) as EditalScopeRow[],
  );
};

export const noActivePracticeScopeMessage =
  "Carregue um edital no Ciclo de Estudos para praticar.";

export const outsidePracticeScopeMessage =
  "Este conteúdo não faz parte do edital carregado no ciclo.";
