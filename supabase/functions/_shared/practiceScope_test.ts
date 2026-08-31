import { resolvePracticeActiveScope } from "./practiceScope.ts";

Deno.test("practice scope ignores material when no edital is loaded in the cycle", () => {
  const scope = resolvePracticeActiveScope(["subject-a"], [
    { merged_into_cycle: false, active_subject_ids: [] },
  ]);

  if (scope.status !== "no_active_edital" || scope.subjectIds.length !== 0) {
    throw new Error("Material fora do ciclo não pode entrar na prática.");
  }
});

Deno.test("practice scope intersects cycle subjects with active edital subjects", () => {
  const scope = resolvePracticeActiveScope(["subject-a", "subject-stale", "subject-a"], [
    { merged_into_cycle: true, active_subject_ids: ["subject-a", "subject-b"] },
    { merged_into_cycle: false, active_subject_ids: ["subject-stale"] },
  ]);

  if (scope.status !== "active" || scope.subjectIds.join(",") !== "subject-a") {
    throw new Error("A prática deve usar apenas a interseção do ciclo com edital ativo.");
  }
});

Deno.test("practice scope distinguishes a student without any edital", () => {
  const scope = resolvePracticeActiveScope([], []);

  if (scope.status !== "no_edital") {
    throw new Error("O estado sem edital precisa ser distinto do ciclo vazio.");
  }
});

Deno.test("practice scope switches exclusively to the newly loaded edital", () => {
  const previousScope = resolvePracticeActiveScope(["subject-a"], [
    { merged_into_cycle: true, active_subject_ids: ["subject-a"] },
    { merged_into_cycle: false, active_subject_ids: ["subject-b"] },
  ]);
  const nextScope = resolvePracticeActiveScope(["subject-b"], [
    { merged_into_cycle: false, active_subject_ids: [] },
    { merged_into_cycle: true, active_subject_ids: ["subject-b"] },
  ]);

  if (previousScope.subjectIds.join(",") !== "subject-a") {
    throw new Error("O escopo anterior deve conter somente o edital carregado anteriormente.");
  }
  if (nextScope.status !== "active" || nextScope.subjectIds.join(",") !== "subject-b") {
    throw new Error("A troca de edital deve remover o escopo anterior e expor somente o novo.");
  }
});
