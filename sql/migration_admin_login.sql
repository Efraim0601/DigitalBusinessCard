-- Admin credentials persisted (override env at login).
CREATE TABLE IF NOT EXISTS admin_login (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
