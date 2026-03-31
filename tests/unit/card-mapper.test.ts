import { describe, expect, it } from "vitest";
import { mapRowToCard } from "../../server/utils/card-mapper";

describe("server/utils/card-mapper", () => {
  it("maps a row with joins to the public shape", () => {
    const card = mapRowToCard({
      id: "1",
      email: "demo@afrilandfirstbank.com",
      first_name: "Jean",
      last_name: "Dupont",
      company: "Direction des Risques",
      title: "Ingénieur d'étude",
      phone: "222 221 700",
      fax: null,
      mobile: "690 000 000",
      department_id: "dep-1",
      job_title_id: "job-1",
      department_label_fr: "Direction des Risques",
      department_label_en: "Risk Directorate",
      job_title_label_fr: "Ingénieur d'étude",
      job_title_label_en: "Study Engineer",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });

    expect(card).toEqual({
      id: "1",
      email: "demo@afrilandfirstbank.com",
      first_name: "Jean",
      last_name: "Dupont",
      company: "Direction des Risques",
      title: "Ingénieur d'étude",
      phone: "222 221 700",
      fax: null,
      mobile: "690 000 000",
      department_id: "dep-1",
      job_title_id: "job-1",
      department: { label_fr: "Direction des Risques", label_en: "Risk Directorate" },
      job_title: { label_fr: "Ingénieur d'étude", label_en: "Study Engineer" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });

  it("remplit department avec des chaînes vides si une seule étiquette est présente", () => {
    const card = mapRowToCard({
      id: "3",
      email: "p@q.com",
      first_name: null,
      last_name: null,
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      department_id: "d1",
      job_title_id: null,
      department_label_fr: null,
      department_label_en: "Risk",
      job_title_label_fr: null,
      job_title_label_en: null,
      created_at: null,
      updated_at: null,
    });
    expect(card.department).toEqual({ label_fr: "", label_en: "Risk" });
    expect(card.job_title).toBeNull();
  });

  it("remplit job_title avec des chaînes vides pour une seule colonne de libellé", () => {
    const card = mapRowToCard({
      id: "4",
      email: "q@r.com",
      first_name: null,
      last_name: null,
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      department_id: null,
      job_title_id: "j1",
      department_label_fr: null,
      department_label_en: null,
      job_title_label_fr: "Ingénieur",
      job_title_label_en: null,
      created_at: null,
      updated_at: null,
    });
    expect(card.job_title).toEqual({ label_fr: "Ingénieur", label_en: "" });
    expect(card.department).toBeNull();
  });

  it("sets department/job_title to null when ids are missing", () => {
    const card = mapRowToCard({
      id: "2",
      email: "x@y.com",
      first_name: null,
      last_name: null,
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      department_id: null,
      job_title_id: null,
      department_label_fr: "X",
      department_label_en: "Y",
      job_title_label_fr: "A",
      job_title_label_en: "B",
      created_at: null,
      updated_at: null,
    });

    expect(card.department).toBeNull();
    expect(card.job_title).toBeNull();
    expect(card.department_id).toBeNull();
    expect(card.job_title_id).toBeNull();
  });
});

