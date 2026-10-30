/* =====================================================================
   pages/order-success.js — "Thank you" page after placing an order
   URL: /order-success?no=<order number>&phone=<10-digit phone>
   For UPI orders it shows the payment box and asks for the UTR number.
   ===================================================================== */

(async function successPage() {
  const box = document.querySelector('[data-success]');
  const orderNo = qp('no');
  const phone = cleanPhone(qp('phone'));

  try {
    const [order, s] = await Promise.all([API.trackOrder(orderNo, phone), UI.getSettings()]);
    render(order, s);
  } catch (err) {
    box.innerHTML = `<div class="empty-state"><i class="bi bi-receipt"></i><p>${esc(err.message)}</p>
      <a class="btn btn-brand" href="/track">Track an order</a></div>`;
  }

  function render(o, s) {
    const trackUrl = `/track?no=${encodeURIComponent(o.order_no)}&phone=${o.customer.phone}`;
    const payLabel = { upi: 'UPI', cod: o.fulfilment === 'pickup' ? 'Pay at Store' : 'Cash on Delivery', razorpay: 'Online payment' }[o.payment_method];

    box.innerHTML = `
      <div class="form-card text-center">
        <div style="font-size:3.5rem;color:var(--green)"><i class="bi bi-check-circle-fill"></i></div>
        <h1 class="h3">Thank you, ${esc(o.customer.name.split(' ')[0])}!</h1>
        <p class="text-muted">Your order has been placed.</p>
        <div class="d-inline-block bg-body-tertiary rounded-3 px-4 py-2 mb-2">
          Order number<br><b class="fs-4">${esc(o.order_no)}</b></div>
        <p class="mb-0">Total <b>${rupees(o.total)}</b> · ${esc(payLabel)} ·
          ${o.fulfilment === 'pickup' ? 'Store pickup' : 'Home delivery'} (${esc(o.slot)})</p>
        ${isStoreOpen(s) ? '' : '<div class="alert alert-warning mt-3 mb-0">We\'re closed now — your order will be processed tomorrow morning.</div>'}
      </div>
      <div data-upi-box></div>
      <div class="form-card">
        <h2><i class="bi bi-truck"></i> Order status</h2>
        <div data-timeline>${statusTimeline(o)}</div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <a class="btn btn-brand" href="${trackUrl}">Track order</a>
          <a class="btn btn-outline-brand" href="/">Continue shopping</a>
        </div>
      </div>`;

    if (['awaiting_payment', 'payment_submitted'].includes(o.status) && o.payment_method === 'upi') renderUpi(o, s);
  }

  /** UPI payment box: pay button + UTR form. (QR code is added in Phase 3.) */
  function renderUpi(o, s) {
    const upiBox = document.querySelector('[data-upi-box]');
    if (o.status === 'payment_submitted') {
      upiBox.innerHTML = `<div class="form-card"><h2><i class="bi bi-hourglass-split"></i> Payment submitted</h2>
        <p class="mb-0">Thanks! We've received your UPI reference <b>${esc(o.utr)}</b>. The store will verify it and confirm your order.</p></div>`;
      return;
    }
    const upiLink = s.upi_id ? `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(CONFIG.storeName)}&am=${o.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order ' + o.order_no)}` : '';

    upiBox.innerHTML = `
      <div class="form-card">
        <h2><i class="bi bi-qr-code"></i> Pay ${rupees(o.total)} by UPI</h2>
        ${upiLink ? `
          <div data-upi-qr class="text-center mb-3"></div>
          <a class="btn btn-brand btn-lg w-100 mb-2" href="${esc(upiLink)}">Pay with GPay / PhonePe / Paytm</a>
          <p class="small text-muted text-center">UPI ID: <b>${esc(s.upi_id)}</b> · Note: Order ${esc(o.order_no)}</p>`
        : `<div class="placeholder-note mb-3">The store's UPI ID will be added soon. For now you can pay on delivery / at the store.</div>`}
        <form class="mt-2" data-utr-form novalidate>
          <label class="form-label" for="utr">After paying, enter the UPI reference number (UTR)</label>
          <div class="input-group">
            <input class="form-control" id="utr" name="utr" inputmode="numeric" maxlength="22" placeholder="12-digit UTR / reference no.">
            <button class="btn btn-brand" type="submit">Submit</button>
          </div>
          <div class="form-text">Find it in your UPI app under the payment details.</div>
        </form>
      </div>`;

    upiBox.querySelector('[data-utr-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const utr = e.target.utr.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6,22}$/.test(utr)) {
        e.target.utr.classList.add('is-invalid');
        UI.toast('Please enter the reference number from your UPI app.', 'danger');
        return;
      }
      try {
        const updated = await API.submitUtr(o.order_no, o.customer.phone, utr);
        render(updated, s);
        UI.toast('Payment reference submitted', 'success');
      } catch (err) {
        UI.toast(err.message, 'danger');
      }
    });
  }
})();
