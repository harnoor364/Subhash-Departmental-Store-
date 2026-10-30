/* =====================================================================
   pages/my-orders.js — list past orders by phone number + "Reorder"
   (No OTP: each order only shows items & status, never the full address.)
   ===================================================================== */

(function myOrdersPage() {
  const form = document.querySelector('[data-orders-form]');
  const out = document.querySelector('[data-orders]');
  const SAVED_KEY = 'sds_customer';
  let orders = [];

  async function load(phone) {
    out.innerHTML = '<div class="text-muted p-3">Loading…</div>';
    orders = await API.ordersByPhone(phone);
    if (!orders.length) {
      out.innerHTML = `<div class="empty-state"><i class="bi bi-receipt"></i><p>No orders found for this number.</p>
        <a class="btn btn-brand" href="/category">Start shopping</a></div>`;
      return;
    }
    out.innerHTML = orders.map((o, i) => `
      <div class="form-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div><b>${esc(o.order_no)}</b> <span class="text-muted small">· ${prettyDate(o.created_at)}</span>
            <div class="small text-muted">${o.item_count} items · ${rupees(o.total)}</div></div>
          ${statusPill(o.status)}
        </div>
        <div class="small text-muted my-2">${o.lines.slice(0, 4).map((l) => esc(l.name)).join(', ')}${o.lines.length > 4 ? '…' : ''}</div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-brand btn-sm" type="button" data-reorder="${i}"><i class="bi bi-arrow-repeat"></i> Reorder</button>
          <a class="btn btn-outline-brand btn-sm" href="/track?no=${encodeURIComponent(o.order_no)}&phone=${o.customer.phone}">Track</a>
        </div>
      </div>`).join('');
  }

  // Reorder: put the same items back in the cart (prices are today's prices)
  out.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reorder]');
    if (!btn) return;
    const o = orders[Number(btn.dataset.reorder)];
    const items = {};
    for (const l of o.lines) items[l.cart_id || l.id] = l.qty;
    Cart.replace(items);
    UI.toast('Items added to your cart');
    UI.openCart();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = cleanPhone(form.phone.value);
    form.phone.classList.toggle('is-invalid', !phone);
    if (phone) load(phone);
  });

  // Use the number saved from the last checkout on this phone
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
    if (saved.phone) { form.phone.value = saved.phone; load(saved.phone); }
  } catch {}
})();
