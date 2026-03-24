/**
 * Performance benchmark (latence + erreurs) for Cardyo.
 *
 * Usage:
 *   BASE_URL=http://localhost:8766 EMAIL=demo@afrilandfirstbank.com node scripts/perf-bench.mjs
 *   node scripts/perf-bench.mjs --base http://localhost:8766 --email demo@afrilandfirstbank.com --runs 2
 *
 * Outputs:
 *   perf-reports/perf-report-<timestamp>.json
 *   perf-reports/perf-report-<timestamp>.md
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function fmtMs(x) {
  if (x == null || Number.isNaN(x)) return "n/a";
  return `${x.toFixed(2)}ms`;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function timedRequest(url, { timeoutMs, method = "GET" }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        // reduce variability; keep it simple
        accept: "application/json,text/html,*/*",
      },
    });
    const bodyBuf = await res.arrayBuffer().catch(() => new ArrayBuffer(0));
    const end = performance.now();
    return {
      ok: res.ok,
      status: res.status,
      ms: end - start,
      bytes: bodyBuf.byteLength,
      error: null,
    };
  } catch (e) {
    const end = performance.now();
    return {
      ok: false,
      status: 0,
      ms: end - start,
      bytes: 0,
      error: {
        name: e?.name || "Error",
        message: e?.message || "",
      },
    };
  } finally {
    clearTimeout(t);
  }
}

async function runScenario({ name, url, total, concurrency, warmup, timeoutMs }) {
  // Warmup sequentially (helps reduce cold spikes)
  for (let i = 0; i < warmup; i++) {
    await timedRequest(url, { timeoutMs }).catch(() => {});
  }

  const times = [];
  const bytes = [];
  const statusCounts = new Map();
  const errorCounts = new Map();
  const sampleErrors = [];

  let idx = 0;
  async function worker() {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= total) return;
      const r = await timedRequest(url, { timeoutMs });
      times.push(r.ms);
      bytes.push(r.bytes);
      statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1);
      if (!r.ok) {
        const key = r.error?.name || "Error";
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
        if (sampleErrors.length < 8) {
          sampleErrors.push({
            at: myIdx,
            status: r.status,
            ms: r.ms,
            error: r.error,
          });
        }
      }
    }
  }

  const start = performance.now();
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const end = performance.now();

  const sorted = times.slice().sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);

  const okCount = [...statusCounts.entries()].reduce((acc, [status, c]) => acc + (status >= 200 && status < 300 ? c : 0), 0);
  const errCount = total - okCount;

  const topStatuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topErrors = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return {
    name,
    url,
    total,
    concurrency,
    warmup,
    timeoutMs,
    durationMs: end - start,
    stats: {
      avgMs: avg,
      p50Ms: percentile(sorted, 50),
      p90Ms: percentile(sorted, 90),
      p95Ms: percentile(sorted, 95),
      p99Ms: percentile(sorted, 99),
      p999Ms: percentile(sorted, 99.9),
      okCount,
      errCount,
      avgBytes: bytes.reduce((a, b) => a + b, 0) / Math.max(1, bytes.length),
    },
    topStatuses,
    topErrors,
    sampleErrors,
  };
}

async function preflightCheck(urls, { timeoutMs, attempts }) {
  for (const url of urls) {
    let last = null;
    for (let i = 0; i < attempts; i++) {
      const r = await timedRequest(url, { timeoutMs });
      last = r;
      if (r.ok) break;
      // small backoff to avoid hammering on startup
      await new Promise((res) => setTimeout(res, 250));
    }
    // timedRequest never throws, so ok is the only success signal
    if (!last?.ok) return { ok: false, url, lastErr: last };
  }
  return { ok: true };
}

