import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeArchitecture,
  hasArchitectureDrift,
} from "../../scripts/architecture-gate.mjs";

const temporaryDirectories = [];

const emptyBaseline = () => ({
  maxPageLines: 700,
  allowedDirectSupabaseModules: [],
  directSupabaseInUi: [],
  directSupabaseInUtils: [],
  oversizedPages: [],
});

async function createProject(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "vourevisar-architecture-"));
  temporaryDirectories.push(root);

  for (const requiredDirectory of ["src/components", "src/pages", "src/utils"]) {
    await mkdir(path.join(root, requiredDirectory), { recursive: true });
  }

  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("architecture gate", () => {
  it("detecta imports novos do cliente Supabase por alias e caminho relativo", async () => {
    const root = await createProject({
      "src/components/AliasImport.tsx":
        'import { supabase } from "@/integrations/supabase/client";\n',
      "src/pages/RelativeImport.tsx":
        'import { supabase } from "../integrations/supabase/client";\n',
    });

    const result = await analyzeArchitecture(root, emptyBaseline());

    expect(result.directSupabaseInUi.added).toEqual([
      "src/components/AliasImport.tsx",
      "src/pages/RelativeImport.tsx",
    ]);
    expect(hasArchitectureDrift(result)).toBe(true);
  });

  it("aceita modulo de dados co-localizado quando ele esta explicitamente liberado", async () => {
    const allowedPath = "src/components/domain/useDomainData.ts";
    const root = await createProject({
      [allowedPath]:
        'import { supabase } from "@/integrations/supabase/client";\n',
    });
    const baseline = emptyBaseline();
    baseline.allowedDirectSupabaseModules = [allowedPath];

    const result = await analyzeArchitecture(root, baseline);

    expect(result.counts.allowedDirectSupabaseModules).toBe(1);
    expect(result.directSupabaseInUi.added).toEqual([]);
    expect(hasArchitectureDrift(result)).toBe(false);
  });

  it("detecta acesso novo em utils e pagina nova acima do limite", async () => {
    const oversizedPage = Array.from({ length: 701 }, () => "const value = 1;").join(
      "\n",
    );
    const root = await createProject({
      "src/utils/remoteData.ts":
        'import { supabase } from "@/integrations/supabase/client";\n',
      "src/pages/Oversized.tsx": oversizedPage,
    });

    const result = await analyzeArchitecture(root, emptyBaseline());

    expect(result.directSupabaseInUtils.added).toEqual([
      "src/utils/remoteData.ts",
    ]);
    expect(result.oversizedPages.added).toEqual(["src/pages/Oversized.tsx"]);
  });

  it("obriga a reduzir o baseline quando uma divida deixa de existir", async () => {
    const root = await createProject({});
    const baseline = emptyBaseline();
    baseline.directSupabaseInUi = ["src/components/RemovedDebt.tsx"];

    const result = await analyzeArchitecture(root, baseline);

    expect(result.directSupabaseInUi.stale).toEqual([
      "src/components/RemovedDebt.tsx",
    ]);
    expect(hasArchitectureDrift(result)).toBe(true);
  });
});
