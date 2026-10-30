/* =====================================================================
   pages/checkout.js — checkout form
   ---------------------------------------------------------------------
   - Delivery or store pickup, address + pincode check, time slot
   - Coupon, free-delivery progress bar, minimum order
   - Payment: Razorpay online (if keys set) / UPI to store (if UPI ID set) /
     Cash on Delivery (Pay at Store for pickup)
   Totals come from the server (POST /api/quote), never from the browser.
   ===================================================================== */

(async function checkoutPage() {
  const $ = (sel) => document.querySelector(sel);
  const form = $('[data-checkout]');
  const SAVED_KEY = 'sds_customer'; // remembers name/phone/address on this phone
  const LAST_ORDER_KEY = 'sds_last_order';
  let couponCode = '';
  let lastQuote = null;

  const s = await UI.getSettings();

  // ---------- Set up the form from settings ----------
  $('[data-delivery-note]').textContent =
    `${rupees(s.delivery_charge)} · FREE above ${rupees(s.free_delivery_above)}`;
  $('[data-pincode-help]').textContent = s.delivery_pincodes.length ? `We deliver to: ${s.delivery_pincodes.join(', ')}` : '';
  $('[data-slots]').innerHTML = s.delivery_slots.map((x) => `<option>${esc(x)}</option>`).join('');
  // Show only the payment options that are set up; select the first one
  const payOn = { razorpay: !!s.razorpay_available, upi: !!s.upi_id, cod: true };
  form.querySelectorAll('[data-pay-option]').forEach((el) => { el.hidden = !payOn[el.dataset.payOption]; });
  form.querySelector('[data-pay-option]:not([hidden]) input').checked = true;

  // Fill in details saved from the last order
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
    for (const k of ['name', 'phone', 'address', 'landmark', 'pincode']) {
      if (saved[k] && form[k]) form[k].value = saved[k];
    }
  } catch {}

  // Store address for pickup orders (from config.js)
  const a = CONFIG.address;
  $('[data-pickup-address]').innerHTML = `<i class="bi bi-geo-alt-fill text-danger"></i>
    <b>Pick up from:</b> ${esc(CONFIG.storeName)}, ${esc(a.line1)}, ${esc(a.line2)}, ${esc(a.city)} ${esc(a.pincode)}
    · <a href="${esc(CONFIG.mapsDirectionsUrl)}" target="_blank" rel="noopener">Directions</a>`;

  const fulfilment = () => form.fulfilment.value;

  function onFulfilmentChange() {
    const pickup = fulfilment() === 'pickup';
    $('[data-address-fields]').hidden = pickup;
    $('[data-pickup-address]').hidden = !pickup;
    $('[data-slot-label]').textContent = pickup ? 'Pickup time' : 'Delivery time';
    $('[data-cod-label]').textContent = pickup ? 'Pay at Store' : 'Cash on Delivery';
    renderSummary();
  }
  form.querySelectorAll('[name="fulfilment"]').forEach((r) => r.addEventListener('change', onFulfilmentChange));

  // ---------- Order summary ----------
  let seq = 0; // ignores slow, out-of-date price replies
  async function renderSummary() {
    const mySeq = ++seq;
    let q;
    try {
      q = await Pricing.quote({ fulfilment: fulfilment(), coupon_code: couponCode, phone: cleanPhone(form.phone.value) });
    } catch (err) {
      UI.toast(err.message, 'danger');
      return;
    }
    if (mySeq !== seq) return;
    lastQuote = q;

    if (!q.lines.length) {
      form.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-basket"></i>
        <p>Your cart is empty.</p><a class="btn btn-brand" href="/category">Start shopping</a></div></div>`;
      return;
    }

    $('[data-summary-lines]').innerHTML = q.lines.map((l) => `
      <div class="cart-line px-0 py-1 mb-1 shadow-none">
        <div class="cart-line-img" style="width:44px;height:44px">${Art.productImage(l)}</div>
        <div class="cart-line-info"><div class="cart-line-name">${esc(l.name)}</div>
          <div class="cart-line-meta">${esc(l.weight)} · ${l.qty} × ${rupees(l.price)}</div></div>
        <b class="small">${rupees(l.line_total)}</b>
      </div>`).join('') +
      '<a href="#" class="small" data-open-cart>Edit cart</a>';

    $('[data-free-bar]').innerHTML = fulfilment() === 'delivery' ? UI.freeDeliveryBar(q, s) : '';

    const msg = $('[data-coupon-msg]');
    if (q.coupon_discount) msg.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> ${esc(q.coupon_code)} applied. ${esc(q.coupon_note)}</span>`;
    else if (q.coupon_error) msg.innerHTML = `<span class="text-danger">${esc(q.coupon_error)}</span>`;
    else msg.innerHTML = '';

    $('[data-totals]').innerHTML = `
      <div><span>Item total</span><span>${rupees(q.subtotal)}</span></div>
      ${q.coupon_discount ? `<div class="text-success"><span>Coupon (${esc(q.coupon_code)})</span><span>−${rupees(q.coupon_discount)}</span></div>` : ''}
      <div><span>${fulfilment() === 'pickup' ? 'Store pickup' : 'Delivery'}</span><span>${q.delivery_charge ? rupees(q.delivery_charge) : 'FREE'}</span></div>
      <div class="cart-total"><span>To pay</span><span>${rupees(q.total)}</span></div>
      ${q.savings > 0 ? `<div class="text-success small justify-content-center mb-2">You save ${rupees(q.savings)} on this order 🎉</div>` : ''}`;

    // A coupon that can't be used blocks the order until it's fixed or removed
    const problems = [...q.errors];
    if (couponCode && q.coupon_error) problems.push(`${q.coupon_error} Remove the coupon code to continue.`);
    const errBox = $('[data-errors]');
    errBox.hidden = !problems.length;
    errBox.textContent = problems[0] || '';
    $('[data-place]').disabled = problems.length > 0;
    $('[data-place]').textContent = `Place order · ${rupees(q.total)}`;
  }

  // ---------- Coupon ----------
  $('[data-apply-coupon]').addEventListener('click', () => {
    couponCode = form.coupon.value.trim().toUpperCase(); // empty field + Apply = remove coupon
    renderSummary();
  });
  form.coupon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('[data-apply-coupon]').click(); }
  });

  // ---------- Validation ----------
  function validate() {
    let ok = true;
    const mark = (el, valid) => { el.classList.toggle('is-invalid', !valid); if (!valid) ok = false; };

    mark(form.name, form.name.value.trim().length >= 2);
    mark(form.phone, !!cleanPhone(form.phone.value));

    if (fulfilment() === 'delivery') {
      mark(form.address, form.address.value.trim().length >= 5);
      const pin = form.pincode.value.trim();
      const pinMsg = $('[data-pincode-msg]');
      if (!/^\d{6}$/.test(pin)) {
        pinMsg.textContent = 'Please enter a valid 6-digit pincode.';
        mark(form.pincode, false);
      } else if (s.delivery_pincodes.length && !s.delivery_pincodes.includes(pin)) { // empty list = any pincode
        pinMsg.textContent = `Sorry, we don't deliver to ${pin} yet. We deliver to: ${s.delivery_pincodes.join(', ')}. Please choose Store pickup.`;
        mark(form.pincode, false);
      } else {
        mark(form.pincode, true);
      }
    }
    if (!ok) form.querySelector('.is-invalid')?.focus();
    return ok;
  }
  form.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));
  // A first-order coupon depends on the phone number, so re-check it
  form.phone.addEventListener('change', () => { if (couponCode) renderSummary(); });

  // ---------- Place order ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate() || !lastQuote || $('[data-place]').disabled) return;

    const btn = $('[data-place]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Placing order…';

    const pickup = fulfilment() === 'pickup';
    const payload = {
      customer: {
        name: form.name.value.trim(),
        phone: cleanPhone(form.phone.value),
        address: pickup ? '' : form.address.value.trim(),
        landmark: pickup ? '' : form.landmark.value.trim(),
        pincode: pickup ? '' : form.pincode.value.trim(),
      },
      fulfilment: fulfilment(),
      slot: form.slot.value,
      payment_method: form.payment_method.value,
      notes: form.notes.value.trim(),
      coupon_code: couponCode,
      items: Cart.items(),
      website: form.website.value, // honeypot
    };

    try {
      const res = await API.placeOrder(payload);
      const order = res.order;
      localStorage.setItem(SAVED_KEY, JSON.stringify(payload.customer));
      // Remember the last order so "My orders" and "Track" can fill themselves in
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ no: order.order_no, phone: order.customer.phone }));

      if (res.razorpay) {
        openRazorpay(res.razorpay, order);  // online payment popup
      } else {
        finish(order);
      }
    } catch (err) {
      console.error(err);
      UI.toast(err.message || 'Sorry, the order could not be placed. Please try again.', 'danger');
      btn.disabled = false;
      renderSummary();
    }
  });

  /** Order done: empty the cart and show the thank-you page. */
  function finish(order) {
    UI.track('purchase', { transaction_id: order.order_no, currency: 'INR', value: order.total });
    Cart.clear();
    location.href = `/order-success?no=${encodeURIComponent(order.order_no)}&phone=${order.customer.phone}`;
  }

  // ---------- Razorpay (online payment) ----------
  function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const js = document.createElement('script');
      js.src = 'https://checkout.razorpay.com/v1/checkout.js';
      js.onload = resolve;
      js.onerror = () => reject(new Error('Could not load the payment page. Check your internet and try again.'));
      document.head.appendChild(js);
    });
  }

  async function openRazorpay(rz, order) {
    const btn = $('[data-place]');
    try {
      await loadRazorpayScript();
    } catch (err) {
      UI.toast(err.message, 'danger');
      btn.disabled = false;
      btn.textContent = `Complete payment · ${rupees(order.total)}`;
      btn.onclick = (e) => { e.preventDefault(); openRazorpay(rz, order); };
      return;
    }
    const checkout = new window.Razorpay({
      key: rz.key_id,
      order_id: rz.order_id,
      amount: rz.amount,
      currency: rz.currency,
      name: CONFIG.storeName,
      description: `Order ${order.order_no}`,
      prefill: rz.prefill,
      theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#F55D2C' },
      handler: async (resp) => {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirming payment…';
        try {
          await API.verifyRazorpay({ ...resp, order_no: order.order_no, phone: order.customer.phone });
        } catch (err) {
          // The webhook will still confirm it; the success page shows the latest status
          console.error(err);
        }
        finish(order);
      },
      modal: {
        ondismiss: () => {
          // Customer closed the popup: let them try again with the SAME order
          UI.toast('Payment not completed. You can try again.', 'danger');
          btn.disabled = false;
          btn.textContent = `Complete payment · ${rupees(order.total)}`;
          btn.onclick = (e) => { e.preventDefault(); openRazorpay(rz, order); };
        },
      },
    });
    checkout.on('payment.failed', (r) => UI.toast(r.error?.description || 'Payment failed. Please try again.', 'danger'));
    checkout.open();
  }

  window.addEventListener('cart:change', renderSummary);
  UI.track('begin_checkout', {});
  onFulfilmentChange();
})();
