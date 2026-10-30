/* POST /api/enquiries — bulk order enquiry: saved for the admin + Telegram alert */
import { route } from '../lib/handler.js';
import { json, readJson, HttpError } from '../lib/http.js';
import { text, phone as cleanPhone } from '../lib/validate.js';
import { rateLimit } from '../lib/ratelimit.js';
import { alertOwner, tg } from '../lib/notify.js';

export const POST = route(async ({ request, db }) => {
  await rateLimit(db, request, 'enquiry', 5, 600);
  const b = await readJson(request);
  if (b.website) throw new HttpError(400, 'Sorry, please try again.'); // honeypot

  const name = text(b.name, 60);
  const phone = cleanPhone(b.phone);
  const items = text(b.items, 2000);
  const occasion = text(b.occasion, 80);
  const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(b.needed_by || '') ? b.needed_by : '';
  if (name.length < 2) throw new HttpError(400, 'Please enter your name.');
  if (!phone) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.');
  if (items.length < 3) throw new HttpError(400, 'Please list what you need.');

  await db.prepare('INSERT INTO enquiries (name, phone, occasion, needed_by, items) VALUES (?, ?, ?, ?, ?)')
    .bind(name, phone, occasion, neededBy, items).run();

  await alertOwner(
    `📦 <b>Bulk order enquiry</b>\n👤 ${tg(name)} — <a href="tel:+91${phone}">${phone}</a>\n${occasion ? `🎉 ${tg(occasion)}\n` : ''}${neededBy ? `📅 Needed by ${neededBy}\n` : ''}\n${tg(items)}`,
    `Bulk enquiry from ${name}`,
  ).catch((err) => console.error(err));

  return json({ ok: true }, { status: 201 });
});
