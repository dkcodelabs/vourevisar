import {
  shouldQuarantinePrivateItem,
  shouldRestorePrivateItem,
} from "./practiceQuality.ts";

Deno.test("only a factual-error report quarantines a private item", () => {
  if (!shouldQuarantinePrivateItem(-1, "wrong_answer")) {
    throw new Error("Resposta incorreta precisa retirar o item privado.");
  }
  if (shouldQuarantinePrivateItem(-1, "ambiguous")) {
    throw new Error("Ambiguidade isolada não prova erro factual.");
  }
});

Deno.test("positive undo restores the private item for future selection", () => {
  if (!shouldRestorePrivateItem(1) || shouldRestorePrivateItem(-1)) {
    throw new Error(
      "A restauração deve acontecer apenas na avaliação positiva.",
    );
  }
});
