/* =====================================================================
   lib/handler.js — wraps every API route
   ---------------------------------------------------------------------
   Usage in an /api file:
     export const GET = route(async ({ request, url, db }) => json({...}));
   It:
   - makes sure the database is set up (migrations) before the route runs
   - catches errors: customers get a friendly message, the full error
     goes to the logs (Vercel > project > Logs)
   ===================================================================== */

import { db } from './db.js';
import { ensureMigrated } from './migrate.js';
import { json, HttpError } from './http.js';

export function route(fn) {
  return async function handler(request) {
    try {
      await ensureMigrated();
      return await fn({ request, url: new URL(request.url), db });
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      console.error(`[API ERROR] ${request.method} ${new URL(request.url).pathname}:`, err?.stack || err);
      return json({ error: 'Sorry, something went wrong. Please try again.' }, { status: 500 });
    }
  };
}
