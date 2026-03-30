import { createEvent } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

import {
  deleteLabelById,
  listLabelsPaged,
  readPagedListQuery,
  updateLabelById,
} from "../../server/utils/label-entities";

describe("server/utils/label-entities (requêtes)", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("readPagedListQuery extrait limit, offset et q", () => {
    const ev = createEvent(new Request("http://x/?limit=10&offset=2&q=ab"));
    const p = readPagedListQuery(ev);
    expect(p.limit).toBe(10);
    expect(p.offset).toBe(2);
    expect(p.searchLike).toBe("%ab%");
  });

  it("listLabelsPaged interroge total puis lignes", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 3 }] })
      .mockResolvedValueOnce({ rows: [] });
    const ev = createEvent(new Request("http://x/"));
    const res = await listLabelsPaged("job_titles", readPagedListQuery(ev));
    expect(res.total).toBe(3);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("updateLabelById retourne 400 sans champs", async () => {
    const r = await updateLabelById("departments", "id-1", {}, "nf");
    expect(r).toEqual({ ok: false, status: 400, error: "nothing to update" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("updateLabelById retourne 404 si aucune ligne", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const r = await updateLabelById("departments", "id-1", { label_fr: "x" }, "missing");
    expect(r).toMatchObject({ ok: false, status: 404 });
  });

  it("deleteLabelById retourne 404 si absent", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const r = await deleteLabelById("job_titles", "x", "nf");
    expect(r).toMatchObject({ ok: false, status: 404 });
  });
});
