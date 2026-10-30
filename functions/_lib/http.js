/* =====================================================================
   _lib/http.js — helpers for sending and reading JSON
   ===================================================================== */

/**
 * An error with a message that is SAFE to show to the customer.
 * Throw it from any API route: throw new HttpError(400, 'Please enter your name.')
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Send a JSON response.
 * @param {any} data
 * @param {object} opts  status (default 200), cache = seconds browsers may cache it (default 0)
 */
export function json(data, { status = 200, cache = 0, headers = {} } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache ? `public, max-age=${cache}` : 'no-store',
      ...headers,
    },
  });
}

/** Read a JSON request body (max ~50 KB). Throws a friendly error if it's not valid JSON. */
export async function readJson(request, maxBytes = 50_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request is too large.');
  try {
    const data = JSON.parse(text || '{}');
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new HttpError(400, 'Invalid request.');
  }
}
