/* GET /api/orders/track?no=SDSXXXXXX&phone=98xxxxxxxx — one order's status (number AND phone must match) */
import { route } from '../../lib/handler.js';
import { json, HttpError } from '../../lib/http.js';
import { phone as cleanPhone } from '../../lib/validate.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { loadOrder, publicOrder } from '../../lib/orders.js';

export const GET = route(async ({ request, url, db }) => {
  await rateLimit(db, request, 'track', 40, 600);
  const phone = cleanPhone(url.searchParams.get('phone'));
  const full = phone && await loadOrder(db, url.searchParams.get('no'), phone);
  if (!full) throw new HttpError(404, 'No order found with this order number and phone number.');
  return json(publicOrder(full));
});
