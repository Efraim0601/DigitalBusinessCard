import { createEvent } from "h3";
import type { H3Event } from "h3";
import { vi } from "vitest";

/** createEvent(Request) ne fournit pas toujours node.res ; requis pour setResponseStatus en tests. */
export function testH3Event(req: Request): H3Event {
  const event = createEvent(req);
  const res = {
    statusCode: 200,
    statusMessage: "OK",
    setHeader: vi.fn(),
    getHeader: vi.fn(),
  };
  const node = event.node ?? ({} as NonNullable<H3Event["node"]>);
  event.node = {
    ...node,
    res: res as NonNullable<H3Event["node"]>["res"],
  };
  return event;
}
