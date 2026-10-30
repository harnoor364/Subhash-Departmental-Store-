/* =====================================================================
   POST /api/quote — price the cart from the database
   Body: { items: { "<id>": qty }, fulfilment: 'delivery'|'pickup', coupon_code, phone }
   Used by the cart drawer and checkout so totals are always the server's.
   ===================================================================== */

import { json, readJson } from '../_lib/http.js';
import { cartItems, phone, oneOf } from '../_lib/validate.js';
import { loadSettings } from '../_lib/settings.js';
import { quote } from '../_lib/pricing.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const settings = await loadSettings(env);
  const result = await quote(env, {
    items: cartItems(body.items),
    fulfilment: oneOf(body.fulfilment, ['delivery', 'pickup'], 'delivery'),
    coupon_code: body.coupon_code,
    phone: phone(body.phone),
  }, settings);
  return json(result);
}
