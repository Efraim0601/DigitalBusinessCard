import { Pool } from "pg";

const {
  DATABASE_URL,
  PGHOST = "db",
  PGPORT = "5432",
  PGDATABASE = "vcard",
  PGUSER = "vcard",
  PGPASSWORD = "vcard",
} = process.env;

const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : new Pool({
      host: PGHOST,
      port: Number(PGPORT),
      database: PGDATABASE,
      user: PGUSER,
      password: PGPASSWORD,
    });

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
}

