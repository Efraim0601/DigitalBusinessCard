import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

import {
  loadAdminExportRows,
  loadCardsSimplifiedExportRows,
  loadDepartmentsExportRows,
  loadJobTitlesExportRows,
} from "../../server/utils/admin-export-data";

describe("admin-export-data", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  describe("loadDepartmentsExportRows", () => {
    it("retourne les lignes mappées", async () => {
      queryMock.mockResolvedValueOnce({
        rows: [
          { label_fr: "Direction A", label_en: "Dept A" },
          { label_fr: "B", label_en: "B EN" },
        ],
      });
      const rows = await loadDepartmentsExportRows();
      expect(rows).toEqual([
        { label_fr: "Direction A", label_en: "Dept A" },
        { label_fr: "B", label_en: "B EN" },
      ]);
      expect(String(queryMock.mock.calls[0][0])).toContain("FROM departments");
    });
  });

  describe("loadJobTitlesExportRows", () => {
    it("retourne les lignes mappées", async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{ label_fr: "Chef", label_en: "Chief" }],
      });
      const rows = await loadJobTitlesExportRows();
      expect(rows).toEqual([{ label_fr: "Chef", label_en: "Chief" }]);
      expect(String(queryMock.mock.calls[0][0])).toContain("FROM job_titles");
    });
  });

  describe("loadAdminExportRows", () => {
    it("charge départements, titres et cartes avec relations", async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ id: "d1", label_fr: "D", label_en: "D EN" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: "j1", label_fr: "J", label_en: "J EN" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "c1",
              email: "a@b.com",
              first_name: "A",
              last_name: "B",
              company: null,
              title: "T",
              phone: null,
              fax: null,
              mobile: null,
              department_id: "d1",
              job_title_id: "j1",
            },
          ],
        });

      const bundle = await loadAdminExportRows();
      expect(bundle.departments).toHaveLength(1);
      expect(bundle.job_titles).toHaveLength(1);
      expect(bundle.cards).toEqual([
        {
          id: "c1",
          email: "a@b.com",
          first_name: "A",
          last_name: "B",
          company: null,
          title: "T",
          phone: null,
          fax: null,
          mobile: null,
          department_id: "d1",
          job_title_id: "j1",
        },
      ]);
      expect(queryMock).toHaveBeenCalledTimes(3);
    });

    it("fallback cartes sans department_id si la requête relations échoue", async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("missing column"))
        .mockResolvedValueOnce({
          rows: [
            {
              id: "c2",
              email: "x@y.com",
              first_name: null,
              last_name: null,
              company: "C",
              title: null,
              phone: null,
              fax: null,
              mobile: "1",
            },
          ],
        });

      const bundle = await loadAdminExportRows();
      expect(bundle.cards).toEqual([
        {
          id: "c2",
          email: "x@y.com",
          first_name: null,
          last_name: null,
          company: "C",
          title: null,
          phone: null,
          fax: null,
          mobile: "1",
          department_id: null,
          job_title_id: null,
        },
      ]);
      expect(queryMock).toHaveBeenCalledTimes(4);
    });
  });

  describe("loadCardsSimplifiedExportRows", () => {
    it("requête avec jointures : poste depuis jf, Direction depuis df", async () => {
      queryMock.mockResolvedValueOnce({
        rows: [
          {
            email: "u1@x.com",
            first_name: "Jean",
            last_name: "D",
            mobile: "6 12",
            title: "Ignored",
            jf: "  Analyste  ",
            df: "  Finance  ",
          },
        ],
      });
      const rows = await loadCardsSimplifiedExportRows();
      expect(rows).toEqual([
        {
          "N°": 1,
          email: "u1@x.com",
          first_name: "Jean",
          last_name: "D",
          mobile: "6 12",
          poste: "Analyste",
          poste_fr: "Analyste",
          poste_en: "",
          Direction: "Finance",
          direction_fr: "Finance",
          direction_en: "",
        },
      ]);
    });

    it("utilise title pour poste si jf absent", async () => {
      queryMock.mockResolvedValueOnce({
        rows: [
          {
            email: "u2@x.com",
            first_name: null,
            last_name: null,
            mobile: null,
            title: "Directeur",
            jf: null,
            df: null,
          },
        ],
      });
      const rows = await loadCardsSimplifiedExportRows();
      expect(rows[0].poste).toBe("Directeur");
      expect(rows[0].Direction).toBe("");
    });

    it("plusieurs lignes incrémente N°", async () => {
      queryMock.mockResolvedValueOnce({
        rows: [
          { email: "a@a.com", first_name: "", last_name: "", mobile: "", title: "", jf: "", df: "" },
          { email: "b@b.com", first_name: null, last_name: null, mobile: null, title: null, jf: null, df: null },
        ],
      });
      const rows = await loadCardsSimplifiedExportRows();
      expect(rows[0]["N°"]).toBe(1);
      expect(rows[1]["N°"]).toBe(2);
    });

    it("fallback sans jointures si la première requête échoue", async () => {
      queryMock
        .mockRejectedValueOnce(new Error("join fail"))
        .mockResolvedValueOnce({
          rows: [
            {
              email: "legacy@x.com",
              first_name: "L",
              last_name: null,
              mobile: null,
              title: "Titre seul",
            },
          ],
        });
      const rows = await loadCardsSimplifiedExportRows();
      expect(rows).toEqual([
        {
          "N°": 1,
          email: "legacy@x.com",
          first_name: "L",
          last_name: "",
          mobile: "",
          poste: "Titre seul",
          poste_fr: "",
          poste_en: "",
          Direction: "",
          direction_fr: "",
          direction_en: "",
        },
      ]);
      expect(queryMock).toHaveBeenCalledTimes(2);
    });
  });
});
