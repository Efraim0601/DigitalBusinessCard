import { afterEach, describe, expect, it } from "vitest";
import {
  getLabelListCached,
  invalidateLabelListCache,
  setLabelListCached,
} from "../../server/utils/label-list-cache";

describe("label-list-cache", () => {
  afterEach(() => {
    invalidateLabelListCache("departments");
    invalidateLabelListCache("job_titles");
  });

  it("retourne la payload mise en cache puis null après invalidation", () => {
    setLabelListCached("departments", 20, 0, { items: [], total: 0 });
    expect(getLabelListCached("departments", 20, 0)).toEqual({ items: [], total: 0 });
    invalidateLabelListCache("departments");
    expect(getLabelListCached("departments", 20, 0)).toBeNull();
  });

  it("sépare les clés par offset", () => {
    setLabelListCached("job_titles", 10, 0, { page: 1 });
    setLabelListCached("job_titles", 10, 10, { page: 2 });
    expect(getLabelListCached("job_titles", 10, 0)).toEqual({ page: 1 });
    expect(getLabelListCached("job_titles", 10, 10)).toEqual({ page: 2 });
    invalidateLabelListCache("job_titles");
  });
});
