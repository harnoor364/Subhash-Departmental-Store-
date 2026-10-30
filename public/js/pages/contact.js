/* pages/contact.js — fills the contact page from config.js + settings */
(async function contactPage() {
  const s = await UI.getSettings();
  const a = CONFIG.address;
  document.querySelector('[data-contact]').innerHTML = `
    <dt><i class="bi bi-geo-alt-fill"></i></dt>
    <dd><b>${esc(CONFIG.storeName)}</b><br>${esc(a.line1)}, ${esc(a.line2)},<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</dd>
    <dt><i class="bi bi-pin-map-fill"></i></dt><dd>Plus code: ${esc(a.plusCode)}</dd>
    <dt><i class="bi bi-clock-fill"></i></dt><dd>${esc(hoursText(s))}</dd>
    <dt><i class="bi bi-telephone-fill"></i></dt><dd>${s.phone ? `<a href="tel:+91${esc(s.phone)}">${esc(s.phone)}</a>` : '<span class="text-muted">Phone number coming soon</span>'}</dd>
    <dt><i class="bi bi-whatsapp"></i></dt><dd>${s.whatsapp ? esc(s.whatsapp) : '<span class="text-muted">WhatsApp number coming soon</span>'}</dd>`;
  document.querySelector('[data-directions]').href = CONFIG.mapsDirectionsUrl;

  // Social media profiles (from config.js); section hidden if there are none
  const social = UI.socialLinks('social-link-lg');
  if (social) {
    document.querySelector('[data-social-links]').innerHTML = social;
    document.querySelector('[data-social]').hidden = false;
  }
  document.querySelector('[data-map]').innerHTML =
    `<iframe src="${esc(CONFIG.mapsEmbedUrl)}" title="Map to ${esc(CONFIG.storeName)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
})();
