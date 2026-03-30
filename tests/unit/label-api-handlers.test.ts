import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const queryMock = vi.fn();

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: vi.fn(),
}));

import {
  labelsDeleteHandler,
  labelsListHandler,
  labelsPostHandler,
  labelsPutHandler,
} from "../../server/utils/label-api-handlers";

function evt(req: Request) {
  return testH3Event(req);
}

describe("server/utils/label-api-handlers", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("labelsListHandler pagine et recherche", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            label_fr: "A",
            label_en: "B",
            created_at: "t",
          },
        ],
      });
    const handler = labelsListHandler("departments");
    const request = new Request("http://localhost/?limit=2&offset=0&q=test");
    const res = await handler(evt(request));
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("labelsPostHandler crée un libellé", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "x",
          label_fr: "Fr",
          label_en: "En",
          created_at: "t",
        },
      ],
    });
    const handler = labelsPostHandler("job_titles");
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label_fr: " Fr ", label_en: " En " }),
    });
    const row = await handler(evt(request));
    expect(row).toMatchObject({ id: "x", label_fr: "Fr", label_en: "En" });
  });

  it("labelsPostHandler 400 si libellés vides", async () => {
    const handler = labelsPostHandler("departments");
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label_fr: " ", label_en: "" }),
    });
    const e = evt(request);
    const res = await handler(e);
    expect(res).toEqual({ error: "label_fr and label_en are required" });
  });

  it("labelsPutHandler 400 sans id", async () => {
    const handler = labelsPutHandler("departments", "nope");
    const request = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ label_fr: "a" }),
    });
    const e = evt(request);
    const res = await handler(e);
    expect(res).toEqual({ error: "id is required" });
  });

  it("labelsPutHandler met à jour et retourne la ligne", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          label_fr: "a",
          label_en: "b",
          created_at: "t",
        },
      ],
    });
    const handler = labelsPutHandler("departments", "missing");
    const request = new Request("http://localhost/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label_fr: "a" }),
    });
    const e = evt(request);
    e.context.params = { id: "1" };
    const row = await handler(e);
    expect(row).toMatchObject({ id: "1" });
  });

  it("labelsDeleteHandler supprime avec succès", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "1" }] });
    const handler = labelsDeleteHandler("job_titles", "missing");
    const e = evt(new Request("http://localhost/", { method: "DELETE" }));
    e.context.params = { id: "1" };
    const res = await handler(e);
    expect(res).toEqual({ success: true });
  });

  it("labelsPostHandler 503 si table PostgreSQL absente", async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('relation "x" does not exist'), { code: "42P01" }));
    const handler = labelsPostHandler("departments");
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label_fr: "a", label_en: "b" }),
    });
    const res = await handler(evt(request));
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("departments"),
      })
    );
  });

  it("labelsPostHandler propage une erreur non liaison", async () => {
    queryMock.mockRejectedValueOnce(new Error("disk full"));
    const handler = labelsPostHandler("departments");
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label_fr: "a", label_en: "b" }),
    });
    await expect(handler(evt(request))).rejects.toThrow("disk full");
  });

  it("labelsPutHandler 404 si enregistrement introuvable", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const handler = labelsPutHandler("job_titles", "Introuvable");
    const e = evt(
      new Request("http://localhost/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_fr: "x" }),
      })
    );
    e.context.params = { id: "bad" };
    const res = await handler(e);
    expect(res).toEqual({ error: "Introuvable" });
  });

  it("labelsPutHandler met à jour label_en seul", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "1", label_fr: "a", label_en: "z", created_at: "t" }],
    });
    const handler = labelsPutHandler("departments", "x");
    const e = evt(
      new Request("http://localhost/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_en: "z" }),
      })
    );
    e.context.params = { id: "1" };
    const row = await handler(e);
    expect(row).toMatchObject({ label_en: "z" });
  });

  it("labelsDeleteHandler 400 sans id", async () => {
    const handler = labelsDeleteHandler("departments", "nf");
    const res = await handler(evt(new Request("http://localhost/", { method: "DELETE" })));
    expect(res).toEqual({ error: "id is required" });
  });

  it("labelsDeleteHandler 404 si déjà supprimé", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const handler = labelsDeleteHandler("departments", "gone");
    const e = evt(new Request("http://localhost/", { method: "DELETE" }));
    e.context.params = { id: "1" };
    const res = await handler(e);
    expect(res).toEqual({ error: "gone" });
  });
});
