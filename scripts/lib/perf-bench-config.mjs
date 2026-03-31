import { parseArgs } from "./perf-bench-args.mjs";

export function resolvePerfBenchCliOptions(argv, env) {
  const args = parseArgs(argv);
  return {
    baseUrl: String(args.base || env.BASE_URL || "http://localhost:8766"),
    email: String(args.email || env.EMAIL || "demo@afrilandfirstbank.com"),
    timeoutMs: Number(args.timeoutMs || env.TIMEOUT_MS || 15000),
    runs: Number(args.runs || env.SSR_RUNS || 1),
    outputDir: String(args.outputDir || env.OUTPUT_DIR || "perf-reports"),
    skipPreflight: Boolean(args.skipPreflight || env.SKIP_PREFLIGHT),
    preflightAttempts: Number(args.preflightAttempts || env.PREFLIGHT_ATTEMPTS || 3),
  };
}

export function buildPerfPreflightUrls(baseUrl, encodedEmail) {
  return [
    `${baseUrl}/api/cards?limit=1&offset=0`,
    `${baseUrl}/api/departments`,
    `${baseUrl}/api/job-titles`,
    `${baseUrl}/?email=${encodedEmail}`,
  ];
}
