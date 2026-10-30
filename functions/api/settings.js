/* GET /api/settings — public store settings (hours, delivery charges, UPI ID...) */
import { json } from '../_lib/http.js';
import { loadSettings, isStoreOpen } from '../_lib/settings.js';

export async function onRequestGet({ env }) {
  const s = await loadSettings(env);
  return json({ ...s, is_open_now: isStoreOpen(s) }, { cache: 30 });
}
