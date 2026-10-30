/* pages/area.js — local SEO pages: show a few popular products under the text */
(async function areaPage() {
  const list = (await API.products({ featured: true })).slice(0, 10);
  document.querySelector('[data-area-products]').innerHTML = list.map(UI.productCard).join('');
})();
