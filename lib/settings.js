/* =====================================================================
   lib/settings.js — store settings (Admin > Settings)
   ---------------------------------------------------------------------
   Stored in the "settings" table as key -> JSON value.
   DEFAULTS are used for any key not saved yet, so adding a new setting
   only needs a line here (no database migration).
   Settings are PUBLIC (sent to the browser) — never put secrets here.
   ===================================================================== */

export const DEFAULTS = {
  sample_mode: false,          // shows the yellow "Demo mode" strip
  store_open: true,            // owner's on/off switch
  open_time: '',               // 'HH:MM' 24h, '' = unknown
  close_time: '22:00',
  phone: '',
  whatsapp: '',
  upi_id: '',
  delivery_charge: 30,
  free_delivery_above: 499,
  min_order: 199,
  delivery_pincodes: ['142022'],
  delivery_slots: ['Morning', 'Afternoon', 'Evening'],
  walkthrough_type: 'video',   // video | youtube | 360 | none
  walkthrough_video_url: '',
  walkthrough_poster_url: '',
  walkthrough_youtube_id: '',
  walkthrough_360_url: '',
  walkthrough_hotspots: [],    // [{ pitch, yaw, text, category }]
  google_review_link: '',
  razorpay_enabled: false,
};

/** Load all settings (database values on top of defaults). */
export async function loadSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULTS };
  for (const row of results) {
    try { s[row.key] = JSON.parse(row.value); } catch { /* ignore broken value */ }
  }
  return s;
}

/** Is the store taking orders right now? (Ludhiana time) */
export function isStoreOpen(s, now = new Date()) {
  if (!s.store_open) return false;
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  if (s.close_time && hhmm >= s.close_time) return false;
  if (s.open_time && hhmm < s.open_time) return false;
  return true;
}
