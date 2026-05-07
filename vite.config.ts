import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

const getLucideIconMap = () => {
  const entryPath = path.resolve(__dirname, "node_modules/lucide-react/dist/esm/lucide-react.js");
  const source = fs.readFileSync(entryPath, "utf8");
  const iconMap = new Map<string, string>();
  const exportPattern = /export\s+\{([^}]+)\}\s+from\s+'\.\/icons\/([^']+)\.js';/g;

  for (const match of source.matchAll(exportPattern)) {
    const [, specifiers, iconPath] = match;

    for (const specifier of specifiers.split(",")) {
      const aliasMatch = specifier.trim().match(/^default\s+as\s+([A-Za-z0-9_]+)$/);
      if (aliasMatch) {
        iconMap.set(aliasMatch[1], iconPath);
      }
    }
  }

  return iconMap;
};

const lucideIconMap = getLucideIconMap();

const getRechartsExportMap = () => {
  const entryPath = path.resolve(__dirname, "node_modules/recharts/es6/index.js");
  const source = fs.readFileSync(entryPath, "utf8");
  const exportMap = new Map<string, string>();
  const exportPattern = /export\s+\{([^}]+)\}\s+from\s+'\.\/([^']+)';/g;

  for (const match of source.matchAll(exportPattern)) {
    const [, specifiers, exportPath] = match;

    for (const specifier of specifiers.split(",")) {
      const [exportedName] = specifier.trim().split(/\s+as\s+/);
      if (exportedName) {
        exportMap.set(exportedName, exportPath);
      }
    }
  }

  return exportMap;
};

const rechartsExportMap = getRechartsExportMap();

const directLucideImports = () => ({
  name: "direct-lucide-imports",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("/node_modules/") || !id.match(/\.[tj]sx?$/) || !code.includes("lucide-react")) {
      return null;
    }

    let didTransform = false;
    const nextCode = code.replace(
      /import\s+\{([^}]*)\}\s+from\s+["']lucide-react["'];?/g,
      (fullImport, rawSpecifiers: string) => {
        const directImports: string[] = [];
        const typeSpecifiers: string[] = [];
        const fallbackSpecifiers: string[] = [];

        for (const rawSpecifier of rawSpecifiers.split(",")) {
          const specifier = rawSpecifier.trim();
          if (!specifier) continue;

          const isTypeSpecifier = specifier.startsWith("type ");
          const normalizedSpecifier = isTypeSpecifier ? specifier.slice(5).trim() : specifier;
          const [importedName, localName = importedName] = normalizedSpecifier
            .split(/\s+as\s+/)
            .map((part) => part.trim());

          if (isTypeSpecifier || importedName === "LucideIcon") {
            typeSpecifiers.push(localName === importedName ? importedName : `${importedName} as ${localName}`);
            continue;
          }

          const iconPath = lucideIconMap.get(importedName);
          if (iconPath) {
            directImports.push(
              `import ${localName} from "lucide-react/dist/esm/icons/${iconPath}.js";`
            );
          } else {
            fallbackSpecifiers.push(localName === importedName ? importedName : `${importedName} as ${localName}`);
          }
        }

        const imports = [
          ...directImports,
          typeSpecifiers.length ? `import type { ${typeSpecifiers.join(", ")} } from "lucide-react";` : "",
          fallbackSpecifiers.length ? `import { ${fallbackSpecifiers.join(", ")} } from "lucide-react";` : "",
        ].filter(Boolean);

        if (imports.length === 0) {
          return fullImport;
        }

        didTransform = true;
        return imports.join("\n");
      }
    );

    return didTransform ? { code: nextCode, map: null } : null;
  },
});

