/* =====================================================================
   api.js — the ONLY file that talks to the backend (/api/...)
   ---------------------------------------------------------------------
   Pages never call fetch() themselves; they call API.something().
   So if a backend URL changes, this is the only file to edit.

   Everything comes from the server and its database: products, prices,
   settings, orders, payments and enquiries.
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

  // ---------- Orders ----------

  /** Place an order. Returns { order } or { order, razorpay } for online payment. */
  const placeOrder = (payload) => post('/api/orders', payload);

  /** After a Razorpay payment: let the server check it. Returns the updated order. */
  const verifyRazorpay = (body) => post('/api/razorpay/verify', body);

  /** One order (order number AND phone must match). Never cached — status changes. */
  const trackOrder = (orderNo, phone) =>
    request(`/api/orders/track?no=${encodeURIComponent(String(orderNo).trim().toUpperCase())}&phone=${encodeURIComponent(phone)}`);

  /** All orders of a phone number (needs one of its order numbers as proof). */
  const ordersByPhone = (phone, orderNo) =>
    request(`/api/orders/history?phone=${encodeURIComponent(phone)}&no=${encodeURIComponent(String(orderNo).trim().toUpperCase())}`);

  /** Customer paid by UPI and enters the UTR / reference number. */
  const submitUtr = (orderNo, phone, utr) => post('/api/orders/utr', { order_no: orderNo, phone, utr });

  /** Bulk order enquiry. */
  const bulkEnquiry = (payload) => post('/api/enquiries', payload);

  return {
    settings, categories, products, product, combos, banners, quote,
    placeOrder, verifyRazorpay, trackOrder, ordersByPhone, submitUtr, bulkEnquiry,
  };
})();
