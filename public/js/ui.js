/* =====================================================================
   ui.js — parts shared by EVERY storefront page
   ---------------------------------------------------------------------
   - Header (top strip, logo, search, dark-mode toggle, cart button)
   - Category nav bar, footer, mobile bottom nav, floating WhatsApp
   - Cart drawer, product cards with Add / + / - buttons, toasts

   Each HTML page only needs:
     <div id="site-header"></div> ... <div id="site-footer"></div>
   and the script tags. This file fills those in automatically.
   ===================================================================== */

const UI = (() => {
  let settingsCache = null;

  // ---------------------------------------------------------------- toast
  function toast(message, type = 'dark') {
    let box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast-msg toast-${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.classList.add('hide'), 2400);
    setTimeout(() => el.remove(), 2800);
  }

  // ------------------------------------------------------------- tracking
  /** Google Analytics event (does nothing until GA4 is set up in Phase 5). */
  function track(name, params = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  // --------------------------------------------------------------- header
  function headerHTML() {
    return `
    <div class="top-strip">
      <div class="container">
        <span class="top-strip-text"><i class="bi bi-clock"></i>
          <span data-hours>Open till 10 PM</span><span class="d-none d-sm-inline"> · ${esc(CONFIG.topStrip)}</span>
        </span>
        <a href="#" class="top-call" data-call><i class="bi bi-telephone-fill"></i> Call</a>
      </div>
    </div>
    <div class="sample-strip d-none" data-sample-strip>
      <i class="bi bi-info-circle"></i> Demo mode – sample products &amp; prices for testing
    </div>
    <header class="site-header">
      <div class="container header-row">
        <a class="logo" href="/" aria-label="${esc(CONFIG.storeName)} home">
          <span class="logo-icon">${esc(CONFIG.logoLetter)}</span>
          <span class="logo-text"><b>${esc(CONFIG.shortName)}</b><small>${esc(CONFIG.tagline)}</small></span>
        </a>
        <form class="search" action="/category" role="search" autocomplete="off">
          <i class="bi bi-search"></i>
          <input type="search" name="q" placeholder="${esc(CONFIG.searchPlaceholder)}" aria-label="Search products" maxlength="60">
          <div class="search-suggest" hidden></div>
        </form>
        <div class="header-actions">
          <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch light / dark mode">
            <i class="bi bi-moon-stars"></i>
          </button>
          <a class="icon-btn d-none d-md-inline-flex" href="/my-orders" aria-label="My orders"><i class="bi bi-receipt"></i></a>
          <button class="cart-btn" type="button" data-open-cart aria-label="Open cart">
            <i class="bi bi-cart3"></i><span class="d-none d-md-inline">Cart</span>
            <span class="cart-count" data-cart-count>0</span>
          </button>
        </div>
      </div>
    </header>
    <nav class="cat-nav" aria-label="Categories">
      <div class="container cat-nav-list" data-cat-nav>
        <a href="/category">All</a>
      </div>
    </nav>`;
  }

  // ---------------------------------------------------------------- social
  // Icon + name for each social network in CONFIG.social (Bootstrap Icons)
  const SOCIAL = {
    facebook: ['bi-facebook', 'Facebook'],
    instagram: ['bi-instagram', 'Instagram'],
    youtube: ['bi-youtube', 'YouTube'],
    x: ['bi-twitter-x', 'X (Twitter)'],
    googleBusiness: ['bi-google', 'Google'],
    justdial: ['bi-telephone-outbound', 'Justdial'],
  };

  /** Round icon links for every social profile that has a link. '' if none. */
  function socialLinks(extraClass = '') {
    const links = Object.entries(CONFIG.social || {})
      .filter(([key, url]) => SOCIAL[key] && /^https?:\/\//.test(url || ''))
      .map(([key, url]) => `<a class="social-link ${extraClass}" href="${esc(url)}" target="_blank" rel="noopener"
          aria-label="${esc(CONFIG.storeName)} on ${SOCIAL[key][1]}" title="${SOCIAL[key][1]}"><i class="bi ${SOCIAL[key][0]}"></i></a>`);
    return links.length ? `<div class="social-row">${links.join('')}</div>` : '';
  }

  // --------------------------------------------------------------- footer
  function footerHTML() {
    const a = CONFIG.address;
    const year = new Date().getFullYear();
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="row g-4">
          <div class="col-12 col-lg-4">
            <a class="logo logo-light" href="/">
              <span class="logo-icon">${esc(CONFIG.logoLetter)}</span>
              <span class="logo-text"><b>${esc(CONFIG.shortName)}</b><small>${esc(CONFIG.tagline)}</small></span>
            </a>
            <p class="mt-3 mb-2 footer-muted">Your neighbourhood departmental store on Pakhowal Road, Ludhiana.
              Order online for home delivery or in-store pickup.</p>
            <p class="mb-0"><i class="bi bi-star-fill text-warning"></i>
              <b>${CONFIG.rating.value}</b> on Google <span class="footer-muted">(${CONFIG.rating.count} reviews)</span></p>
            ${socialLinks()}
          </div>
          <div class="col-6 col-lg-2">
            <h6>Shop</h6>
            <ul data-footer-cats><li><a href="/category">All products</a></li></ul>
          </div>
          <div class="col-6 col-lg-2">
            <h6>Help</h6>
            <ul>
              <li><a href="/track">Track order</a></li>
              <li><a href="/my-orders">My orders</a></li>
              <li><a href="/bulk-order">Bulk order enquiry</a></li>
              <li><a href="/contact">Contact us</a></li>
              <li><a href="/privacy">Privacy policy</a></li>
              <li><a href="/terms">Terms &amp; conditions</a></li>
              <li><a href="/refund">Refund &amp; cancellation</a></li>
            </ul>
          </div>
          <div class="col-12 col-lg-4">
            <h6>Visit us</h6>
            <p class="mb-2"><i class="bi bi-geo-alt"></i> ${esc(CONFIG.storeName)}<br>
              ${esc(a.line1)}, ${esc(a.line2)},<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</p>
            <p class="mb-2 footer-muted">Plus code: ${esc(a.plusCode)}</p>
            <p class="mb-3"><i class="bi bi-clock"></i> <span data-hours>Open till 10 PM</span></p>
            <a class="btn btn-brand btn-sm" href="${esc(CONFIG.mapsDirectionsUrl)}" target="_blank" rel="noopener">
              <i class="bi bi-sign-turn-right"></i> Get directions</a>
            <div class="footer-areas mt-3">
              <a href="/areas/grocery-delivery-basant-city">Grocery delivery in Basant City</a> ·
              <a href="/areas/kirana-store-pakhowal-road">Kirana store near Pakhowal Road</a> ·
              <a href="/areas/monthly-ration-delivery-ludhiana">Monthly ration delivery Ludhiana</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ${esc(CONFIG.storeName)}, ${esc(CONFIG.city)}</span>
          <a href="${esc(CONFIG.credit.url)}" target="_blank" rel="noopener" title="Upward Web – website design, Ludhiana">${esc(CONFIG.credit.text)}</a>
        </div>
      </div>
    </footer>

    <a class="wa-float" href="#" data-whatsapp aria-label="Chat on WhatsApp"><i class="bi bi-whatsapp"></i></a>

    <nav class="bottom-nav" aria-label="Main">
      <a href="/" data-nav="home"><i class="bi bi-house"></i><span>Home</span></a>
      <a href="/category" data-nav="category"><i class="bi bi-grid"></i><span>Categories</span></a>
      <button type="button" data-open-cart data-nav="cart"><i class="bi bi-cart3"></i><span>Cart</span>
        <b class="cart-count" data-cart-count>0</b></button>
      <a href="/my-orders" data-nav="orders"><i class="bi bi-receipt"></i><span>Orders</span></a>
      <a href="#" data-whatsapp class="wa"><i class="bi bi-whatsapp"></i><span>WhatsApp</span></a>
    </nav>

    <div class="offcanvas offcanvas-end cart-drawer" tabindex="-1" id="cartDrawer" aria-labelledby="cartDrawerTitle">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="cartDrawerTitle"><i class="bi bi-cart3"></i> Your cart</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body" data-cart-body></div>
    </div>`;
  }

  // ---------------------------------------------------------- product card
  /** The Add button, or a - qty + stepper if already in the cart. */
  function qtyControl(id, inStock = true) {
    if (!inStock) return `<button class="btn-add" disabled>Out of stock</button>`;
    const q = Cart.qty(id);
    if (!q) return `<button class="btn-add" type="button" data-add="${esc(id)}"><i class="bi bi-plus-lg"></i> Add</button>`;
    return `<div class="stepper">
      <button type="button" data-dec="${esc(id)}" aria-label="Remove one">−</button>
      <span aria-live="polite">${q}</span>
      <button type="button" data-inc="${esc(id)}" aria-label="Add one">+</button>
    </div>`;
  }

  /** Wrap a qty control so it refreshes itself when the cart changes. */
  function qtySlot(id, inStock) {
    return `<div class="qty-slot" data-qty-for="${esc(id)}" data-instock="${inStock ? 1 : 0}">${qtyControl(id, inStock)}</div>`;
  }

  function productCard(p) {
    const off = percentOff(p.mrp, p.price);
    const url = `/product?p=${encodeURIComponent(p.id)}`;
    return `
    <div class="p-card${p.in_stock ? '' : ' is-out'}">
      <a class="p-img" href="${url}" tabindex="-1">
        ${Art.productImage(p)}
        ${off ? `<span class="p-off">${off}% OFF</span>` : ''}
        ${p.in_stock ? '' : '<span class="p-out">Out of stock</span>'}
      </a>
      <div class="p-body">
        <div class="p-weight">${esc(p.weight)}</div>
        <a class="p-name" href="${url}">${esc(p.name)}</a>
        <div class="p-price">
          <b>${rupees(p.price)}</b>
          ${p.mrp > p.price ? `<s>MRP ${rupees(p.mrp)}</s>` : ''}
        </div>
        <div class="p-save">${p.mrp > p.price ? `You save ${rupees(p.mrp - p.price)}` : '&nbsp;'}</div>
        ${qtySlot(p.id, p.in_stock)}
      </div>
    </div>`;
  }

  function comboCard(c) {
    const id = 'combo:' + c.id;
    return `
    <div class="combo-card">
      <div class="combo-img">${Art.productImage(c)}</div>
      <div class="combo-body">
        <h3>${esc(c.name)}</h3>
        <ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="p-price"><b>${rupees(c.price)}</b> ${c.mrp > c.price ? `<s>${rupees(c.mrp)}</s>` : ''}</div>
        ${qtySlot(id, c.in_stock)}
      </div>
    </div>`;
  }

  function refreshQtySlots() {
    document.querySelectorAll('[data-qty-for]').forEach((el) => {
      el.innerHTML = qtyControl(el.dataset.qtyFor, el.dataset.instock === '1');
    });
    const n = Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.classList.toggle('is-empty', n === 0);
    });
  }

  // ----------------------------------------------------------- cart drawer
  function freeDeliveryBar(q, s) {
    if (!q.lines.length) return '';
    const pct = Math.min(100, Math.round((q.subtotal / s.free_delivery_above) * 100));
    const msg = q.free_delivery_gap > 0
      ? `Add <b>${rupees(q.free_delivery_gap)}</b> more for <b>free delivery</b>`
      : '<i class="bi bi-check-circle-fill"></i> You get <b>free delivery</b>!';
    return `<div class="free-bar"><div class="free-bar-text">${msg}</div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${pct}%"></div></div></div>`;
  }

  let drawerSeq = 0; // ignores slow, out-of-date price replies

  /** Draw the cart drawer. Only runs while the drawer is open (or opening). */
  async function renderDrawer(force) {
    const drawer = document.getElementById('cartDrawer');
    const body = document.querySelector('[data-cart-body]');
    if (!body) return;
    if (force !== true && !drawer.classList.contains('show') && !drawer.classList.contains('showing')) return;
    if (!body.innerHTML.trim()) body.innerHTML = '<div class="text-center p-5"><span class="spinner-border text-secondary"></span></div>';
    const seq = ++drawerSeq;
    try {
      const [s, q] = await Promise.all([getSettings(), Pricing.quote()]);
      if (seq !== drawerSeq) return;
      if (!q.lines.length) {
        body.innerHTML = `<div class="empty-state">
          <i class="bi bi-basket"></i><p>Your cart is empty</p>
          <a href="/category" class="btn btn-brand">Start shopping</a></div>`;
        return;
      }
      body.innerHTML = `
        ${freeDeliveryBar(q, s)}
        <div class="cart-lines">
          ${q.lines.map((l) => `
            <div class="cart-line">
              <div class="cart-line-img">${Art.productImage(l)}</div>
              <div class="cart-line-info">
                <div class="cart-line-name">${esc(l.name)}</div>
                <div class="cart-line-meta">${esc(l.weight)} · ${rupees(l.price)}</div>
                ${l.in_stock ? '' : '<div class="text-danger small">Out of stock</div>'}
              </div>
              <div class="cart-line-right">
                ${qtySlot(l.cart_id, true)}
                <b>${rupees(l.line_total)}</b>
              </div>
            </div>`).join('')}
        </div>
        <div class="cart-summary">
          <div><span>Item total</span><span>${rupees(q.subtotal)}</span></div>
          ${q.mrp_total > q.subtotal ? `<div class="text-success"><span>You save</span><span>${rupees(q.mrp_total - q.subtotal)}</span></div>` : ''}
          <div><span>Delivery</span><span>${q.delivery_charge ? rupees(q.delivery_charge) : 'FREE'}</span></div>
          <div class="cart-total"><span>Total</span><span>${rupees(q.total)}</span></div>
          ${q.errors.length ? `<div class="alert alert-warning py-2 small mb-2">${esc(q.errors[0])}</div>` : ''}
          <a href="/checkout" class="btn btn-brand w-100 btn-lg${q.errors.length ? ' disabled' : ''}">
            Checkout <i class="bi bi-arrow-right"></i></a>
          <button type="button" class="btn btn-link btn-sm w-100 mt-1 text-muted" data-clear-cart>Clear cart</button>
        </div>`;
    } catch (err) {
      console.error(err);
      body.innerHTML = '<p class="p-3">Sorry, the cart could not load. Please refresh the page.</p>';
    }
  }

  function openCart() {
    const el = document.getElementById('cartDrawer');
    if (el && window.bootstrap) bootstrap.Offcanvas.getOrCreateInstance(el).show();
  }

  // --------------------------------------------------------------- search
  function setupSearch() {
    const form = document.querySelector('.search');
    if (!form) return;
    const input = form.querySelector('input');
    const box = form.querySelector('.search-suggest');
    input.value = qp('q');

    const show = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { box.hidden = true; return; }
      const list = await API.products({ q, limit: 6 });
      box.innerHTML = list.length
        ? list.map((p) => `<a href="/product?p=${encodeURIComponent(p.id)}">
            <span class="ss-img">${Art.productImage(p)}</span>
            <span class="ss-name">${esc(p.name)} <small>${esc(p.weight)}</small></span>
            <b>${rupees(p.price)}</b></a>`).join('') +
          `<a class="ss-all" href="/category?q=${encodeURIComponent(q)}">See all results for “${esc(q)}”</a>`
        : `<div class="ss-none">No products found for “${esc(q)}”</div>`;
      box.hidden = false;
    }, 200);

    input.addEventListener('input', show);
    input.addEventListener('focus', show);
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) box.hidden = true; });
    form.addEventListener('submit', (e) => {
      if (!input.value.trim()) e.preventDefault();
      else track('search', { search_term: input.value.trim() });
    });
  }

  // ------------------------------------------------------------ dark mode
  function setupTheme() {
    const btn = document.querySelector('[data-theme-toggle]');
    const update = () => {
      const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
      if (btn) btn.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
    };
    btn?.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', next);
      try { localStorage.setItem('sds_theme', next); } catch {}
      update();
    });
    update();
  }

  // ------------------------------------------------------------- settings
  function getSettings() {
    if (!settingsCache) settingsCache = API.settings();
    return settingsCache;
  }

  /** Fill in things that depend on settings: hours, call / WhatsApp links. */
  async function applySettings() {
    const s = await getSettings();
    const open = isStoreOpen(s);
    document.querySelectorAll('[data-hours]').forEach((el) => {
      el.textContent = hoursText(s) + (s.store_open ? '' : ' · Closed today');
    });
    document.querySelector('[data-sample-strip]')?.classList.toggle('d-none', !s.sample_mode);

    const wa = whatsappLink(s.whatsapp, `Hi ${CONFIG.storeName}, I want to place an order.`);
    document.querySelectorAll('[data-whatsapp]').forEach((el) => {
      if (wa) { el.href = wa; el.target = '_blank'; el.rel = 'noopener'; }
    });
    document.querySelectorAll('[data-call]').forEach((el) => {
      if (s.phone) el.href = 'tel:+91' + String(s.phone).replace(/\D/g, '').slice(-10);
    });
    document.body.classList.toggle('store-closed', !open);
  }

  async function fillCategoryLinks() {
    const cats = await API.categories();
    const current = qp('c');
    const nav = document.querySelector('[data-cat-nav]');
    if (nav) {
      nav.innerHTML = `<a href="/category" class="${document.body.dataset.page === 'category' && !current && !qp('q') ? 'active' : ''}">All</a>` +
        cats.map((c) => `<a href="/category?c=${c.id}" class="${c.id === current ? 'active' : ''}">${esc(c.name)}</a>`).join('');
      nav.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    const foot = document.querySelector('[data-footer-cats]');
    if (foot) foot.innerHTML = cats.map((c) => `<li><a href="/category?c=${c.id}">${esc(c.name)}</a></li>`).join('');
  }

  // --------------------------------------------------------- click events
  function setupClicks() {
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-open-cart],[data-clear-cart],[data-whatsapp],[data-call]');
      if (!t) return;

      if (t.dataset.add) {
        Cart.add(t.dataset.add, 1);
        track('add_to_cart', { item_id: t.dataset.add });
        if (Cart.count() === 1) toast('Added to cart');
      } else if (t.dataset.inc) {
        Cart.add(t.dataset.inc, 1);
      } else if (t.dataset.dec) {
        Cart.add(t.dataset.dec, -1);
      } else if (t.hasAttribute('data-open-cart')) {
        openCart();
      } else if (t.hasAttribute('data-clear-cart')) {
        if (confirm('Remove all items from your cart?')) Cart.clear();
      } else if ((t.hasAttribute('data-whatsapp') || t.hasAttribute('data-call')) && t.getAttribute('href') === '#') {
        e.preventDefault();
        toast('Our phone number will be added here soon.');
      }
    });
  }

  // ------------------------------------------------------------------ init
  function init() {
    const head = document.getElementById('site-header');
    const foot = document.getElementById('site-footer');
    if (head) head.innerHTML = headerHTML();
    if (foot) foot.innerHTML = footerHTML();

    // Photos with class "fade-in" appear smoothly once downloaded (or if they fail)
    const reveal = (e) => { if (e.target.classList?.contains('fade-in')) e.target.classList.add('is-loaded'); };
    document.addEventListener('load', reveal, true);
    document.addEventListener('error', reveal, true);
    document.querySelectorAll('img.fade-in').forEach((img) => { if (img.complete && img.src) img.classList.add('is-loaded'); });

    document.querySelectorAll('[data-store-photo]').forEach((img) => {
      img.src = CONFIG.storePhoto;
      img.alt = CONFIG.storePhotoAlt;
    });

    const page = document.body.dataset.page;
    document.querySelector(`.bottom-nav [data-nav="${page}"]`)?.classList.add('active');

    setupTheme();
    setupSearch();
    setupClicks();
    refreshQtySlots();

    window.addEventListener('cart:change', () => { refreshQtySlots(); renderDrawer(); });
    document.getElementById('cartDrawer')?.addEventListener('show.bs.offcanvas', () => renderDrawer(true));

    applySettings().catch(console.error);
    fillCategoryLinks().catch(console.error);
  }

  init();

  return { socialLinks, toast, track, productCard, comboCard, qtySlot, refreshQtySlots, freeDeliveryBar, openCart, getSettings };
})();
