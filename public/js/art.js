/* =====================================================================
   art.js — vector (SVG) product illustrations
   ---------------------------------------------------------------------
   Until real photos are uploaded from the admin panel, every product is
   drawn as a simple package shape in its own colour with a short label.

   A product's "art" looks like: { shape: 'sack', color: '#C8963E', label: 'ATTA' }
   Shapes: sack, pouch, bottle, jar, carton, box, tube, loaf, gift,
           round (tomato/onion/apple...), banana, leafy, long (carrot)

   To add a new shape: add a function to SHAPES below.
   ===================================================================== */

const Art = (() => {
  /** Make a colour lighter (amount > 0) or darker (amount < 0). amount: -1..1 */
  function shade(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
    r = mix(r); g = mix(g); b = mix(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /** White label with product text. Font size shrinks for long labels. */
  function label(text, x, y, w, h, color) {
    if (!text) return '';
    const size = Math.min(16, Math.floor((w - 10) / (text.length * 0.62)));
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#fff" opacity=".94"/>
      <text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle"
        font-family="Poppins,Arial,sans-serif" font-weight="700" font-size="${size}"
        fill="${shade(color, -0.45)}">${esc(text)}</text>`;
  }

  // Each shape returns SVG markup for a 200 x 200 box.
  const SHAPES = {
    sack: (c, t) => `
      <path d="M52 62 Q46 42 62 38 L138 38 Q154 42 148 62 L160 168 Q161 182 147 182 L53 182 Q39 182 40 168 Z" fill="${c}"/>
      <path d="M58 40 Q100 26 142 40 L138 54 Q100 44 62 54 Z" fill="${shade(c, -0.25)}"/>
      <path d="M60 70 L58 170" stroke="${shade(c, 0.25)}" stroke-width="6" stroke-linecap="round" opacity=".5"/>
      ${label(t, 62, 100, 76, 44, c)}`,

    pouch: (c, t) => `
      <rect x="52" y="40" width="96" height="142" rx="14" fill="${c}"/>
      <path d="M52 52 L148 52 L148 44 Q148 36 140 36 L60 36 Q52 36 52 44 Z" fill="${shade(c, -0.25)}"/>
      <path d="M56 36 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke="${shade(c, -0.25)}" stroke-width="3"/>
      <rect x="60" y="62" width="10" height="110" rx="5" fill="${shade(c, 0.3)}" opacity=".45"/>
      ${label(t, 62, 100, 76, 40, c)}`,

    bottle: (c, t) => `
      <rect x="86" y="22" width="28" height="18" rx="4" fill="${shade(c, -0.35)}"/>
      <path d="M88 40 L112 40 L112 56 Q140 66 140 92 L140 172 Q140 184 128 184 L72 184 Q60 184 60 172 L60 92 Q60 66 88 56 Z" fill="${c}"/>
      <rect x="68" y="80" width="9" height="90" rx="4.5" fill="#fff" opacity=".3"/>
      ${label(t, 66, 110, 68, 40, c)}`,

    jar: (c, t) => `
      <rect x="56" y="38" width="88" height="24" rx="6" fill="${shade(c, -0.35)}"/>
      <rect x="50" y="58" width="100" height="124" rx="18" fill="${c}"/>
      <rect x="60" y="70" width="10" height="100" rx="5" fill="#fff" opacity=".3"/>
      ${label(t, 62, 102, 76, 42, c)}`,

    carton: (c, t) => `
      <path d="M62 60 L100 30 L138 60 Z" fill="${shade(c, -0.25)}"/>
      <rect x="92" y="22" width="16" height="10" rx="2" fill="${shade(c, -0.4)}"/>
      <rect x="62" y="60" width="76" height="124" rx="6" fill="#fff" stroke="${c}" stroke-width="4"/>
      <path d="M62 140 Q100 120 138 140 L138 178 Q138 184 132 184 L68 184 Q62 184 62 178 Z" fill="${c}"/>
      ${label(t, 68, 86, 64, 36, c)}`,

    box: (c, t) => `
      <path d="M48 58 L68 40 L162 40 L142 58 Z" fill="${shade(c, 0.25)}"/>
      <path d="M142 58 L162 40 L162 160 L142 178 Z" fill="${shade(c, -0.3)}"/>
      <rect x="48" y="58" width="94" height="120" rx="4" fill="${c}"/>
      ${label(t, 54, 100, 82, 40, c)}`,

    tube: (c, t) => `
      <rect x="88" y="18" width="24" height="22" rx="4" fill="${shade(c, -0.35)}"/>
      <path d="M84 40 L116 40 L140 168 L60 168 Z" fill="${c}"/>
      <rect x="56" y="166" width="88" height="16" rx="3" fill="${shade(c, -0.25)}"/>
      ${label(t, 66, 96, 68, 36, c)}`,

    loaf: (c, t) => `
      <path d="M40 104 Q40 58 100 58 Q160 58 160 104 Q160 120 148 122 L148 172 Q148 182 138 182 L62 182 Q52 182 52 172 L52 122 Q40 120 40 104 Z" fill="${c}"/>
      <path d="M48 104 Q50 70 100 68 Q150 70 152 104" fill="none" stroke="${shade(c, -0.25)}" stroke-width="4"/>
      ${label(t, 62, 124, 76, 38, c)}`,

    gift: (c, t) => `
      <rect x="40" y="76" width="120" height="104" rx="8" fill="${c}"/>
      <rect x="34" y="62" width="132" height="26" rx="6" fill="${shade(c, -0.2)}"/>
      <rect x="92" y="62" width="16" height="118" fill="#FFD54F"/>
      <path d="M100 62 Q72 30 66 50 Q62 64 100 62 Q138 64 134 50 Q128 30 100 62Z" fill="#FFD54F"/>
      ${label(t, 48, 118, 104, 36, c)}`,

    round: (c) => `
      <ellipse cx="100" cy="182" rx="56" ry="8" fill="#000" opacity=".08"/>
      <circle cx="100" cy="116" r="62" fill="${c}"/>
      <ellipse cx="78" cy="94" rx="16" ry="22" fill="#fff" opacity=".28" transform="rotate(-25 78 94)"/>
      <path d="M100 56 Q96 40 104 32" stroke="#5D4037" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M102 50 Q124 30 142 44 Q122 60 102 50 Z" fill="#43A047"/>`,

    banana: (c) => `
      <path d="M42 70 Q60 170 160 150 Q170 146 162 140 Q80 140 58 64 Z" fill="${c}"/>
      <path d="M56 58 Q74 150 168 126 Q176 122 168 116 Q92 124 72 52 Z" fill="${shade(c, -0.08)}"/>
      <path d="M40 72 L56 56 L60 66 L48 76 Z" fill="#6D4C41"/>`,

    leafy: (c) => `
      <path d="M100 184 Q60 140 56 80 Q58 40 90 30 Q96 110 100 184Z" fill="${c}"/>
      <path d="M100 184 Q140 140 144 80 Q142 40 110 30 Q104 110 100 184Z" fill="${shade(c, 0.15)}"/>
      <path d="M100 184 Q92 100 100 40 Q108 100 100 184Z" fill="${shade(c, -0.2)}"/>
      <rect x="92" y="150" width="16" height="16" rx="3" fill="#A1887F"/>`,

    long: (c) => `
      <path d="M70 60 Q100 46 128 62 L104 186 Q100 192 96 186 Z" fill="${c}"/>
      <path d="M84 80 L94 82 M90 110 L100 112 M94 140 L102 142" stroke="${shade(c, -0.25)}" stroke-width="3" stroke-linecap="round"/>
      <path d="M100 56 Q84 24 72 30 M100 56 Q100 20 108 18 M100 56 Q120 26 132 34" stroke="#43A047" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  };

  /**
   * Build an <svg> for a product or combo.
   * @param {object} art   { shape, color, label }
   * @param {string} title accessible name (e.g. product name)
   */
  function svg(art, title = '') {
    const a = art || {};
    const color = /^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '#F55D2C';
    const draw = SHAPES[a.shape] || SHAPES.box;
    return `<svg viewBox="0 0 200 200" class="art-svg" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="108" r="88" fill="${color}" opacity=".10"/>
      ${draw(color, String(a.label || '').slice(0, 14))}
    </svg>`;
  }

  /**
   * Image for a product: real photo if uploaded (image_url), else SVG art.
   * Photos are lazy-loaded so the page stays fast on mobile data.
   */
  function productImage(item) {
    if (item.image_url) {
      return `<img class="fade-in" src="${esc(item.image_url)}" alt="${esc(item.name)}" loading="lazy" decoding="async">`;
    }
    return svg(item.art, item.name);
  }

  return { svg, productImage, shade };
})();
