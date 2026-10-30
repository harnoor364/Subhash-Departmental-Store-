/* =====================================================================
   POST /api/razorpay/verify — browser reports a finished Razorpay payment
   Body: { order_no, phone, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   We check Razorpay's signature with our secret key before trusting it.
   ===================================================================== */
import { route } from '../../lib/handler.js';
import { json, readJson, HttpError } from '../../lib/http.js';
import { phone as cleanPhone } from '../../lib/validate.js';
import { siteUrl } from '../../lib/notify.js';
import { verifyPaymentSignature } from '../../lib/razorpay.js';
import { loadOrder, publicOrder, markRazorpayPaid, alertNewOrder } from '../../lib/orders.js';

export const POST = route(async ({ request, db }) => {
  const body = await readJson(request);
  const phone = cleanPhone(body.phone);
  const full = phone && await loadOrder(db, body.order_no, phone);
  if (!full || !full.order.razorpay_order_id || full.order.razorpay_order_id !== body.razorpay_order_id) {
    throw new HttpError(404, 'Order not found.');
  }
  if (!verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    console.error('[razorpay] bad signature for', full.order.order_no);
    throw new HttpError(400, 'We could not confirm this payment. If money was deducted, please contact the store.');
  }

  const paid = await markRazorpayPaid(db, body.razorpay_order_id, String(body.razorpay_payment_id).slice(0, 40), 'customer');
  if (paid) await alertNewOrder(paid, siteUrl(request), '🛒 New PAID order');
  return json(publicOrder(paid || await loadOrder(db, full.order.order_no, phone)));
});
