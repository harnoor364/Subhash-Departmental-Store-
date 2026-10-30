/* =====================================================================
   lib/orders.js — creating, loading and updating orders
   ---------------------------------------------------------------------
   createOrder()  checks the form, prices the cart from the DATABASE,
                  saves order + items + history in one transaction,
                  then alerts the owner (Telegram / email).
   Prices sent by the browser are ignored — only ids and quantities count.
   ===================================================================== */

import crypto from 'node:crypto';
import { HttpError } from './http.js';
import { text, phone as cleanPhone, cartItems, oneOf } from './validate.js';
import { isStoreOpen } from './settings.js';
import { quote } from './pricing.js';
import { alertOwner, tg } from './notify.js';
import { razorpayAvailable } from './razorpay.js';

const PAYMENT_TEXT = { razorpay: 'Online (Razorpay)', upi: 'UPI to store', cod: 'Cash on Delivery', pickup_cod: 'Pay at Store' };

/** Order number like SDS7K2M9Q (no 0/O/1/I so it's easy to read out on the phone). */
function newOrderNo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return 'SDS' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** Check and clean the checkout form. Throws a friendly error if something is wrong. */
function readCheckout(body, settings) {
  if (body.website) throw new HttpError(400, 'Sorry, the order could not be placed.'); // honeypot (bots fill it)

  const c = body.customer || {};
  const name = text(c.name, 60);
  const phone = cleanPhone(c.phone);
  if (name.length < 2) throw new HttpError(400, 'Please enter your name.');
  if (!phone) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.');

  const fulfilment = oneOf(body.fulfilment, ['delivery', 'pickup'], 'delivery');
  let address = '', landmark = '', pincode = '';
  if (fulfilment === 'delivery') {
    address = text(c.address, 200);
    landmark = text(c.landmark, 80);
    pincode = text(c.pincode, 6);
    if (address.length < 5) throw new HttpError(400, 'Please enter your house no. and street / colony.');
    if (!/^\d{6}$/.test(pincode)) throw new HttpError(400, 'Please enter a valid 6-digit pincode.');
    // Empty list = deliver to any pincode
    if (settings.delivery_pincodes.length && !settings.delivery_pincodes.includes(pincode)) {
      throw new HttpError(400, `Sorry, we don't deliver to ${pincode} yet. We deliver to: ${settings.delivery_pincodes.join(', ')}. Please choose Store pickup.`);
    }
  }

  const slot = settings.delivery_slots.includes(body.slot) ? body.slot : (settings.delivery_slots[0] || '');

  const allowed = ['cod'];
  if (settings.upi_id) allowed.push('upi');
  if (razorpayAvailable(settings)) allowed.push('razorpay');
  const payment_method = body.payment_method;
  if (!allowed.includes(payment_method)) throw new HttpError(400, 'Please choose a payment method.');

  return {
    name, phone, address, landmark, pincode, fulfilment, slot, payment_method,
    notes: text(body.notes, 300),
    coupon_code: text(body.coupon_code, 20).toUpperCase(),
    items: cartItems(body.items),
    source: text(body.source, 40),
  };
}

