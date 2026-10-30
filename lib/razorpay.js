/* =====================================================================
   lib/razorpay.js — online payments with Razorpay
   ---------------------------------------------------------------------
   Turned ON automatically when these env vars are set in Vercel:
     RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   (Razorpay > Account & Settings > API Keys)
     RAZORPAY_WEBHOOK_SECRET                (text you choose when adding the webhook)
   and the setting 'razorpay_enabled' is true (default; can be switched off in admin).

   Flow:
   1. Customer places order  -> we create a Razorpay order for the EXACT total (server price)
   2. Razorpay popup opens   -> customer pays
   3. Browser sends us the payment details -> we check the signature (verifyPayment)
   4. Razorpay ALSO calls our webhook (backup if the customer closes the page early)
   Test keys (rzp_test_...) take fake payments; live keys (rzp_live_...) take real money.
   ===================================================================== */

import crypto from 'node:crypto';

export function razorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Is Razorpay usable right now? (keys set + not switched off in settings) */
export function razorpayAvailable(settings) {
  return razorpayConfigured() && settings.razorpay_enabled !== false;
}

/** Create a Razorpay order. amount in rupees. Returns Razorpay's order object. */
export async function createRazorpayOrder(amountRupees, receipt, notes = {}) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

/** Check the signature Razorpay gives the browser after payment. */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const expected = hmac(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
  return safeEqual(expected, signature);
}

/** Check the signature on a webhook call (raw request body). */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(hmac(rawBody, secret), signature);
}

const hmac = (data, secret) => crypto.createHmac('sha256', secret || '').update(data).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
