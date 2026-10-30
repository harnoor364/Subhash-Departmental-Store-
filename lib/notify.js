/* =====================================================================
   lib/notify.js — alerts to the store owner
   ---------------------------------------------------------------------
   Telegram (free, instant):  TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
   Email (optional, Resend):  RESEND_API_KEY + ALERT_EMAIL_TO + ALERT_EMAIL_FROM
   If a channel isn't set up, it is skipped (and noted in the logs).
   An alert failing NEVER stops an order from being saved.
   ===================================================================== */

/** Escape text for Telegram's HTML mode. */
export const tg = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Send a message to every chat id in TELEGRAM_CHAT_ID (comma-separated). */
export async function sendTelegram(html) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = String(process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) {
    console.log('[alerts] Telegram not set up — skipped');
    return false;
  }
  let ok = true;
  for (const chat_id of chats) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) { ok = false; console.error('[alerts] Telegram error', res.status, await res.text()); }
    } catch (err) {
      ok = false;
      console.error('[alerts] Telegram failed:', err.message);
    }
  }
  return ok;
}

/** Optional email via resend.com (free tier). */
export async function sendEmail(subject, text) {
  const { RESEND_API_KEY: key, ALERT_EMAIL_TO: to, ALERT_EMAIL_FROM: from } = process.env;
  if (!key || !to || !from) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('[alerts] Email error', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('[alerts] Email failed:', err.message);
    return false;
  }
}

/** Send the same alert on every channel that's set up. */
export async function alertOwner(html, subject) {
  const plain = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  await Promise.all([sendTelegram(html), sendEmail(subject, plain)]);
}

/** Full website address, used for links inside alerts. */
export function siteUrl(request) {
  return (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}