const directDateFnsImports = () => ({
  name: "direct-date-fns-imports",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("/node_modules/") || !id.match(/\.[tj]sx?$/) || !code.includes("date-fns")) {
      return null;
    }

    let didTransform = false;
    const nextCode = code.replace(
      /import\s+\{([^}]*)\}\s+from\s+["']date-fns["'];?/g,
      (fullImport, rawSpecifiers: string) => {
        const directImports: string[] = [];
        const fallbackSpecifiers: string[] = [];

        for (const rawSpecifier of rawSpecifiers.split(",")) {
          const specifier = rawSpecifier.trim();
          if (!specifier) continue;

          const [importedName, localName = importedName] = specifier
            .split(/\s+as\s+/)
            .map((part) => part.trim());

          if (/^[A-Za-z][A-Za-z0-9]*$/.test(importedName)) {
            directImports.push(`import { ${importedName} as ${localName} } from "date-fns/${importedName}";`);
          } else {
            fallbackSpecifiers.push(localName === importedName ? importedName : `${importedName} as ${localName}`);
          }
        }

        const imports = [
          ...directImports,
          fallbackSpecifiers.length ? `import { ${fallbackSpecifiers.join(", ")} } from "date-fns";` : "",
        ].filter(Boolean);

        if (imports.length === 0) {
          return fullImport;
        }

        didTransform = true;
        return imports.join("\n");
      }
    );

    return didTransform ? { code: nextCode, map: null } : null;
  },
});

const directRechartsImports = () => ({
  name: "direct-recharts-imports",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("/node_modules/") || !id.match(/\.[tj]sx?$/) || !code.includes("recharts")) {
      return null;
    }

    let didTransform = false;
    const nextCode = code.replace(
      /import\s+\{([^}]*)\}\s+from\s+["']recharts["'];?/g,
      (fullImport, rawSpecifiers: string) => {
        const directImports: string[] = [];
        const typeSpecifiers: string[] = [];
        const fallbackSpecifiers: string[] = [];

        for (const rawSpecifier of rawSpecifiers.split(",")) {
          const specifier = rawSpecifier.trim();
          if (!specifier) continue;

          const isTypeSpecifier = specifier.startsWith("type ");
          const normalizedSpecifier = isTypeSpecifier ? specifier.slice(5).trim() : specifier;
          const [importedName, localName = importedName] = normalizedSpecifier
            .split(/\s+as\s+/)
            .map((part) => part.trim());

          const exportPath = rechartsExportMap.get(importedName);
          if (isTypeSpecifier) {
            if (exportPath) {
              typeSpecifiers.push(
                `import type { ${importedName} as ${localName} } from "recharts/es6/${exportPath}";`
              );
            } else {
              fallbackSpecifiers.push(`type ${localName === importedName ? importedName : `${importedName} as ${localName}`}`);
            }
            continue;
          }

          if (exportPath) {
            directImports.push(
              `import { ${importedName} as ${localName} } from "recharts/es6/${exportPath}";`
            );
          } else {
            fallbackSpecifiers.push(localName === importedName ? importedName : `${importedName} as ${localName}`);
          }
        }

        const imports = [
          ...directImports,
          ...typeSpecifiers,
          fallbackSpecifiers.length ? `import { ${fallbackSpecifiers.join(", ")} } from "recharts";` : "",
        ].filter(Boolean);

        if (imports.length === 0) {
          return fullImport;
        }

        didTransform = true;
        return imports.join("\n");
      }
    );

    return didTransform ? { code: nextCode, map: null } : null;
  },
});

const transformProgress = () => ({
  name: "transform-progress",
  enforce: "pre" as const,
  transform(_code: string, id: string) {
    if (process.env.VITE_DEBUG_TRANSFORM === "1" && !id.includes("/node_modules/")) {
      console.info(`[transform] ${id}`);
    }

    return null;
  },
});


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: "node_modules/.vite",
  server: {
    host: "127.0.0.1",
    port: 8081,
    watch: {
      ignored: [
        "**/.git/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/supabase/**",
        "**/test-project/**",
        "**/changelog.html",
        "**/*.sql",
        "**/*.md",
      ],
    },
  },
  plugins: [
    transformProgress(),
    directLucideImports(),
    directDateFnsImports(),
    directRechartsImports(),
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lodash-es": "lodash",
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
      'react-toastify',
    ],
  },
}));
