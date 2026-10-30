/* =====================================================================
   pages/product.js — single product page  (/product?p=<product-id>)
   Shows the product, "frequently bought together" and similar items.
   ===================================================================== */

(async function productPage() {
  const $ = (sel) => document.querySelector(sel);
  const box = $('[data-product]');

  try {
    const p = await API.product(qp('p'));
    if (!p) {
      box.innerHTML = `<div class="empty-state"><i class="bi bi-question-circle"></i>
        <p>Sorry, this product is not available.</p><a class="btn btn-brand" href="/category">Browse products</a></div>`;
      return;
    }

    const [categories, all] = await Promise.all([API.categories(), API.products()]);
    const cat = categories.find((c) => c.id === p.category);
    const off = percentOff(p.mrp, p.price);

    document.title = `${p.name} ${p.weight} – ${CONFIG.storeName}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      `Buy ${p.name} (${p.weight}) at ${rupees(p.price)} from ${CONFIG.storeName}, ${CONFIG.city}. Home delivery & store pickup.`);
    $('[data-crumb]').innerHTML = cat
      ? `<a href="/category?c=${cat.id}">${esc(cat.name)}</a>&nbsp;/&nbsp;${esc(p.name)}` : esc(p.name);

    box.innerHTML = `
      <div class="pd">
        <div class="pd-img${p.in_stock ? '' : ' p-card is-out'}">
          ${Art.productImage(p)}
          ${off ? `<span class="p-off" style="top:14px;left:14px;font-size:.85rem">${off}% OFF</span>` : ''}
        </div>
        <div>
          <div class="text-muted small">${cat ? esc(cat.name) : ''}</div>
          <h1>${esc(p.name)}</h1>
          <div class="text-muted mb-2">${esc(p.weight)}</div>
          <div class="pd-price mb-1"><b>${rupees(p.price)}</b>
            ${p.mrp > p.price ? `<s class="ms-2">MRP ${rupees(p.mrp)}</s>` : ''}</div>
          ${p.mrp > p.price ? `<div class="p-save mb-3">You save ${rupees(p.mrp - p.price)} (${off}%)</div>` : '<div class="mb-3 small text-muted">Inclusive of all taxes</div>'}
          ${p.in_stock ? '' : '<div class="alert alert-secondary py-2">Currently out of stock</div>'}
          ${UI.qtySlot(p.id, p.in_stock)}
          <p class="mt-4">${esc(p.description || '')}</p>
          <ul class="pd-points">
            <li><i class="bi bi-truck"></i>Home delivery or free store pickup</li>
            <li><i class="bi bi-cash-coin"></i>Pay by UPI or cash on delivery</li>
            <li><i class="bi bi-shop"></i>${esc(CONFIG.storeName)}, Pakhowal Road, ${esc(CONFIG.city)}</li>
          </ul>
        </div>
      </div>`;

    UI.track('view_item', { currency: 'INR', value: p.price, items: [{ item_id: p.id, item_name: p.name, price: p.price }] });

    // Frequently bought together
    const fbt = (p.fbt || []).map((id) => all.find((x) => x.id === id)).filter(Boolean);
    if (fbt.length) {
      $('[data-fbt]').innerHTML = fbt.map(UI.productCard).join('');
      $('[data-fbt-section]').hidden = false;
    }

    // More from this category
    const similar = all.filter((x) => x.category === p.category && x.id !== p.id && !fbt.includes(x));
    if (similar.length) {
      $('[data-similar]').innerHTML = similar.map(UI.productCard).join('');
      $('[data-similar-link]').href = `/category?c=${p.category}`;
      $('[data-similar-section]').hidden = false;
    }
  } catch (err) {
    console.error(err);
    box.innerHTML = '<p class="py-5 text-center">Sorry, this product could not load. Please refresh.</p>';
  }
})();
