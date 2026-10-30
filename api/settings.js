/* GET /api/settings — public store settings (hours, delivery charges, UPI ID...) */
import { route } from '../lib/handler.js';
import { json } from '../lib/http.js';
import { loadSettings, isStoreOpen } from '../lib/settings.js';

export const GET = route(async ({ db }) => {
  const s = await loadSettings(db);
  return json({ ...s, is_open_now: isStoreOpen(s) }, { cache: 30 });
});
