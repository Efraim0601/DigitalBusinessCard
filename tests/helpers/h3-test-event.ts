import { createEvent } from "h3";
import type { H3Event } from "h3";
import { vi } from "vitest";

/** createEvent(Request) ne fournit pas toujours node.res ; requis pour setResponseStatus en tests. */
export function testH3Event(req: Request): H3Event {
  const event = createEvent(req) as H3Event;
  const res = {
    statusCode: 200,
    statusMessage: "OK",
    setHeader: vi.fn(),
    getHeader: vi.fn(),
  };
  event.node = {
    ...event.node,
    res: res as any,
  } as H3Event["node"];
  return event;
}
