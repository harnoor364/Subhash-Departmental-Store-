/* =====================================================================
   POST /api/orders/utr — customer paid by UPI and gives the reference (UTR)
   Body: { order_no, phone, utr }
   The order becomes "payment_submitted" until the owner checks the bank
   app and verifies it in the admin panel.
   ===================================================================== */
import { route } from '../../lib/handler.js';
import { json, readJson, HttpError } from '../../lib/http.js';
import { phone as cleanPhone } from '../../lib/validate.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { alertOwner, siteUrl, tg } from '../../lib/notify.js';
import { loadOrder, publicOrder } from '../../lib/orders.js';

export const POST = route(async ({ request, db }) => {
  await rateLimit(db, request, 'utr', 10, 600);
  const body = await readJson(request);
  const phone = cleanPhone(body.phone);
  const utr = String(body.utr || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,22}$/.test(utr)) throw new HttpError(400, 'Please enter the reference number from your UPI app.');

  const full = phone && await loadOrder(db, body.order_no, phone);
  if (!full) throw new HttpError(404, 'Order not found.');
  const o = full.order;
  if (o.payment_method !== 'upi' || !['awaiting_payment', 'payment_submitted'].includes(o.status)) {
    throw new HttpError(400, 'This order is not waiting for a UPI payment.');
  }

  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`UPDATE orders SET utr = ?, status = 'payment_submitted', payment_status = 'submitted', updated_at = ? WHERE id = ?`)
      .bind(utr, now, o.id),
    db.prepare(`INSERT INTO order_events (order_id, status, note, by_user, at) VALUES (?, 'payment_submitted', ?, 'customer', ?)`)
      .bind(o.id, `UTR ${utr}`, now),
  ]);

  await alertOwner(
    `💰 <b>UPI payment submitted — ${tg(o.order_no)}</b>\n👤 ${tg(o.name)} — ${tg(o.phone)}\nAmount: <b>₹${o.total}</b>\nUTR: <code>${tg(utr)}</code>\nCheck your bank/UPI app, then verify in admin:\n🔗 ${tg(siteUrl(request))}/admin/order?no=${tg(o.order_no)}`,
    `UPI payment submitted ${o.order_no} – ₹${o.total}`,
  ).catch((err) => console.error(err));

  return json(publicOrder(await loadOrder(db, o.order_no, phone)));
});
