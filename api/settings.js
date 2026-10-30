/* GET /api/settings — public store settings (hours, delivery charges, UPI ID...) */
import { route } from '../lib/handler.js';
import { json } from '../lib/http.js';
import { loadSettings, isStoreOpen } from '../lib/settings.js';
import { razorpayAvailable } from '../lib/razorpay.js';

export const GET = route(async ({ db }) => {
  const s = await loadSettings(db);
  // razorpay_available = keys are set in Vercel AND it isn't switched off in settings
  return json({ ...s, is_open_now: isStoreOpen(s), razorpay_available: razorpayAvailable(s) }, { cache: 30 });
});
