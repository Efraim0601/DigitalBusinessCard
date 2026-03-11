-- Migration: Directions et Titres/Postes (libellés FR + EN).
-- Exécuter une fois : psql -U vcard -d vcard -f sql/migration_departments_job_titles.sql
-- (ou depuis Docker : docker exec -i <postgres_container> psql -U vcard -d vcard < sql/migration_departments_job_titles.sql)

-- Directions / Départements (libellés FR et EN)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Titres / Postes (libellés FR et EN)
CREATE TABLE IF NOT EXISTS job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Références optionnelles sur les cartes (rétrocompatibilité : company/title restent en texte libre si non renseignés)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES job_titles(id) ON DELETE SET NULL;

-- Données initiales (exemples) — exécuter une seule fois ou ignorer si déjà peuplé
INSERT INTO departments (label_fr, label_en)
SELECT * FROM (VALUES
  ('Direction des Risques', 'Risk Directorate'),
  ('Direction Générale', 'General Management'),
  ('Ressources Humaines', 'Human Resources'),
  ('Informatique', 'IT'),
  ('Comptabilité', 'Accounting'),
  ('Finance', 'Finance')
) AS v(label_fr, label_en)
WHERE NOT EXISTS (SELECT 1 FROM departments LIMIT 1);

INSERT INTO job_titles (label_fr, label_en)
SELECT * FROM (VALUES
  ('Ingénieur d''étude', 'Study Engineer'),
  ('Chef de Département', 'Department Head'),
  ('Administrateur Directeur Général', 'Chief Executive Officer'),
  ('Directeur', 'Director'),
  ('Responsable', 'Manager'),
  ('Assistant', 'Assistant'),
  ('Analyste', 'Analyst'),
  ('Conseiller', 'Advisor'),
  ('Chargé de mission', 'Project Officer')
) AS v(label_fr, label_en)
WHERE NOT EXISTS (SELECT 1 FROM job_titles LIMIT 1);

-- Cartes de démonstration (ignorées si l’email existe déjà)
INSERT INTO cards (email, first_name, last_name, company, title, phone, mobile)
VALUES
  ('demo@afrilandfirstbank.com', 'Jean', 'Dupont', 'Direction des Risques', 'Ingénieur d''étude', '222 221 700', '690 000 000'),
  ('contact@afrilandfirstbank.com', 'Marie', 'Martin', 'Ressources Humaines', 'Responsable', '222 221 701', '690 000 001')
ON CONFLICT (email) DO NOTHING;
