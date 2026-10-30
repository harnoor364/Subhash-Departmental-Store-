/* =====================================================================
   api.js — the ONLY file that talks to the backend
   ---------------------------------------------------------------------
   PHASE 1: reads sample data from /data/sample-catalog.json and keeps
   demo orders in this browser (localStorage). Nothing is sent anywhere.

   PHASE 2+: each function below is switched to call /api/... on the
   Cloudflare backend. Pages never need to change, because they only
   ever call API.something().
   ===================================================================== */

const API = (() => {
  let catalogPromise = null;

  /** Load the sample catalog once and reuse it. */
  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('/data/sample-catalog.json')
        .then((r) => {
          if (!r.ok) throw new Error('Could not load products');
          return r.json();
        });
    }
    return catalogPromise;
  }

  // ---------- Catalogue ----------

  async function settings() {
    return (await catalog()).settings;
  }

  async function categories() {
    return (await catalog()).categories.slice().sort((a, b) => a.sort - b.sort);
  }

  /**
   * List products. Filters: { category, q, featured, deal }
   * Search matches name, category name and Hindi category name.
   */
  async function products(filter = {}) {
    const data = await catalog();
    const q = (filter.q || '').trim().toLowerCase();
    const catNames = Object.fromEntries(data.categories.map((c) => [c.id, `${c.name} ${c.name_hi}`.toLowerCase()]));
    return data.products.filter((p) =>
      (!filter.category || p.category === filter.category) &&
      (!filter.featured || p.featured) &&
      (!filter.deal || p.deal) &&
      (!q || `${p.name} ${p.weight} ${catNames[p.category]}`.toLowerCase().includes(q))
    ).sort((a, b) => a.sort - b.sort);
  }

  async function product(id) {
    return (await catalog()).products.find((p) => p.id === id) || null;
  }

  async function combos() {
    return (await catalog()).combos;
  }

  async function banners() {
    return (await catalog()).banners;
  }

  /** Check a coupon code against an order subtotal. Returns the coupon or throws. */
  async function coupon(code) {
    const c = (await catalog()).coupons.find((x) => x.code === String(code).trim().toUpperCase());
    if (!c) throw new Error('This coupon code is not valid.');
    return c;
  }

  // ---------- Orders (Phase 1 demo: saved in this browser only) ----------

  const DEMO_KEY = 'sds_demo_orders';
  const readDemo = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; } };
  const saveDemo = (list) => localStorage.setItem(DEMO_KEY, JSON.stringify(list.slice(-30)));

  /** Place an order. Returns { order_no, phone }. */
  async function placeOrder(payload) {
    // Honeypot: real people never fill the hidden "website" field
    if (payload.website) throw new Error('Sorry, the order could not be placed.');
    const s = await settings();
    const quote = await Pricing.quote({ ...payload, settings: s });
    if (quote.errors.length) throw new Error(quote.errors[0]);
    const orderNo = 'SDS' + Date.now().toString().slice(-6);
    const order = {
      order_no: orderNo,
      created_at: new Date().toISOString(),
      status: payload.payment_method === 'upi' ? 'awaiting_payment' : 'new',
      ...payload,
      ...quote,
      history: [{ status: 'new', at: new Date().toISOString() }],
    };
    const list = readDemo();
    list.push(order);
    saveDemo(list);
    return { order_no: orderNo, phone: payload.customer.phone };
  }

  /** Find one order by number + phone (both must match). */
  async function trackOrder(orderNo, phone) {
    const o = readDemo().find((x) => x.order_no === String(orderNo).trim().toUpperCase() && x.customer.phone === phone);
    if (!o) throw new Error('No order found with this order number and phone number.');
    return o;
  }

  /** All orders for a phone number, newest first. */
  async function ordersByPhone(phone) {
    return readDemo().filter((x) => x.customer.phone === phone).reverse();
  }

  /** Customer says they paid by UPI and gives the UTR / reference number. */
  async function submitUtr(orderNo, phone, utr) {
    const list = readDemo();
    const o = list.find((x) => x.order_no === orderNo && x.customer.phone === phone);
    if (!o) throw new Error('Order not found.');
    o.utr = utr;
    o.status = 'payment_submitted';
    o.history.push({ status: 'payment_submitted', at: new Date().toISOString() });
    saveDemo(list);
    return o;
  }

  /** Bulk order enquiry. */
  async function bulkEnquiry(payload) {
    console.info('[Phase 1 demo] Bulk enquiry (not sent anywhere yet):', payload);
    return { ok: true };
  }

  return {
    settings, categories, products, product, combos, banners, coupon,
    placeOrder, trackOrder, ordersByPhone, submitUtr, bulkEnquiry,
  };
})();
