/* =====================================================================
   POST /api/razorpay/webhook — Razorpay tells us directly about payments
   A backup for when the customer closes the page before we hear back.
   Set this URL in Razorpay > Account & Settings > Webhooks:
     https://<your-site>/api/razorpay/webhook   events: payment.captured, order.paid
   ===================================================================== */
import { route } from '../../lib/handler.js';
import { json } from '../../lib/http.js';
import { siteUrl } from '../../lib/notify.js';
import { verifyWebhookSignature } from '../../lib/razorpay.js';
import { markRazorpayPaid, alertNewOrder } from '../../lib/orders.js';

export const POST = route(async ({ request, db }) => {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    console.error('[razorpay webhook] invalid signature');
    return json({ error: 'invalid signature' }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const payment = event.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event.event) && payment?.order_id) {
    const paid = await markRazorpayPaid(db, payment.order_id, payment.id, 'razorpay-webhook');
    if (paid) await alertNewOrder(paid, siteUrl(request), '🛒 New PAID order');
  }
  return json({ ok: true });
});
