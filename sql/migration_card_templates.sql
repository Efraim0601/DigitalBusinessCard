-- Templates de carte : paramètre global (admin) + choix par carte (employé).
-- À exécuter une fois : psql -U vcard -d vcard -f sql/migration_card_templates.sql

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS template_id TEXT;

INSERT INTO app_settings (key, value)
VALUES
  ('allow_user_template', 'false'),
  ('default_template', 'classic')
ON CONFLICT (key) DO NOTHING;
