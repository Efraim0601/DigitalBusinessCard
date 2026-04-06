import { createEvent } from "h3";
import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendErrorMock } = vi.hoisted(() => ({
  sendErrorMock: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const mod = await importOriginal<typeof import("h3")>();
  return {
    ...mod,
    sendError: sendErrorMock,
  };
});

function apiMiddlewareEvent(path: string) {
  const req = new Request(`http://localhost${path}`);
  const event = createEvent(req);
  const listeners: Record<string, (() => void)[]> = {};
  const resStub = {
    headersSent: false,
    writableEnded: false,
    once: vi.fn((ev: string, cb: () => void) => {
      (listeners[ev] ??= []).push(cb);
      return resStub;
    }),
    emitFinish: () => {
      for (const cb of listeners.finish ?? []) cb();
    },
    emitClose: () => {
      for (const cb of listeners.close ?? []) cb();
    },
  };
  event.node = {
    ...event.node,
    res: resStub as unknown as NonNullable<H3Event["node"]>["res"],
  };
  return { event, res: resStub };
}

describe("server/middleware/01-api-handler-timeout", () => {
  let handler: (event: H3Event) => unknown;

  beforeEach(async () => {
    sendErrorMock.mockReset();
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import("../../server/middleware/01-api-handler-timeout");
    handler = mod.default as (event: H3Event) => unknown;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignore les chemins hors /api/", async () => {
    const { event } = apiMiddlewareEvent("/card");
    const r = await handler(event);
    expect(r).toBeUndefined();
    await vi.runAllTimersAsync();
  });

  it("ne configure pas de timeout si res.once est absent", async () => {
    const req = new Request("http://localhost/api/x");
    const event = createEvent(req);
    event.node = {
      ...event.node,
      res: { headersSent: false } as NonNullable<H3Event["node"]>["res"],
    };
    await handler(event);
    await vi.runAllTimersAsync();
    expect(sendErrorMock).not.toHaveBeenCalled();
  });

  it("503 si la réponse API ne termine pas avant le délai", async () => {
    const prev = process.env.NITRO_HANDLER_TIMEOUT_MS;
    process.env.NITRO_HANDLER_TIMEOUT_MS = "800";
    try {
      const { event } = apiMiddlewareEvent("/api/slow");
      await handler(event);
      await vi.advanceTimersByTimeAsync(799);
      expect(sendErrorMock).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5);
      expect(sendErrorMock).toHaveBeenCalledTimes(1);
      expect(sendErrorMock.mock.calls[0]?.[1]).toMatchObject({ statusCode: 503 });
    } finally {
      if (prev === undefined) delete process.env.NITRO_HANDLER_TIMEOUT_MS;
      else process.env.NITRO_HANDLER_TIMEOUT_MS = prev;
    }
  });

  it("annule le timeout sur finish", async () => {
    const { event, res } = apiMiddlewareEvent("/api/x");
    await handler(event);
    res.emitFinish();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sendErrorMock).not.toHaveBeenCalled();
  });

  it("annule le timeout sur close", async () => {
    const { event, res } = apiMiddlewareEvent("/api/x");
    await handler(event);
    res.emitClose();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sendErrorMock).not.toHaveBeenCalled();
  });

  it("n’appelle pas sendError si les en-têtes sont déjà envoyés", async () => {
    const { event, res } = apiMiddlewareEvent("/api/x");
    res.headersSent = true;
    await handler(event);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sendErrorMock).not.toHaveBeenCalled();
  });
});
