import { describe, expect, it } from "vitest";
import { isPgMissingRelation, missingRelationMessage } from "../../server/utils/label-entities";

describe("server/utils/label-entities", () => {
  it("detects missing PostgreSQL relation errors", () => {
    expect(isPgMissingRelation({ code: "42P01" })).toBe(true);
    expect(isPgMissingRelation({ message: 'relation "x" does not exist' })).toBe(true);
    expect(isPgMissingRelation({ code: "23505" })).toBe(false);
    expect(isPgMissingRelation(null)).toBe(false);
  });

  it("builds a stable migration hint per table", () => {
    expect(missingRelationMessage("departments")).toContain("departments");
    expect(missingRelationMessage("job_titles")).toContain("job_titles");
    expect(missingRelationMessage("departments")).toContain("migration_departments_job_titles.sql");
  });
});
