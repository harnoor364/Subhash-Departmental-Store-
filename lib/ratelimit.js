/* =====================================================================
   lib/ratelimit.js — stop bots and abuse
   ---------------------------------------------------------------------
   Counts requests per key (e.g. 'order:<ip address>') in a time window,
   using the rate_limits table. Over the limit -> friendly 429 error.

   Example: await rateLimit(db, request, 'order', 5, 600)
            = max 5 orders per 10 minutes from one internet connection.
   ===================================================================== */

import { HttpError } from './http.js';

/** The visitor's IP address (Vercel puts it in x-forwarded-for). */
export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || request.headers.get('x-real-ip') || 'local';
}

export async function rateLimit(db, request, action, limit, windowSeconds) {
  const key = `${action}:${clientIp(request)}`;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count    = CASE WHEN reset_at < ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at < ? THEN ? ELSE reset_at END
    RETURNING count`)
    .bind(key, now + windowSeconds, now, now, now + windowSeconds).first();

  if (row && row.count > limit) {
    throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  }
}
