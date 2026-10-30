/* =====================================================================
   pages/track.js — track an order with order number + phone
   Can be pre-filled from the URL: /track?no=SDS123456&phone=98xxxxxxxx
   ===================================================================== */

(function trackPage() {
  const form = document.querySelector('[data-track-form]');
  const out = document.querySelector('[data-track-result]');

  async function lookup(orderNo, phone) {
    out.innerHTML = '<div class="text-muted p-3">Looking up your order…</div>';
    try {
      const o = await API.trackOrder(orderNo, phone);
      out.innerHTML = `
        <div class="form-card">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div><div class="text-muted small">Order</div><b class="fs-5">${esc(o.order_no)}</b>
              <div class="small text-muted">${prettyDate(o.created_at)}</div></div>
            ${statusPill(o.status)}
          </div>
          ${statusTimeline(o)}
          <hr>
          ${o.lines.map((l) => `<div class="d-flex justify-content-between small mb-1">
            <span>${l.qty} × ${esc(l.name)} <span class="text-muted">${esc(l.weight)}</span></span><span>${rupees(l.line_total)}</span></div>`).join('')}
          <div class="d-flex justify-content-between fw-bold mt-2"><span>Total</span><span>${rupees(o.total)}</span></div>
          ${o.status === 'awaiting_payment' ? `<a class="btn btn-brand w-100 mt-3" href="/order-success?no=${encodeURIComponent(o.order_no)}&phone=${o.customer.phone}">Pay now by UPI</a>` : ''}
        </div>`;
    } catch (err) {
      out.innerHTML = `<div class="alert alert-warning">${esc(err.message)}</div>`;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const no = form.order_no.value.trim().toUpperCase();
    const phone = cleanPhone(form.phone.value);
    form.order_no.classList.toggle('is-invalid', !no);
    form.phone.classList.toggle('is-invalid', !phone);
    if (no && phone) lookup(no, phone);
  });

  // Pre-fill from the link, or from the last order placed on this phone
  let last = {};
  try { last = JSON.parse(localStorage.getItem('sds_last_order') || '{}'); } catch {}
  const no = qp('no') || last.no || '';
  const ph = cleanPhone(qp('phone')) || last.phone || '';
  if (no && ph) {
    form.order_no.value = no;
    form.phone.value = ph;
    lookup(no.toUpperCase(), ph);
  }
})();
