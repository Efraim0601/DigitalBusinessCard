import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const queryMock = vi.fn();

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: vi.fn(),
}));

import depDelete from "../../server/api/departments/[id].delete";
import depGet from "../../server/api/departments/index.get";
import depPost from "../../server/api/departments/index.post";
import depPut from "../../server/api/departments/[id].put";
import jtDelete from "../../server/api/job-titles/[id].delete";
import jtGet from "../../server/api/job-titles/index.get";
import jtPost from "../../server/api/job-titles/index.post";
import jtPut from "../../server/api/job-titles/[id].put";

describe("server/api label routes (exports)", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("exécute un GET departments via le module route", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] });
    const res = await depGet(testH3Event(new Request("http://localhost/")));
    expect(res.items).toEqual([]);
  });

  it("exécute un GET job_titles via le module route", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] });
    const res = await jtGet(testH3Event(new Request("http://localhost/")));
    expect(res.total).toBe(0);
  });

  it("exécute POST / PUT / DELETE via les chemins Nitro", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "1", label_fr: "a", label_en: "b", created_at: "t" }],
    });
    const postRes = await depPost(
      testH3Event(
        new Request("http://localhost/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label_fr: "a", label_en: "b" }),
        })
      )
    );
    expect(postRes).toMatchObject({ id: "1" });

    queryMock.mockResolvedValueOnce({
      rows: [{ id: "1", label_fr: "a", label_en: "c", created_at: "t" }],
    });
    const putEv = testH3Event(
      new Request("http://localhost/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_en: "c" }),
      })
    );
    putEv.context.params = { id: "1" };
    await depPut(putEv);

    queryMock.mockResolvedValueOnce({ rows: [{ id: "1" }] });
    const delEv = testH3Event(new Request("http://localhost/", { method: "DELETE" }));
    delEv.context.params = { id: "1" };
    await depDelete(delEv);

    queryMock.mockResolvedValueOnce({
      rows: [{ id: "2", label_fr: "x", label_en: "y", created_at: "t" }],
    });
    await jtPost(
      testH3Event(
        new Request("http://localhost/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label_fr: "x", label_en: "y" }),
        })
      )
    );

    queryMock.mockResolvedValueOnce({
      rows: [{ id: "2", label_fr: "x", label_en: "z", created_at: "t" }],
    });
    const jtPutEv = testH3Event(
      new Request("http://localhost/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_en: "z" }),
      })
    );
    jtPutEv.context.params = { id: "2" };
    await jtPut(jtPutEv);

    queryMock.mockResolvedValueOnce({ rows: [{ id: "2" }] });
    const jtDelEv = testH3Event(new Request("http://localhost/", { method: "DELETE" }));
    jtDelEv.context.params = { id: "2" };
    await jtDelete(jtDelEv);
  });
});