function renderMarkdownReport(meta, results) {
  const header = `# Cardyo Performance Report

Generated: ${meta.generatedAt}
Node: ${meta.node}
Base URL: ${meta.baseUrl}
Email: ${meta.email}
Timeout: ${meta.timeoutMs}ms
`;

  const lines = [];
  for (const r of results) {
    const s = r.stats;
    lines.push(
      `\n## ${r.name}
- URL: ${r.url}
- Total: ${r.total} | Concurrency: ${r.concurrency} | Warmup: ${r.warmup}
- Duration: ${fmtMs(r.durationMs)}
- Errors: ${s.errCount}/${r.total}
- Latency: p50 ${fmtMs(s.p50Ms)} | p95 ${fmtMs(s.p95Ms)} | p99 ${fmtMs(s.p99Ms)} | p99.9 ${fmtMs(s.p999Ms)}
`
    );
    if (r.sampleErrors?.length) {
      lines.push(`- Sample errors: \n${r.sampleErrors.map((e) => `  - ${e.error?.name || "Error"} (${e.status}) at #${e.at}: ${e.error?.message || ""}`).join("\n")}\n`);
    }
  }

  return header + lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = String(args.base || process.env.BASE_URL || "http://localhost:8766");
  const email = String(args.email || process.env.EMAIL || "demo@afrilandfirstbank.com");
  const timeoutMs = Number(args.timeoutMs || process.env.TIMEOUT_MS || 15000);
  const runs = Number(args.runs || process.env.SSR_RUNS || 1);
  const outputDir = String(args.outputDir || process.env.OUTPUT_DIR || "perf-reports");
  const skipPreflight = Boolean(args.skipPreflight || process.env.SKIP_PREFLIGHT);
  const preflightAttempts = Number(args.preflightAttempts || process.env.PREFLIGHT_ATTEMPTS || 3);

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = nowStamp();
  const reportJsonPath = path.join(outputDir, `perf-report-${stamp}.json`);
  const reportMdPath = path.join(outputDir, `perf-report-${stamp}.md`);

  const encodedEmail = encodeURIComponent(email);
  const cardByEmail = `${baseUrl}/api/cards?email=${encodedEmail}`;

  if (!skipPreflight) {
    const checkUrls = [
      `${baseUrl}/api/cards?limit=1&offset=0`,
      `${baseUrl}/api/departments`,
      `${baseUrl}/api/job-titles`,
      `${baseUrl}/?email=${encodedEmail}`,
    ];
    console.log(`Preflight check (${preflightAttempts} attempts each)...`);
    const pre = await preflightCheck(checkUrls, { timeoutMs: Math.min(5000, timeoutMs), attempts: preflightAttempts });
    if (!pre.ok) {
      console.error(`Preflight failed: server not reachable/healthy for ${pre.url}`);
      if (pre.lastErr?.error) console.error(pre.lastErr.error);
      process.exit(2);
    }
  }

  const scenarios = [
    {
      name: "API cards by email (conc=10, total=300)",
      url: cardByEmail,
      total: 300,
      concurrency: 10,
      warmup: 20,
    },
    {
      name: "API cards by email (conc=30, total=300)",
      url: cardByEmail,
      total: 300,
      concurrency: 30,
      warmup: 20,
    },
    {
      name: "API cards by email stress (conc=50, total=400)",
      url: cardByEmail,
      total: 400,
      concurrency: 50,
      warmup: 20,
    },
    {
      name: "API cards list (limit=50, conc=20, total=200)",
      url: `${baseUrl}/api/cards?limit=50&offset=0`,
      total: 200,
      concurrency: 20,
      warmup: 20,
    },
    {
      name: "API departments (conc=20, total=200)",
      url: `${baseUrl}/api/departments`,
      total: 200,
      concurrency: 20,
      warmup: 20,
    },
    {
      name: "API job titles (conc=20, total=200)",
      url: `${baseUrl}/api/job-titles`,
      total: 200,
      concurrency: 20,
      warmup: 20,
    },
    // SSR runs (repeat to observe cache variability)
    {
      name: "SSR home without email (conc=10, total=60)",
      url: `${baseUrl}/`,
      total: 60,
      concurrency: 10,
      warmup: 10,
    },
  ];

  const results = [];

  for (const s of scenarios) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runScenario({ ...s, timeoutMs });
    results.push(r);
    console.log(
      `[${r.name}] err=${r.stats.errCount}/${r.total}, p95=${fmtMs(r.stats.p95Ms)}, p99=${fmtMs(r.stats.p99Ms)}`
    );
  }

  for (let run = 1; run <= runs; run++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runScenario({
      name: `SSR home with email (run ${run}/${runs}, conc=20, total=120)`,
      url: `${baseUrl}/?email=${encodedEmail}`,
      total: 120,
      concurrency: 20,
      warmup: 20,
      timeoutMs,
    });
    results.push(r);
    console.log(
      `[${r.name}] err=${r.stats.errCount}/${r.total}, p95=${fmtMs(r.stats.p95Ms)}, p99=${fmtMs(r.stats.p99Ms)}`
    );
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    baseUrl,
    email,
    timeoutMs,
    runs: { ssrWithEmail: runs },
  };

  const payload = {
    meta,
    results,
  };

  fs.writeFileSync(reportJsonPath, JSON.stringify(payload, null, 2), "utf8");
  const md = renderMarkdownReport(meta, results);
  fs.writeFileSync(reportMdPath, md, "utf8");

  console.log("\n=== Benchmark completed ===");
  console.log(`JSON report: ${reportJsonPath}`);
  console.log(`MD report:   ${reportMdPath}`);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});

