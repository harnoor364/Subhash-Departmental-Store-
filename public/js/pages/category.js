/* =====================================================================
   pages/category.js — category, search and deals listing page
   URL examples:
     /category                 all products
     /category?c=masale        one category
     /category?q=dal           search results
     /category?deals=1         today's deals
     /category?featured=1      featured products
   ===================================================================== */

(async function categoryPage() {
  const $ = (sel) => document.querySelector(sel);
  const cat = qp('c'), q = qp('q'), deals = qp('deals'), featured = qp('featured');

  try {
    const categories = await API.categories();
    const current = categories.find((c) => c.id === cat);

    // Page title
    let title = 'All products';
    if (current) title = current.name;
    else if (q) title = `Results for “${q}”`;
    else if (deals) title = "Today's Deals";
    else if (featured) title = 'Featured products';
    $('[data-title]').textContent = title;
    $('[data-crumb]').textContent = title;
    document.title = `${title} – ${CONFIG.storeName}, ${CONFIG.city}`;

    const list = await API.products({ category: cat, q, deal: !!deals, featured: !!featured });
    if (q) UI.track('view_search_results', { search_term: q });

    const sortEl = $('[data-sort]');
    const stockEl = $('[data-instock]');

    function render() {
      let items = list.slice();
      if (stockEl.checked) items = items.filter((p) => p.in_stock);
      const sort = sortEl.value;
      if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
      if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
      if (sort === 'discount') items.sort((a, b) => percentOff(b.mrp, b.price) - percentOff(a.mrp, a.price));

      $('[data-results]').innerHTML = items.map(UI.productCard).join('');
      $('[data-count]').textContent = `${items.length} product${items.length === 1 ? '' : 's'}`;
      $('[data-empty]').hidden = items.length > 0;
    }

    sortEl.addEventListener('change', render);
    stockEl.addEventListener('change', render);
    render();
  } catch (err) {
    console.error(err);
    UI.toast('Sorry, products could not load. Please refresh.', 'danger');
  }
})();
