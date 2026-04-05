import { query } from "./db";

export type AdminLoginRow = { email: string; password_hash: string };

export async function getAdminLoginRow(): Promise<AdminLoginRow | null> {
  try {
    const { rows } = await query<AdminLoginRow>(
      `SELECT email, password_hash FROM admin_login WHERE id = 1 LIMIT 1`
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertAdminLoginRow(email: string, passwordHash: string): Promise<void> {
  await query(
    `INSERT INTO admin_login (id, email, password_hash, updated_at)
     VALUES (1, $1, $2, now())
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       updated_at = now()`,
    [email.trim(), passwordHash]
  );
}