/** Create the order. Returns { order, items }. */
export async function createOrder(db, body, settings) {
  const f = readCheckout(body, settings);

  const q = await quote(db, { items: f.items, fulfilment: f.fulfilment, coupon_code: f.coupon_code, phone: f.phone }, settings);
  if (q.errors.length) throw new HttpError(400, q.errors[0]);
  if (f.coupon_code && q.coupon_error) throw new HttpError(400, q.coupon_error);

  const now = new Date().toISOString();
  const afterHours = isStoreOpen(settings) ? 0 : 1;
  // Online & UPI orders wait for payment; COD / pay-at-store orders are "new" straight away
  const status = f.payment_method === 'cod' ? 'new' : 'awaiting_payment';

  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNo = newOrderNo();
    const statements = [
      db.prepare(`INSERT INTO orders (order_no, phone, name, address, landmark, pincode, fulfilment, slot, notes,
          status, payment_method, subtotal, mrp_total, coupon_code, coupon_discount, delivery_charge, total,
          after_hours, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(orderNo, f.phone, f.name, f.address, f.landmark, f.pincode, f.fulfilment, f.slot, f.notes,
          status, f.payment_method, q.subtotal, q.mrp_total, q.coupon_code, q.coupon_discount, q.delivery_charge,
          q.total, afterHours, f.source, now, now),
      ...q.lines.map((l) => db.prepare(`INSERT INTO order_items (order_id, item_id, name, weight, mrp, price, qty, line_total)
          VALUES ((SELECT id FROM orders WHERE order_no = ?), ?, ?, ?, ?, ?, ?, ?)`)
        .bind(orderNo, l.cart_id, l.name, l.weight, l.mrp, l.price, l.qty, l.line_total)),
      db.prepare(`INSERT INTO order_events (order_id, status, note, by_user, at)
          VALUES ((SELECT id FROM orders WHERE order_no = ?), ?, 'Order placed on website', 'customer', ?)`)
        .bind(orderNo, status, now),
      // Remember the customer (name/address are updated to the latest ones)
      db.prepare(`INSERT INTO customers (phone, name, address, landmark, pincode, orders_count, total_spent, first_order_at, last_order_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            name = excluded.name,
            address  = CASE WHEN excluded.address  != '' THEN excluded.address  ELSE customers.address  END,
            landmark = CASE WHEN excluded.address  != '' THEN excluded.landmark ELSE customers.landmark END,
            pincode  = CASE WHEN excluded.pincode  != '' THEN excluded.pincode  ELSE customers.pincode  END,
            orders_count = customers.orders_count + 1,
            total_spent  = customers.total_spent + excluded.total_spent,
            last_order_at = excluded.last_order_at`)
        .bind(f.phone, f.name, f.address, f.landmark, f.pincode, q.total, now, now),
    ];
    if (q.coupon_code) {
      statements.push(db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').bind(q.coupon_code));
    }

    try {
      await db.batch(statements); // all or nothing
    } catch (err) {
      if (/UNIQUE/i.test(err.message) && /order_no/i.test(err.message)) continue; // rare: same number twice, try again
      throw err;
    }
    return loadOrder(db, orderNo, f.phone);
  }
  throw new Error('Could not create a unique order number');
}

/** Load an order with its items and history. Both order number AND phone must match. */
export async function loadOrder(db, orderNo, phone) {
  const order = await db.prepare('SELECT * FROM orders WHERE order_no = ? AND phone = ?')
    .bind(String(orderNo || '').trim().toUpperCase(), phone).first();
  if (!order) return null;
  return withDetails(db, order);
}

export async function loadOrderById(db, id) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return order ? withDetails(db, order) : null;
}

async function withDetails(db, order) {
  const [{ results: items }, { results: events }] = await Promise.all([
    db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all(),
    db.prepare('SELECT status, note, at FROM order_events WHERE order_id = ? ORDER BY id').bind(order.id).all(),
  ]);
  return { order, items, events };
}

/**
 * What the CUSTOMER may see about their order (no full address, no internal notes).
 * Same shape the website pages use.
 */
export function publicOrder({ order: o, items, events }) {
  return {
    order_no: o.order_no,
    created_at: o.created_at,
    status: o.status,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    fulfilment: o.fulfilment,
    slot: o.slot,
    after_hours: !!o.after_hours,
    utr: o.utr,
    customer: { name: o.name, phone: o.phone },
    lines: items.map((i) => ({ cart_id: i.item_id, name: i.name, weight: i.weight, qty: i.qty, price: i.price, line_total: i.line_total })),
    item_count: items.reduce((a, i) => a + i.qty, 0),
    subtotal: o.subtotal,
    coupon_code: o.coupon_code,
    coupon_discount: o.coupon_discount,
    delivery_charge: o.delivery_charge,
    total: o.total,
    history: events.map((e) => ({ status: e.status, at: e.at })),
  };
}

/** Telegram / email message about a new order. */
export function orderAlert({ order: o, items }, site, title = '🛒 New order') {
  const pay = o.payment_method === 'cod' && o.fulfilment === 'pickup' ? PAYMENT_TEXT.pickup_cod : PAYMENT_TEXT[o.payment_method];
  const payState = o.payment_status === 'paid' ? '✅ PAID' : o.payment_method === 'cod' ? 'collect on delivery/pickup' : 'not paid yet';
  const lines = [
    `<b>${tg(title)} ${tg(o.order_no)}</b>`,
    `👤 ${tg(o.name)} — <a href="tel:+91${tg(o.phone)}">${tg(o.phone)}</a>`,
    o.fulfilment === 'pickup'
      ? `🏪 Store pickup · ${tg(o.slot)}`
      : `🚚 Home delivery · ${tg(o.slot)}\n📍 ${tg(o.address)}${o.landmark ? ' (' + tg(o.landmark) + ')' : ''}, ${tg(o.pincode)}`,
    `💳 ${tg(pay)} — ${tg(payState)}${o.utr ? ` (UTR ${tg(o.utr)})` : ''}`,
    '',
    ...items.map((i) => `• ${i.qty} × ${tg(i.name)} ${tg(i.weight)} — ₹${i.line_total}`),
    '',
    o.coupon_discount ? `Coupon ${tg(o.coupon_code)}: −₹${o.coupon_discount}` : '',
    o.delivery_charge ? `Delivery: ₹${o.delivery_charge}` : '',
    `<b>Total: ₹${o.total}</b>`,
    o.notes ? `📝 ${tg(o.notes)}` : '',
    o.after_hours ? '🌙 Placed after closing time — process in the morning' : '',
    `🔗 ${tg(site)}/admin/order?no=${tg(o.order_no)}`,
  ];
  return lines.filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n');
}

/** Send the new-order alert (never throws). */
export async function alertNewOrder(full, site, title) {
  try {
    await alertOwner(orderAlert(full, site, title), `${title || 'New order'} ${full.order.order_no} – ₹${full.order.total}`);
  } catch (err) {
    console.error('[alerts] could not send order alert:', err);
  }
}

/**
 * Mark an online (Razorpay) payment as paid. Safe to call twice (browser + webhook):
 * returns true only the FIRST time, so the owner gets one alert.
 */
export async function markRazorpayPaid(db, razorpayOrderId, paymentId, by) {
  const now = new Date().toISOString();
  const res = await db.prepare(`UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?,
      status = CASE WHEN status = 'awaiting_payment' THEN 'new' ELSE status END, updated_at = ?
    WHERE razorpay_order_id = ? AND payment_status != 'paid'`).bind(paymentId, now, razorpayOrderId).run();
  if (!res.changes) return null;
  const order = await db.prepare('SELECT id FROM orders WHERE razorpay_order_id = ?').bind(razorpayOrderId).first();
  await db.prepare(`INSERT INTO order_events (order_id, status, note, by_user, at) VALUES (?, 'new', ?, ?, ?)`)
    .bind(order.id, `Paid online (Razorpay ${paymentId})`, by, now).run();
  return loadOrderById(db, order.id);
}

