import { describe, expect, it } from "vitest";
import { createConcurrentLimiter } from "../../server/utils/concurrent-limit";

describe("createConcurrentLimiter", () => {
  it("sérialise au-delà du plafond concurrent", async () => {
    const limiter = createConcurrentLimiter(2);
    let concurrent = 0;
    let maxSeen = 0;
    const run = () =>
      limiter.run(async () => {
        concurrent += 1;
        maxSeen = Math.max(maxSeen, concurrent);
        await new Promise((r) => setTimeout(r, 5));
        concurrent -= 1;
      });
    await Promise.all([run(), run(), run(), run()]);
    expect(maxSeen).toBeLessThanOrEqual(2);
  });
});
