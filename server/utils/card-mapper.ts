export type CardJoinRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  fax: string | null;
  mobile: string | null;
  department_id?: string | null;
  job_title_id?: string | null;
  template_id?: string | null;
  department_label_fr?: string | null;
  department_label_en?: string | null;
  job_title_label_fr?: string | null;
  job_title_label_en?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const cardWithJoinsFields = `
  c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.phone, c.fax, c.mobile,
  c.department_id, c.job_title_id, c.template_id,
  c.created_at, c.updated_at,
  d.label_fr AS department_label_fr, d.label_en AS department_label_en,
  j.label_fr AS job_title_label_fr, j.label_en AS job_title_label_en
`;

export function mapRowToCard(r: CardJoinRow) {
  return {
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    company: r.company,
    title: r.title,
    phone: r.phone,
    fax: r.fax,
    mobile: r.mobile,
    department_id: r.department_id ?? null,
    job_title_id: r.job_title_id ?? null,
    template_id: r.template_id ?? null,
    department:
      r.department_id && (r.department_label_fr != null || r.department_label_en != null)
        ? { label_fr: r.department_label_fr ?? "", label_en: r.department_label_en ?? "" }
        : null,
    job_title:
      r.job_title_id && (r.job_title_label_fr != null || r.job_title_label_en != null)
        ? { label_fr: r.job_title_label_fr ?? "", label_en: r.job_title_label_en ?? "" }
        : null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  };
}

