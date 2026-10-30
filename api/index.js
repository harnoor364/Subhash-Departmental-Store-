/* =====================================================================
   api/index.js — the ONE server function that answers every /api/... URL
   ---------------------------------------------------------------------
   Vercel's free plan allows max 12 functions, and every file in /api
   counts as one. So all routes live in /routes (one file per URL) and
   this file simply sends each request to the right one.

   vercel.json rewrites  /api/<path>  ->  /api?__path=<path>

   TO ADD A NEW API URL: create the file in /routes and add one line to
   ROUTES below, e.g.  'GET reports/monthly': reports.GET,
   ===================================================================== */

import * as settings from '../routes/settings.js';
import * as categories from '../routes/categories.js';
import * as combos from '../routes/combos.js';
import * as banners from '../routes/banners.js';
import * as quote from '../routes/quote.js';
import * as products from '../routes/products/index.js';
import * as product from '../routes/products/item.js';
import * as orders from '../routes/orders/index.js';
import * as track from '../routes/orders/track.js';
import * as history from '../routes/orders/history.js';
import * as utr from '../routes/orders/utr.js';
import * as rzVerify from '../routes/razorpay/verify.js';
import * as rzWebhook from '../routes/razorpay/webhook.js';
import * as enquiries from '../routes/enquiries.js';

// "METHOD path" -> handler.  ":id" matches any one part of the path.
const ROUTES = {
  'GET settings': settings.GET,
  'GET categories': categories.GET,
  'GET combos': combos.GET,
  'GET banners': banners.GET,
  'POST quote': quote.POST,
  'GET products': products.GET,
  'GET products/:id': product.GET,
  'POST orders': orders.POST,
  'GET orders/track': track.GET,
  'GET orders/history': history.GET,
  'POST orders/utr': utr.POST,
  'POST razorpay/verify': rzVerify.POST,
  'POST razorpay/webhook': rzWebhook.POST,
  'POST enquiries': enquiries.POST,
};

/** Find the handler for e.g. GET + "products/toor-dal-1kg". */
function findRoute(method, path) {
  const parts = path.split('/').filter(Boolean);
  for (const [key, handler] of Object.entries(ROUTES)) {
    const [m, pattern] = key.split(' ');
    const p = pattern.split('/');
    if (m === method && p.length === parts.length && p.every((seg, i) => seg.startsWith(':') || seg === parts[i])) {
      return handler;
    }
  }
  return null;
}

async function dispatch(request) {
  const url = new URL(request.url);
  // The path after /api/ — from the rewrite (__path) or the address itself (local server)
  const path = url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\/?/, '');
  url.searchParams.delete('__path');
  const original = new URL(`/api/${path}${url.search}`, url.origin);

  const handler = findRoute(request.method, path);
  if (!handler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }
  return handler(request, original);
}

export const GET = dispatch;
export const POST = dispatch;
