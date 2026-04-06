import { type PoolClient, Pool } from "pg";

const {
  DATABASE_URL,
  PGHOST = "db",
  PGPORT = "5432",
  PGDATABASE = "vcard",
  PGUSER = "vcard",
  PGPASSWORD = "vcard",
} = process.env;

const POOL_MAX = Math.min(100, Math.max(1, Number(process.env.PG_POOL_MAX || 20)));

/** Millisecondes, bornées : évite l’interpolation SQL (hotspot analyse statique) et toute valeur non numérique. */
const STATEMENT_TIMEOUT_MS_MIN = 500;
const STATEMENT_TIMEOUT_MS_MAX = 86_400_000; // 24 h
function clampStatementTimeoutMs(envValue: string | undefined, fallback: number): number {
  const raw = Number(envValue ?? fallback);
  const n = Math.floor(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(STATEMENT_TIMEOUT_MS_MAX, Math.max(STATEMENT_TIMEOUT_MS_MIN, n));
}

const statementTimeoutMs = clampStatementTimeoutMs(process.env.PG_STATEMENT_TIMEOUT_MS, 2000);

const poolOptions = {
  max: POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10_000),
};

const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ...poolOptions })
  : new Pool({
      host: PGHOST,
      port: Number(PGPORT),
      database: PGDATABASE,
      user: PGUSER,
      password: PGPASSWORD,
      ...poolOptions,
    });

pool.on("connect", (client) => {
  client
    .query("SET statement_timeout = $1", [statementTimeoutMs])
    .catch((err: unknown) => {
      console.error("[db] SET statement_timeout:", err);
    });
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

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

