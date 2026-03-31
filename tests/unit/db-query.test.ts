import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockRelease = vi.fn();
  const mockConnect = vi.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  });
  class MockPool {
    connect() {
      return mockConnect();
    }
  }
  return {
    mockQuery,
    mockRelease,
    Pool: MockPool,
  };
});

vi.mock("pg", () => ({
  Pool: hoisted.Pool,
}));

// eslint-disable-next-line import/first -- import après vi.mock (hoisting Vitest)
import { query } from "../../server/utils/db";

describe("server/utils/db query()", () => {
  beforeEach(() => {
    hoisted.mockQuery.mockReset();
    hoisted.mockRelease.mockReset();
  });

  it("retourne les lignes et appelle release dans finally", async () => {
    hoisted.mockQuery.mockResolvedValue({ rows: [{ n: 1 }] });
    const res = await query("SELECT 1");
    expect(res.rows).toEqual([{ n: 1 }]);
    expect(hoisted.mockRelease).toHaveBeenCalledOnce();
  });
});
