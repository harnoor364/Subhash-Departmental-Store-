/* =====================================================================
   POST /api/orders — place an order from the checkout page
   Body: { customer: {name, phone, address, landmark, pincode}, fulfilment,
           slot, payment_method: 'razorpay'|'upi'|'cod', notes, coupon_code,
           items: { "<id>": qty }, website (honeypot) }
   Reply: { order }  — plus { razorpay: {...} } when paying online.
   ===================================================================== */

import { route } from '../../lib/handler.js';
import { json, readJson, HttpError } from '../../lib/http.js';
import { loadSettings } from '../../lib/settings.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { siteUrl } from '../../lib/notify.js';
import { createOrder, publicOrder, alertNewOrder } from '../../lib/orders.js';
import { createRazorpayOrder } from '../../lib/razorpay.js';

export const POST = route(async ({ request, db }) => {
  await rateLimit(db, request, 'order', 6, 600); // max 6 orders / 10 min per connection
  const body = await readJson(request);
  const settings = await loadSettings(db);
  const full = await createOrder(db, body, settings);
  const o = full.order;

  // Online payment: create the Razorpay order for the server-calculated total
  if (o.payment_method === 'razorpay') {
    let rz;
    try {
      rz = await createRazorpayOrder(o.total, o.order_no, { order_no: o.order_no, phone: o.phone });
    } catch (err) {
      console.error('[razorpay]', err);
      await db.prepare(`UPDATE orders SET status = 'cancelled', notes = notes || ' [online payment could not start]' WHERE id = ?`).bind(o.id).run();
      throw new HttpError(502, 'Online payment is not available right now. Please choose Cash on Delivery.');
    }
    await db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').bind(rz.id, o.id).run();
    // The owner is alerted once the payment succeeds (see api/razorpay/*)
    return json({
      order: publicOrder(full),
      razorpay: {
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: rz.id,
        amount: rz.amount,
        currency: rz.currency,
        prefill: { name: o.name, contact: '+91' + o.phone },
      },
    }, { status: 201 });
  }

  await alertNewOrder(full, siteUrl(request));
  return json({ order: publicOrder(full) }, { status: 201 });
});
