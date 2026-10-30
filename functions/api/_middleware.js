/* =====================================================================
   api/_middleware.js — runs before EVERY /api/... request
   - Catches errors: customers get a friendly message,
     the full error goes to the Cloudflare logs for you.
   - Adds basic security headers.
   ===================================================================== */

import { json, HttpError } from '../_lib/http.js';

export async function onRequest(context) {
  let response;
  try {
    if (!context.env.DB) throw new Error('D1 binding "DB" is missing — check wrangler.toml / Pages settings.');
    response = await context.next();
  } catch (err) {
    if (err instanceof HttpError) {
      response = json({ error: err.message }, { status: err.status });
    } else {
      // Detailed log for the developer (see: Cloudflare dashboard > Pages > project > Functions > Logs)
      console.error(`[API ERROR] ${context.request.method} ${new URL(context.request.url).pathname}:`, err?.stack || err);
      response = json({ error: 'Sorry, something went wrong. Please try again.' }, { status: 500 });
    }
  }
  response = new Response(response.body, response); // make headers editable
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
