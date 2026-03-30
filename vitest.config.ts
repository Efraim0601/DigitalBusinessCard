import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~": path.resolve(root, "app"),
      "~~": root,
      "@": path.resolve(root, "app"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["app/**/*.{ts,vue}", "server/**/*.ts"],
      exclude: [
        "node_modules/**",
        ".nuxt/**",
        ".output/**",
        "perf-reports/**",
        "tests/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
    },
  },
});
