/* =====================================================================
   lib/handler.js — wraps every API route
   ---------------------------------------------------------------------
   Usage in a /routes file (api/index.js sends requests to it):
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
  // "url" = the original address (/api/products/...), passed in by api/index.js
  return async function handler(request, url = new URL(request.url)) {
    try {
      await ensureMigrated();
      return await fn({ request, url, db });
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      console.error(`[API ERROR] ${request.method} ${new URL(request.url).pathname}:`, err?.stack || err);
      return json({ error: 'Sorry, something went wrong. Please try again.' }, { status: 500 });
    }
  };
}
