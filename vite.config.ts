import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
      "react-toastify",
    ],
  },
}));
