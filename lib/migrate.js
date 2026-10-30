/* =====================================================================
   lib/migrate.js — keeps the database structure up to date
   ---------------------------------------------------------------------
   Runs every .sql file in /migrations that hasn't run yet, in number
   order (0001_..., 0002_...). Each file runs inside a transaction and is
   recorded in the "_migrations" table so it never runs twice.

   Called automatically by the API (once per server start), so a new
   migration goes live simply by pushing it to GitHub.
   ===================================================================== */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getClient } from './db.js';

const DIR = path.join(process.cwd(), 'migrations');
let done = null;

/** Make sure all migrations have run (cheap after the first call). */
export function ensureMigrated() {
  if (!done) done = runMigrations().catch((err) => { done = null; throw err; });
  return done;
}

export async function runMigrations({ log = () => {} } = {}) {
  const client = await getClient();
  await client.execute(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set((await client.execute('SELECT name FROM _migrations')).rows.map((r) => r[0]));

  const files = (await fs.readdir(DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(DIR, file), 'utf8');
    const statements = splitSql(sql).map((s) => ({ sql: s, args: [] }));
    statements.push({ sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', args: [file, new Date().toISOString()] });
    try {
      await client.batch(statements, 'write');
      log(`✅ applied ${file}`);
    } catch (err) {
      // Another server may have applied it at the same moment — check before failing
      const again = await client.execute({ sql: 'SELECT 1 FROM _migrations WHERE name = ?', args: [file] });
      if (again.rows.length) continue;
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
}

/** Split a .sql file into single statements (comments removed). */
function splitSql(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))   // our SQL files never contain "--" inside text
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
