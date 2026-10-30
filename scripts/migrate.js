/* =====================================================================
   scripts/migrate.js — set up / update the database by hand
   ---------------------------------------------------------------------
   npm run db:migrate   apply new migrations (the API also does this
                        automatically, so you rarely need this)
   npm run db:reset     LOCAL ONLY: delete local.db and start fresh
   Uses .env.local: with TURSO_DATABASE_URL set it works on the live
   database, otherwise on the local file local.db.
   ===================================================================== */

import fs from 'node:fs';

for (const name of ['.env.local', '.env']) {
  if (!fs.existsSync(name)) continue;
  for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (process.argv.includes('--reset')) {
  if (process.env.TURSO_DATABASE_URL) {
    console.error('Refusing to reset: TURSO_DATABASE_URL is set (that is the LIVE database).');
    process.exit(1);
  }
  for (const f of ['local.db', 'local.db-shm', 'local.db-wal']) fs.rmSync(f, { force: true });
  console.log('Deleted local.db');
}

const { runMigrations } = await import('../lib/migrate.js');
const { db } = await import('../lib/db.js');
console.log(`Database: ${process.env.TURSO_DATABASE_URL ? 'Turso (LIVE)' : 'local.db'}`);
await runMigrations({ log: console.log });
const row = await db.prepare('SELECT COUNT(*) AS n FROM products').first();
console.log(`Done. Products in database: ${row.n}`);
