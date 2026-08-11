import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { getMissingSupabaseDeployEnv } from "./src/integrations/supabase/env";

const validateDeployEnv = (mode: string) => {
  if (mode !== "production") return;

  const env = loadEnv(mode, process.cwd(), "");
  const missing = getMissingSupabaseDeployEnv(env);

  if (missing.length > 0) {
    throw new Error(`Missing required deploy environment variables: ${missing.join(", ")}`);
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  validateDeployEnv(mode);

  return {
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
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash-es": "lodash",
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "@tanstack/react-query",
        "@supabase/supabase-js",
        "framer-motion",
        "lucide-react",
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/")
            ) {
              return "vendor-react";
            }

            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }

            if (
              id.includes("react-router-dom") ||
              id.includes("/node_modules/react-router/") ||
              id.includes("@remix-run/router")
            ) {
              return "vendor-router";
            }

            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }

            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }

            if (id.includes("pdfjs-dist")) {
              return "vendor-pdf";
            }

            if (id.includes("framer-motion") || id.includes("/motion/")) {
              return "vendor-motion";
            }

            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("@phosphor-icons")) {
              return "vendor-ui";
            }

            if (
              id.includes("react-hook-form") ||
              id.includes("@hookform") ||
              id.includes("zod") ||
              id.includes("cmdk") ||
              id.includes("input-otp")
            ) {
              return "vendor-forms";
            }

            if (id.includes("@dnd-kit") || id.includes("react-resizable-panels") || id.includes("react-swipeable")) {
              return "vendor-interactions";
            }

            if (id.includes("quill")) {
              return "vendor-editor";
            }

            if (id.includes("date-fns") || id.includes("crypto-js") || id.includes("lodash")) {
              return "vendor-utils";
            }

            if (id.includes("canvas-confetti") || id.includes("next-themes")) {
              return "vendor-shell";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
