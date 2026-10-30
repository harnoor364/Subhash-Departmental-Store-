/* =====================================================================
   lib/pricing.js — THE price calculator (single source of truth)
   ---------------------------------------------------------------------
   Works out the full bill from the DATABASE prices:
     item total → coupon → delivery charge → total to pay
   Used by POST /api/quote (cart & checkout display) and by order
   creation (Phase 3), so the customer always sees the same numbers
   the store will charge. The browser only sends ids and quantities.
   ===================================================================== */

import { money } from './validate.js';
import { toProduct, toCombo } from './catalog.js';

/**
 * @param {object} db        database (lib/db.js)
 * @param {object} input     { items: {id: qty}, fulfilment, coupon_code, phone }
 * @param {object} settings  from loadSettings()
 */
export async function quote(db, input, settings) {
  const s = settings;
  const items = input.items || {};
  const fulfilment = input.fulfilment === 'pickup' ? 'pickup' : 'delivery';

  // ---- 1. Load the products & combos in the cart (one query each) ----
  const productIds = Object.keys(items).filter((id) => !id.startsWith('combo:'));
  const comboIds = Object.keys(items).filter((id) => id.startsWith('combo:')).map((id) => id.slice(6));
  const byId = {};

  if (productIds.length) {
    const { results } = await db
      .prepare(`SELECT * FROM products WHERE active = 1 AND id IN (${productIds.map(() => '?').join(',')})`)
      .bind(...productIds).all();
    for (const r of results) byId[r.id] = { ...toProduct(r), kind: 'product' };
  }
  if (comboIds.length) {
    const { results } = await db
      .prepare(`SELECT * FROM combos WHERE active = 1 AND id IN (${comboIds.map(() => '?').join(',')})`)
      .bind(...comboIds).all();
    for (const r of results) byId['combo:' + r.id] = { ...toCombo(r), kind: 'combo', weight: 'Combo kit' };
  }

  // ---- 2. Build the lines ----
  const errors = [];
  const lines = [];
  const removed = [];  // ids no longer sold (the browser drops them from the cart)
  for (const [id, qty] of Object.entries(items)) {
    const item = byId[id];
    if (!item) { removed.push(id); continue; }
    if (!item.in_stock) errors.push(`${item.name} is out of stock. Please remove it.`);
    lines.push({
      cart_id: id, id: item.id, kind: item.kind, name: item.name, weight: item.weight,
      mrp: item.mrp, price: item.price, qty, line_total: money(item.price * qty),
      in_stock: item.in_stock, image_url: item.image_url, art: item.art,
    });
  }
  const subtotal = money(lines.reduce((a, l) => a + l.line_total, 0));
  const mrpTotal = money(lines.reduce((a, l) => a + Math.max(l.mrp, l.price) * l.qty, 0));

  // ---- 3. Coupon ----
  let couponDiscount = 0, couponError = '', couponNote = '', couponCode = '';
  const code = String(input.coupon_code || '').trim().toUpperCase().slice(0, 20);
  if (code) {
    const c = await db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').bind(code).first();
    if (!c) couponError = 'This coupon code is not valid.';
    else if (c.expires_at && c.expires_at < new Date().toISOString()) couponError = 'This coupon has expired.';
    else if (c.usage_limit != null && c.used_count >= c.usage_limit) couponError = 'This coupon is no longer available.';
    else if (subtotal < c.min_order) couponError = `Add ₹${money(c.min_order - subtotal)} more to use ${c.code}.`;
    else if (c.first_order_only && input.phone && await hasOrdered(db, input.phone)) couponError = `${c.code} is only for your first order.`;
    else {
      couponDiscount = c.type === 'percent' ? subtotal * c.value / 100 : c.value;
      if (c.max_discount != null) couponDiscount = Math.min(couponDiscount, c.max_discount);
      couponDiscount = money(Math.min(couponDiscount, subtotal));
      couponNote = c.note;
      couponCode = c.code;
    }
  }

  // ---- 4. Delivery charge (pickup is always free) ----
  const freeGap = money(Math.max(0, s.free_delivery_above - subtotal));
  const deliveryCharge = fulfilment === 'pickup' || freeGap === 0 || !lines.length ? 0 : money(s.delivery_charge);

  // ---- 5. Minimum order ----
  const minGap = money(Math.max(0, s.min_order - subtotal));
  if (!lines.length) errors.unshift('Your cart is empty.');
  else if (minGap > 0) errors.unshift(`Minimum order is ₹${s.min_order}. Add ₹${minGap} more.`);

  return {
    lines,
    removed,
    item_count: lines.reduce((a, l) => a + l.qty, 0),
    subtotal,
    mrp_total: mrpTotal,
    savings: money(mrpTotal - subtotal + couponDiscount),
    coupon_code: couponCode,
    coupon_discount: couponDiscount,
    coupon_error: couponError,
    coupon_note: couponNote,
    delivery_charge: deliveryCharge,
    total: money(subtotal - couponDiscount + deliveryCharge),
    free_delivery_gap: freeGap,
    min_order_gap: minGap,
    errors,
  };
}

async function hasOrdered(db, phone) {
  const row = await db.prepare("SELECT 1 FROM orders WHERE phone = ? AND status != 'cancelled' LIMIT 1").bind(phone).first();
  return !!row;
}
