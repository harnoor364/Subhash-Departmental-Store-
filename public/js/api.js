/* =====================================================================
   api.js — the ONLY file that talks to the backend (/api/...)
   ---------------------------------------------------------------------
   Pages never call fetch() themselves; they call API.something().
   So if a backend URL changes, this is the only file to edit.

   PHASE 2: products, categories, settings, banners, combos and prices
   come from the D1 database. ORDERS are still a browser-only demo
   (localStorage) until Phase 3 adds the real order API.
   ===================================================================== */

const API = (() => {
  const cache = new Map(); // GET responses are reused while the page is open

  /** GET a JSON url (cached). Throws an Error with a friendly message on failure. */
  function get(url) {
    if (!cache.has(url)) {
      cache.set(url, request(url).catch((err) => { cache.delete(url); throw err; }));
    }
    return cache.get(url);
  }

  /** POST JSON and return the JSON reply. */
  function post(url, body) {
    return request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  async function request(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch {
      throw new Error('No internet connection. Please check and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sorry, something went wrong. Please try again.');
    return data;
  }

  // ---------- Catalogue ----------

  const settings = () => get('/api/settings');
  const categories = () => get('/api/categories');
  const combos = () => get('/api/combos');
  const banners = () => get('/api/banners');

  /** Products. Filters: { category, q, featured, deal, ids: [], limit } */
  function products(filter = {}) {
    const p = new URLSearchParams();
    if (filter.category) p.set('category', filter.category);
    if (filter.q) p.set('q', filter.q);
    if (filter.featured) p.set('featured', '1');
    if (filter.deal) p.set('deal', '1');
    if (filter.ids) p.set('ids', filter.ids.join(','));
    if (filter.limit) p.set('limit', filter.limit);
    const qs = p.toString();
    return get('/api/products' + (qs ? '?' + qs : ''));
  }

  /** One product: returns { product, fbt: [...], similar: [...] } or null if not found. */
  async function product(id) {
    try {
      return await get('/api/products/' + encodeURIComponent(id));
    } catch {
      return null;
    }
  }

  /** Price the cart on the server. { items, fulfilment, coupon_code, phone } */
  function quote(body) {
    return post('/api/quote', body);
  }

  // ---------- Orders (STILL A DEMO until Phase 3: saved in this browser only) ----------

  const DEMO_KEY = 'sds_demo_orders';
  const readDemo = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; } };
  const saveDemo = (list) => localStorage.setItem(DEMO_KEY, JSON.stringify(list.slice(-30)));

  /** Place an order. Returns { order_no, phone }. */
  async function placeOrder(payload) {
    if (payload.website) throw new Error('Sorry, the order could not be placed.'); // honeypot
    const q = await quote(payload);
    if (q.errors.length) throw new Error(q.errors[0]);
    const orderNo = 'SDS' + Date.now().toString().slice(-6);
    const list = readDemo();
    list.push({
      order_no: orderNo,
      created_at: new Date().toISOString(),
      status: payload.payment_method === 'upi' ? 'awaiting_payment' : 'new',
      ...payload,
      ...q,
    });
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
    saveDemo(list);
    return o;
  }

  /** Bulk order enquiry. */
  async function bulkEnquiry(payload) {
    console.info('[demo] Bulk enquiry (saved to admin from Phase 3):', payload);
    return { ok: true };
  }

  return {
    settings, categories, products, product, combos, banners, quote,
    placeOrder, trackOrder, ordersByPhone, submitUtr, bulkEnquiry,
  };
})();
