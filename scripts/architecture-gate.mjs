import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSION = /\.(?:ts|tsx)$/;
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx)$/;
const SUPABASE_CLIENT_IMPORT =
  /(?:\bfrom\s*|\bimport\s*)["'][^"']*integrations\/supabase\/client(?:\.[^"']*)?["']/;

const normalizePath = (value) => value.split(path.sep).join("/");

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
      continue;
    }

    if (SOURCE_EXTENSION.test(entry.name) && !TEST_FILE.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function lineCount(source) {
  const lines = source.split(/\r?\n/);
  return source.endsWith("\n") ? lines.length - 1 : lines.length;
}

function compareToBaseline(currentValues, baselineValues) {
  const current = new Set(currentValues);
  const baseline = new Set(baselineValues);

  return {
    added: [...current].filter((value) => !baseline.has(value)).sort(),
    stale: [...baseline].filter((value) => !current.has(value)).sort(),
  };
}

async function findDirectSupabaseImports(rootDirectory, relativeDirectories) {
  const matches = [];

  for (const relativeDirectory of relativeDirectories) {
    const absoluteDirectory = path.join(rootDirectory, relativeDirectory);
    const files = await listSourceFiles(absoluteDirectory);

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (SUPABASE_CLIENT_IMPORT.test(source)) {
        matches.push(normalizePath(path.relative(rootDirectory, file)));
      }
    }
  }

  return matches.sort();
}

async function findOversizedPages(rootDirectory, maxPageLines) {
  const pagesDirectory = path.join(rootDirectory, "src/pages");
  const files = await listSourceFiles(pagesDirectory);
  const oversized = [];

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;

    const source = await readFile(file, "utf8");
    if (lineCount(source) > maxPageLines) {
      oversized.push(normalizePath(path.relative(rootDirectory, file)));
    }
  }

  return oversized.sort();
}

export async function analyzeArchitecture(rootDirectory, baseline) {
  const directSupabaseInUi = await findDirectSupabaseImports(rootDirectory, [
    "src/components",
    "src/pages",
  ]);
  const allowedModules = new Set(baseline.allowedDirectSupabaseModules);
  const uiDebt = directSupabaseInUi.filter((file) => !allowedModules.has(file));
  const directSupabaseInUtils = await findDirectSupabaseImports(rootDirectory, [
    "src/utils",
  ]);
  const oversizedPages = await findOversizedPages(
    rootDirectory,
    baseline.maxPageLines,
  );

  return {
    counts: {
      allowedDirectSupabaseModules: directSupabaseInUi.length - uiDebt.length,
      directSupabaseInUi: uiDebt.length,
      directSupabaseInUtils: directSupabaseInUtils.length,
      oversizedPages: oversizedPages.length,
    },
    directSupabaseInUi: compareToBaseline(
      uiDebt,
      baseline.directSupabaseInUi,
    ),
    directSupabaseInUtils: compareToBaseline(
      directSupabaseInUtils,
      baseline.directSupabaseInUtils,
    ),
    oversizedPages: compareToBaseline(
      oversizedPages,
      baseline.oversizedPages,
    ),
  };
}

function printPaths(label, paths) {
  if (paths.length === 0) return;
  console.error(`\n${label}`);
  for (const file of paths) console.error(`- ${file}`);
}

export function hasArchitectureDrift(result) {
  return [
    result.directSupabaseInUi,
    result.directSupabaseInUtils,
    result.oversizedPages,
  ].some(({ added, stale }) => added.length > 0 || stale.length > 0);
}

function printReport(result) {
  console.log("Architecture baseline");
  console.log(
    `- Supabase direto permitido em modulos de dados: ${result.counts.allowedDirectSupabaseModules}`,
  );
  console.log(
    `- Supabase direto na UI (baseline): ${result.counts.directSupabaseInUi}`,
  );
  console.log(
    `- Supabase direto em utils (baseline): ${result.counts.directSupabaseInUtils}`,
  );
  console.log(`- Paginas acima do limite: ${result.counts.oversizedPages}`);

  printPaths(
    "Novos acessos diretos ao Supabase na UI:",
    result.directSupabaseInUi.added,
  );
  printPaths(
    "Itens removidos que ainda constam no baseline de UI:",
    result.directSupabaseInUi.stale,
  );
  printPaths(
    "Novos acessos diretos ao Supabase em utils:",
    result.directSupabaseInUtils.added,
  );
  printPaths(
    "Itens removidos que ainda constam no baseline de utils:",
    result.directSupabaseInUtils.stale,
  );
  printPaths("Novas paginas acima do limite:", result.oversizedPages.added);
  printPaths(
    "Paginas reduzidas que ainda constam no baseline:",
    result.oversizedPages.stale,
  );
}

async function runCli() {
  const mode = process.argv[2];
  if (mode !== "--report" && mode !== "--check") {
    console.error("Uso: node scripts/architecture-gate.mjs --report|--check");
    process.exitCode = 2;
    return;
  }

  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const rootDirectory = path.resolve(scriptDirectory, "..");
  const baseline = JSON.parse(
    await readFile(path.join(scriptDirectory, "architecture-baseline.json"), "utf8"),
  );
  const result = await analyzeArchitecture(rootDirectory, baseline);
  printReport(result);

  if (mode === "--check" && hasArchitectureDrift(result)) {
    console.error(
      "\nQuality gate arquitetural falhou. Corrija a regressao ou atualize o baseline apos revisao.",
    );
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  await runCli();
}
