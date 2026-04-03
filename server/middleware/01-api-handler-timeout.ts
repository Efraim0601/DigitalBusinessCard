import { createError, defineEventHandler, getRequestURL, sendError } from "h3";

/**
 * Si le handler API ne termine pas avant NITRO_HANDLER_TIMEOUT_MS (défaut 2000),
 * réponse HTTP 503 (recommandation rapport DSIT DA-02).
 * Le socket HTTP peut encore être fermé par requestTimeout Node (voir nuxt.config) avec une marge.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api/")) return;

  const res = event.node?.res;
  if (!res || typeof res.once !== "function") return;

  const ms = Math.max(500, Number(process.env.NITRO_HANDLER_TIMEOUT_MS || 2000));

  const timer = setTimeout(() => {
    if (res.headersSent || res.writableEnded) return;
    try {
      sendError(
        event,
        createError({
          statusCode: 503,
          statusMessage: "Request timeout",
          data: { error: "Request timeout" },
        })
      );
    } catch {
      /* réponse déjà engagée ailleurs */
    }
  }, ms);

  const stop = () => clearTimeout(timer);
  res.once("finish", stop);
  res.once("close", stop);
});
