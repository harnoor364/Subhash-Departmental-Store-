/* =====================================================================
   GET /api/orders/history?phone=98xxxxxxxx&no=SDSXXXXXX
   All orders for a phone number. To protect customers' privacy, the
   caller must also know ONE real order number of that phone (no OTP needed).
   ===================================================================== */
import { route } from '../../lib/handler.js';
import { json, HttpError } from '../../lib/http.js';
import { phone as cleanPhone } from '../../lib/validate.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { loadOrder, loadOrderById, publicOrder } from '../../lib/orders.js';

export const GET = route(async ({ request, url, db }) => {
  await rateLimit(db, request, 'history', 30, 600);
  const phone = cleanPhone(url.searchParams.get('phone'));
  const proof = phone && await loadOrder(db, url.searchParams.get('no'), phone);
  if (!proof) throw new HttpError(404, 'Please enter your mobile number and one of your order numbers.');

  const { results } = await db.prepare('SELECT id FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 20').bind(phone).all();
  const orders = await Promise.all(results.map((r) => loadOrderById(db, r.id)));
  return json(orders.map(publicOrder));
});
