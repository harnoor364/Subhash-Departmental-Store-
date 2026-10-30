/* =====================================================================
   cart.js — shopping cart (saved in the browser) + price calculator
   ---------------------------------------------------------------------
   Cart is stored in localStorage as { "<productId>": qty, "combo:<comboId>": qty }
   Whenever it changes, a "cart:change" event fires on window so every
   part of the page (badge, drawer, + / - buttons) can update itself.

   Pricing.quote() asks the SERVER to price the cart (POST /api/quote),
   so prices always come from the database — never from the browser.
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
   * Ask the server for the full price breakdown of the cart.
   * @param {object} o { items, fulfilment: 'delivery'|'pickup', coupon_code, phone }
   * Returns { lines, subtotal, coupon_discount, delivery_charge, total, errors, ... }
   */
  async function quote({ items = Cart.items(), fulfilment = 'delivery', coupon_code = '', phone = '' } = {}) {
    const q = await API.quote({ items, fulfilment, coupon_code, phone });
    // Products the store has removed are dropped from the cart automatically
    if (q.removed && q.removed.length) {
      const all = Cart.items();
      q.removed.forEach((id) => delete all[id]);
      Cart.replace(all);
    }
    return q;
  }

  return { quote };
})();
