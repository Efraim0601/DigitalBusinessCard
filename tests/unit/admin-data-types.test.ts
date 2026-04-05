import { describe, expect, it } from "vitest";
import { isUuid } from "../../server/utils/admin-data-types";

describe("admin-data-types isUuid", () => {
  it("accepte un UUID v4 classique", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejette les chaînes invalides", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716")).toBe(false);
  });
});
