import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const root = (() => {
  try {
    return fileURLToPath(new URL(".", import.meta.url));
  } catch {
    // Some test runners may evaluate config through virtual URLs.
    return process.cwd();
  }
})();

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~": path.resolve(root, "app"),
      "~~": root,
      "@": path.resolve(root, "app"),
      "#ui/utils": path.resolve(root, "tests/shims/nuxt-ui-utils.ts"),
      "#imports": path.resolve(root, "tests/shims/nuxt-imports.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["tests/setup/h3-globals.ts", "tests/setup/vue-nuxt-globals.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["app/**/*.{ts,vue}", "server/**/*.ts", "scripts/**/*.mjs", "nuxt.config.ts", "vitest.config.ts"],
      exclude: [
        "node_modules/**",
        ".nuxt/**",
        ".output/**",
        "perf-reports/**",
        "tests/**",
        "**/*.d.ts",
      ],
    },
  },
});
