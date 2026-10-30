/* =====================================================================
   lib/db.js — connection to the database (Turso = SQLite in the cloud)
   ---------------------------------------------------------------------
   LIVE (Vercel):  uses the env vars TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
                   (added automatically when you connect Turso in Vercel).
   LOCAL:          if those aren't set, uses a file "local.db" in the
                   project folder — no account needed for testing.

   All queries use "?" placeholders, never string-joining, e.g.
     await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
   Methods:  .all() -> { results: [rows] }   .first() -> row or null
             .run() -> { changes, last_row_id }
   ===================================================================== */

let clientPromise = null;

/** The raw libSQL client (created once and reused). */
export function getClient() {
  if (!clientPromise) clientPromise = createClientForEnv();
  return clientPromise;
}

async function createClientForEnv() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Cloud database: the light "web" driver works everywhere on Vercel
    const { createClient } = await import('@libsql/client/web');
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  if (process.env.VERCEL) {
    throw new Error('Database is not connected: TURSO_DATABASE_URL is missing in Vercel > Settings > Environment Variables.');
  }
  // Local testing: a SQLite file next to package.json
  const { createClient } = await import('@libsql/client');
  return createClient({ url: 'file:local.db' });
}

/** A query with "?" placeholders. */
class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }

  /** Fill in the "?" placeholders (safe against SQL injection). */
  bind(...args) {
    return new Statement(this.sql, args);
  }

  async execute() {
    const client = await getClient();
    return client.execute({ sql: this.sql, args: this.args });
  }

  /** All matching rows: { results: [ {col: value}, ... ] } */
  async all() {
    const r = await this.execute();
    return { results: r.rows.map((row) => toObject(row, r.columns)) };
  }

  /** First matching row, or null. */
  async first() {
    const r = await this.execute();
    return r.rows.length ? toObject(r.rows[0], r.columns) : null;
  }

  /** For INSERT / UPDATE / DELETE. */
  async run() {
    const r = await this.execute();
    return { changes: r.rowsAffected, last_row_id: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null };
  }
}

function toObject(row, columns) {
  const o = {};
  columns.forEach((c, i) => { o[c] = row[i]; });
  return o;
}

/** The database object used by every API route. */
export const db = {
  prepare: (sql) => new Statement(sql),

  /** Run several statements as ONE transaction (all succeed or none do). */
  async batch(statements) {
    const client = await getClient();
    return client.batch(statements.map((s) => ({ sql: s.sql, args: s.args })), 'write');
  },
};
