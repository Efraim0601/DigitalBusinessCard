import { afterEach, describe, expect, it, vi } from "vitest";
import { nextPaint } from "../../app/utils/next-paint";

describe("app/utils/next-paint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enchaîne deux requestAnimationFrame", async () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("requestAnimationFrame", raf);
    await nextPaint();
    expect(raf).toHaveBeenCalledTimes(2);
  });
});
