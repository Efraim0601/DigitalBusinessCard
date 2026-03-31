import { fmtMs } from "./perf-bench-stats.mjs";

export function renderMarkdownReport(meta, results) {
  const header = `# vcard Performance Report

Generated: ${meta.generatedAt}
Node: ${meta.node}
Base URL: ${meta.baseUrl}
Email: ${meta.email}
Timeout: ${meta.timeoutMs}ms
`;

  const lines = [];
  for (const r of results) {
    const s = r.stats;
    const sampleErrors =
      r.sampleErrors?.length
        ? `- Sample errors: \n${r.sampleErrors
            .map((e) => {
              const name = e.error?.name || "Error";
              const message = e.error?.message || "";
              return `  - ${name} (${e.status}) at #${e.at}: ${message}`;
            })
            .join("\n")}\n`
        : "";
    lines.push(
      `\n## ${r.name}
- URL: ${r.url}
- Total: ${r.total} | Concurrency: ${r.concurrency} | Warmup: ${r.warmup}
- Duration: ${fmtMs(r.durationMs)}
- Errors: ${s.errCount}/${r.total}
- Latency: p50 ${fmtMs(s.p50Ms)} | p95 ${fmtMs(s.p95Ms)} | p99 ${fmtMs(s.p99Ms)} | p99.9 ${fmtMs(s.p999Ms)}
${sampleErrors}`
    );
  }

  return header + lines.join("\n");
}
