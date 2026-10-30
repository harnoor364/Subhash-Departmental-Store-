/* =====================================================================
   POST /api/quote — price the cart from the database
   Body: { items: { "<id>": qty }, fulfilment: 'delivery'|'pickup', coupon_code, phone }
   Used by the cart drawer and checkout so totals are always the server's.
   ===================================================================== */

import { route } from '../lib/handler.js';
import { json, readJson } from '../lib/http.js';
import { cartItems, phone, oneOf } from '../lib/validate.js';
import { loadSettings } from '../lib/settings.js';
import { quote } from '../lib/pricing.js';

export const POST = route(async ({ request, db }) => {
  const body = await readJson(request);
  const settings = await loadSettings(db);
  const result = await quote(db, {
    items: cartItems(body.items),
    fulfilment: oneOf(body.fulfilment, ['delivery', 'pickup'], 'delivery'),
    coupon_code: body.coupon_code,
    phone: phone(body.phone),
  }, settings);
  return json(result);
});
