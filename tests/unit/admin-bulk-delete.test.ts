import { describe, expect, it } from "vitest";
import { MAX_BULK_DELETE_IDS, parseBulkDeleteUuids } from "../../server/utils/admin-bulk-delete";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("server/utils/admin-bulk-delete", () => {
  it("expose MAX_BULK_DELETE_IDS", () => {
    expect(MAX_BULK_DELETE_IDS).toBe(500);
  });

  it("refuse corps absent, ids absent ou non-tableau", () => {
    expect(parseBulkDeleteUuids(null).ok).toBe(false);
    expect(parseBulkDeleteUuids(undefined).ok).toBe(false);
    expect(parseBulkDeleteUuids({}).ok).toBe(false);
    expect(parseBulkDeleteUuids({ ids: undefined }).ok).toBe(false);
    expect(parseBulkDeleteUuids({ ids: 42 as unknown as string[] }).ok).toBe(false);
    expect(parseBulkDeleteUuids({ ids: "x" as unknown as string[] }).ok).toBe(false);
    for (const res of [
      parseBulkDeleteUuids(null),
      parseBulkDeleteUuids({ ids: [] }),
      parseBulkDeleteUuids({ ids: ["not-a-uuid"] }),
    ]) {
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.statusCode).toBe(400);
        expect(res.error).toBe("ids must be a non-empty array of UUIDs");
      }
    }
  });

  it("filtre les éléments non-string ou uuid invalide et garde les valides", () => {
    const res = parseBulkDeleteUuids({
      ids: ["bad", VALID_UUID, 3 as unknown as string, null as unknown as string, VALID_UUID],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ids).toEqual([VALID_UUID, VALID_UUID]);
  });

  it("accepte une liste d’UUID valides", () => {
    const res = parseBulkDeleteUuids({ ids: [VALID_UUID] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ids).toEqual([VALID_UUID]);
  });

  it("plafonne le nombre d’ids", () => {
    const res = parseBulkDeleteUuids({
      ids: Array.from({ length: MAX_BULK_DELETE_IDS + 1 }, () => VALID_UUID),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.statusCode).toBe(400);
      expect(res.error).toBe(`Maximum ${MAX_BULK_DELETE_IDS} ids per request`);
    }
  });

  it("accepte exactement MAX_BULK_DELETE_IDS id valides", () => {
    const res = parseBulkDeleteUuids({
      ids: Array.from({ length: MAX_BULK_DELETE_IDS }, () => VALID_UUID),
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ids).toHaveLength(MAX_BULK_DELETE_IDS);
  });
});
