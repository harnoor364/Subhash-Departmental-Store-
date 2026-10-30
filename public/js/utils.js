/* =====================================================================
   utils.js — small helper functions used on every page
   ===================================================================== */

/** Escape text before putting it into HTML (prevents broken layout / XSS). */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a number as Indian rupees: 1234.5 -> "₹1,234.50", 1234 -> "₹1,234" */
function rupees(amount) {
  const n = Number(amount) || 0;
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return CONFIG.currency + n.toLocaleString(CONFIG.locale, {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Read a value from the page URL, e.g. ?c=masale -> qp('c') === 'masale' */
function qp(name) {
  return new URLSearchParams(location.search).get(name) || '';
}

/** Wait until the user stops typing before running fn. */
function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Current time in Ludhiana as "HH:MM" (works even if the phone's clock zone differs). */
function istTimeHHMM(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CONFIG.timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

/** "22:00" -> "10:00 PM" */
function prettyTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

/**
 * Is the store taking orders right now?
 * Closed if the owner switched it off, or it's after closing time,
 * or (if an opening time is set) before opening time.
 */
function isStoreOpen(settings) {
  if (!settings.store_open) return false;
  const now = istTimeHHMM();
  if (settings.close_time && now >= settings.close_time) return false;
  if (settings.open_time && now < settings.open_time) return false;
  return true;
}

/** Text like "Open till 10 PM" or "Open 9 AM – 10 PM" */
function hoursText(settings) {
  const close = prettyTime(settings.close_time);
  if (settings.open_time) return `Open ${prettyTime(settings.open_time)} – ${close}`;
  return `Open till ${close}`;
}

/** Keep only digits; return a 10-digit Indian mobile number or '' */
function cleanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

/** WhatsApp link (or '' if no number set yet). */
function whatsappLink(number, text = '') {
  const n = String(number || '').replace(/\D/g, '');
  if (!n) return '';
  const full = n.length === 10 ? '91' + n : n;
  return `https://wa.me/${full}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

/** Percentage saved, e.g. mrp 100 price 85 -> 15 */
function percentOff(mrp, price) {
  return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
}

/* ---------- Order status names (used by track, my orders, success pages) ---------- */
const ORDER_STATUS = {
  awaiting_payment: 'Waiting for UPI payment',
  payment_submitted: 'Payment submitted – being verified',
  new: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  ready_for_pickup: 'Ready for pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Coloured status badge. */
function statusPill(status) {
  const cls = status === 'delivered' ? 'ok' : status === 'cancelled' ? 'bad' : '';
  return `<span class="status-pill ${cls}">${esc(ORDER_STATUS[status] || status)}</span>`;
}

/** Step-by-step progress list for an order. */
function statusTimeline(order) {
  if (order.status === 'cancelled') {
    return `<div class="alert alert-danger mb-0"><i class="bi bi-x-circle"></i> This order was cancelled.</div>`;
  }
  const steps = ['new', 'confirmed', 'packed', order.fulfilment === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery', 'delivered'];
  // Payment statuses count as the first step
  const current = Math.max(0, steps.indexOf(order.status));
  return `<ol class="timeline">${steps.map((s, i) => `
    <li class="${i < current ? 'done' : i === current ? 'current' : ''}">
      <span class="dot">${i < current ? '<i class="bi bi-check"></i>' : ''}</span>
      ${i === 0 && order.status !== 'new' && current === 0 ? esc(ORDER_STATUS[order.status]) : esc(ORDER_STATUS[s])}
    </li>`).join('')}</ol>`;
}

/** "29 Oct, 7:45 PM" in Ludhiana time */
function prettyDate(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: CONFIG.timeZone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}
