import { createEvent } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

import {
  deleteLabelById,
  insertLabelPair,
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

  it("readPagedListQuery applique les défauts sans query", () => {
    const ev = createEvent(new Request("http://x/"));
    const p = readPagedListQuery(ev);
    expect(p.limit).toBe(20);
    expect(p.offset).toBe(0);
    expect(p.searchLike).toBeNull();
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

  it("listLabelsPaged fonctionne pour departments", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] });
    const ev = createEvent(new Request("http://x/"));
    await listLabelsPaged("departments", readPagedListQuery(ev));
    expect(queryMock.mock.calls[0]?.[0]).toContain("departments");
  });

  it("insertLabelPair retourne la première ligne", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "n", label_fr: "F", label_en: "E", created_at: "t" }],
    });
    const row = await insertLabelPair("job_titles", "F", "E");
    expect(row).toMatchObject({ id: "n" });
  });

  it("updateLabelById succès avec deux champs", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "1", label_fr: "a", label_en: "b", created_at: "t" }],
    });
    const r = await updateLabelById("departments", "1", { label_fr: "a", label_en: "b" }, "nf");
    expect(r).toEqual(
      expect.objectContaining({
        ok: true,
        row: expect.objectContaining({ id: "1" }),
      })
    );
  });

  it("deleteLabelById succès", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "1" }] });
    const r = await deleteLabelById("departments", "1", "nf");
    expect(r).toEqual({ ok: true });
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
