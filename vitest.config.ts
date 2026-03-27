import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      exclude: [
        "node_modules/**",
        ".nuxt/**",
        ".output/**",
        "perf-reports/**",
      ],
    },
  },
});

