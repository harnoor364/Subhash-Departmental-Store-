/* =====================================================================
   pages/order-success.js — "Thank you" page after placing an order
   URL: /order-success?no=<order number>&phone=<10-digit phone>
   - Razorpay orders: shows "Paid" (or "payment pending")
   - UPI-to-store orders: QR code + "Pay with GPay/PhonePe/Paytm" button,
     then asks for the UTR / reference number
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
    const payLabel = {
      razorpay: o.payment_status === 'paid' ? 'Paid online ✓' : 'Online payment pending',
      upi: 'UPI',
      cod: o.fulfilment === 'pickup' ? 'Pay at Store' : 'Cash on Delivery',
    }[o.payment_method];

    box.innerHTML = `
      <div class="form-card text-center">
        <div style="font-size:3.5rem;color:var(--green)"><i class="bi bi-check-circle-fill"></i></div>
        <h1 class="h3">Thank you, ${esc(o.customer.name.split(' ')[0])}!</h1>
        <p class="text-muted">Your order has been placed.</p>
        <div class="d-inline-block bg-body-tertiary rounded-3 px-4 py-2 mb-2">
          Order number<br><b class="fs-4">${esc(o.order_no)}</b></div>
        <p class="mb-0">Total <b>${rupees(o.total)}</b> · ${esc(payLabel)} ·
          ${o.fulfilment === 'pickup' ? 'Store pickup' : 'Home delivery'} (${esc(o.slot)})</p>
        ${o.after_hours ? '<div class="alert alert-warning mt-3 mb-0"><i class="bi bi-moon"></i> We\'re closed now — your order will be processed tomorrow morning.</div>' : ''}
        <p class="small text-muted mt-3 mb-0">Save your order number — you'll need it with your phone number to track this order.</p>
      </div>
      <div data-pay-box></div>
      <div class="form-card">
        <h2><i class="bi bi-truck"></i> Order status</h2>
        <div>${statusTimeline(o)}</div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <a class="btn btn-brand" href="${trackUrl}">Track order</a>
          <a class="btn btn-outline-brand" href="/">Continue shopping</a>
        </div>
      </div>`;

    if (o.payment_method === 'upi' && ['awaiting_payment', 'payment_submitted'].includes(o.status)) renderUpi(o, s);
    if (o.payment_method === 'razorpay' && o.payment_status !== 'paid') {
      document.querySelector('[data-pay-box]').innerHTML = `<div class="form-card">
        <h2><i class="bi bi-hourglass-split"></i> Confirming your payment</h2>
        <p class="mb-0">If your payment went through, this will update in a minute — refresh the page.
        If money was deducted but the order still shows unpaid, please call or WhatsApp the store with your order number.</p></div>`;
    }
  }

  /** UPI to the store's own UPI ID: QR code + app button + UTR form. */
  function renderUpi(o, s) {
    const payBox = document.querySelector('[data-pay-box]');
    if (o.status === 'payment_submitted') {
      payBox.innerHTML = `<div class="form-card"><h2><i class="bi bi-hourglass-split"></i> Payment submitted</h2>
        <p class="mb-0">Thanks! We've received your UPI reference <b>${esc(o.utr)}</b>. The store will check it and confirm your order.</p></div>`;
      return;
    }
    if (!s.upi_id) {
      payBox.innerHTML = `<div class="form-card"><div class="placeholder-note">The store's UPI ID isn't set up yet. You can pay on delivery / at the store.</div></div>`;
      return;
    }

    // upi://pay link: store's UPI ID, store name, exact amount, order number in the note
    const upiLink = `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(CONFIG.storeName)}`
      + `&am=${Number(o.total).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order ' + o.order_no)}`;
    const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent);

    payBox.innerHTML = `
      <div class="form-card">
        <h2><i class="bi bi-qr-code"></i> Pay ${rupees(o.total)} by UPI</h2>
        ${isPhone ? `<a class="btn btn-brand btn-lg w-100 mb-3" href="${esc(upiLink)}">Pay with GPay / PhonePe / Paytm</a>
          <p class="small text-muted text-center">Or scan this QR code from another phone:</p>` : '<p class="small text-muted text-center">Scan with any UPI app:</p>'}
        <div class="d-flex justify-content-center mb-2"><div data-upi-qr class="p-2 bg-white rounded-3"></div></div>
        <p class="small text-muted text-center">UPI ID: <b>${esc(s.upi_id)}</b> · Amount: <b>${rupees(o.total)}</b> · Note: Order ${esc(o.order_no)}</p>
        <form class="mt-3" data-utr-form novalidate>
          <label class="form-label" for="utr">After paying, enter the UPI reference number (UTR)</label>
          <div class="input-group">
            <input class="form-control" id="utr" name="utr" maxlength="22" placeholder="12-digit UTR / reference no." autocomplete="off">
            <button class="btn btn-brand" type="submit">Submit</button>
          </div>
          <div class="form-text">Find it in your UPI app under the payment details.</div>
        </form>
      </div>`;

    drawQr(payBox.querySelector('[data-upi-qr]'), upiLink);

    payBox.querySelector('[data-utr-form]').addEventListener('submit', async (e) => {
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

  /** Draw a QR code (library loaded from a CDN only on this page, only when needed). */
  function drawQr(el, textToEncode) {
    const draw = () => new window.QRCode(el, { text: textToEncode, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M });
    if (window.QRCode) return draw();
    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    js.onload = draw;
    js.onerror = () => { el.textContent = 'QR code could not load — use the UPI ID below.'; };
    document.head.appendChild(js);
  }
})();
