/* =====================================================================
   cart.js — shopping cart (saved in the browser) + price calculator
   ---------------------------------------------------------------------
   Cart is stored in localStorage as { "<productId>": qty, "combo:<comboId>": qty }
   Whenever it changes, a "cart:change" event fires on window so every
   part of the page (badge, drawer, + / - buttons) can update itself.

   Pricing.quote() works out totals FOR DISPLAY ONLY.
   The server recalculates everything from the database before saving
   an order (Phase 3) — never trust prices coming from the browser.
   ===================================================================== */

const Cart = (() => {
  const KEY = 'sds_cart_v1';
  const MAX_QTY = 50;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  const items = () => read();
  const qty = (id) => read()[id] || 0;
  const count = () => Object.values(read()).reduce((a, b) => a + b, 0);

  function set(id, n) {
    const all = read();
    n = Math.max(0, Math.min(MAX_QTY, Math.floor(n)));
    if (n === 0) delete all[id]; else all[id] = n;
    write(all);
  }

  const add = (id, delta = 1) => set(id, qty(id) + delta);
  const clear = () => write({});

  /** Replace the whole cart (used by "Reorder"). */
  const replace = (newItems) => write({ ...newItems });

  // Keep several open tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) window.dispatchEvent(new CustomEvent('cart:change', { detail: read() }));
  });

  return { items, qty, count, set, add, clear, replace };
})();

const Pricing = (() => {
  /**
   * Work out the full price breakdown.
   * @param {object} o { items, fulfilment: 'delivery'|'pickup', coupon_code, settings }
   */
  async function quote({ items = Cart.items(), fulfilment = 'delivery', coupon_code = '', settings }) {
    const s = settings || await API.settings();
    const [allProducts, allCombos] = await Promise.all([API.products(), API.combos()]);
    const byId = Object.fromEntries(allProducts.map((p) => [p.id, { ...p, kind: 'product' }]));
    for (const c of allCombos) byId['combo:' + c.id] = { ...c, kind: 'combo', weight: 'Combo kit' };

    const errors = [];
    const lines = [];
    for (const [id, q] of Object.entries(items)) {
      const item = byId[id];
      if (!item || q <= 0) continue; // product removed from store
      if (!item.in_stock) errors.push(`${item.name} is out of stock. Please remove it.`);
      lines.push({ ...item, cart_id: id, qty: q, line_total: item.price * q });
    }

    const subtotal = lines.reduce((a, l) => a + l.line_total, 0);
    const mrpTotal = lines.reduce((a, l) => a + l.mrp * l.qty, 0);

    // Coupon
    let couponDiscount = 0, couponError = '', couponNote = '';
    if (coupon_code) {
      try {
        const c = await API.coupon(coupon_code);
        if (subtotal < c.min_order) {
          couponError = `Add ${rupees(c.min_order - subtotal)} more to use ${c.code}.`;
        } else {
          couponDiscount = c.type === 'percent'
            ? Math.min(Math.round(subtotal * c.value / 100), c.max_discount || Infinity)
            : c.value;
          couponDiscount = Math.min(couponDiscount, subtotal);
          couponNote = c.note || '';
        }
      } catch (e) {
        couponError = e.message;
      }
    }

    // Delivery charge (store pickup is always free)
    const freeGap = Math.max(0, s.free_delivery_above - subtotal);
    const deliveryCharge = fulfilment === 'pickup' || freeGap === 0 || lines.length === 0 ? 0 : s.delivery_charge;

    const minGap = Math.max(0, s.min_order - subtotal);
    if (lines.length === 0) errors.unshift('Your cart is empty.');
    else if (minGap > 0) errors.unshift(`Minimum order is ${rupees(s.min_order)}. Add ${rupees(minGap)} more.`);

    return {
      lines,
      item_count: lines.reduce((a, l) => a + l.qty, 0),
      subtotal,
      mrp_total: mrpTotal,
      savings: mrpTotal - subtotal + couponDiscount,
      coupon_code: couponDiscount ? String(coupon_code).toUpperCase() : '',
      coupon_discount: couponDiscount,
      coupon_error: couponError,
      coupon_note: couponNote,
      delivery_charge: deliveryCharge,
      total: subtotal - couponDiscount + deliveryCharge,
      free_delivery_gap: freeGap,
      min_order_gap: minGap,
      errors,
    };
  }

  return { quote };
})();
