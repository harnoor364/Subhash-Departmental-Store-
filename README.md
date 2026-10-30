# Subhash Departmental Store — Online Grocery Website

Online store for **Subhash Departmental Store**, Pakhowal Road, Ludhiana.
Built by **Upward Web**.

- Frontend: plain HTML + CSS + vanilla JavaScript (Bootstrap 5 from a CDN). No build step.
- Backend (from Phase 2): Cloudflare Pages Functions + D1 database + R2 photo storage.

> **Current status: Phase 1 — frontend with sample data.**
> Products, prices and settings come from `public/data/sample-catalog.json`.
> Orders are saved only in your own browser (demo). Nothing is sent anywhere yet.

---

## Run it on your computer

1. Install **Node.js** (LTS version) from <https://nodejs.org> → download → install with the default options.
2. Open a terminal in this project folder.
3. Install the project's only tool (Cloudflare's `wrangler`). This downloads it into a `node_modules` folder:

   ```bash
   npm install
   ```

4. Start the local website:

   ```bash
   npm run dev
   ```

   This runs `wrangler pages dev public`, a local copy of Cloudflare Pages.
5. Open <http://localhost:8788> in your browser. Press `Ctrl + C` in the terminal to stop it.

No Cloudflare account is needed for Phase 1.

### What to test in Phase 1

- Homepage: all sections, slider, deals countdown, category tiles, combos, fresh carousel, reviews, map
- Search (try "dal", "oil", "masala"), category pages, sorting, "In stock only"
- Product page → "Frequently bought together"
- Add / + / − buttons, cart drawer, free-delivery progress bar
- Checkout:
  - Pincode `142022` is accepted; any other pincode should be rejected.
  - Try store pickup, and the coupons `WELCOME50` and `SAVE10`.
  - Orders under ₹199 should be blocked.
- Order success → enter any 12-digit number as the UTR → Track order → My orders → Reorder
- Light/dark toggle (top right), mobile bottom nav (use your phone, or your browser's mobile view)

---

## Folder structure

```
public/                    Everything the browser sees (Cloudflare serves this folder)
  index.html               Homepage
  category.html            Category / search / deals listing
  product.html             Single product
  checkout.html, order-success.html, track.html, my-orders.html
  bulk-order.html, contact.html, privacy.html, terms.html, refund.html, 404.html
  areas/                   Local SEO landing pages
  css/theme.css            ★ Brand colours, font, corner radius (rebrand here)
  css/store.css            Layout and components
  js/config.js             ★ Store name, address, reviews, texts (edit here)
  js/utils.js              Small helpers (rupee format, phone check, store hours…)
  js/api.js                The ONLY file that loads data / talks to the server
  js/art.js                SVG product illustrations (used until real photos are uploaded)
  js/cart.js               Cart (saved in the browser) + price calculator
  js/ui.js                 Header, footer, bottom nav, cart drawer, product cards
  js/pages/*.js            One script per page
  data/sample-catalog.json Phase 1 sample products/settings (replaced by the database in Phase 2)
  img/                     Favicon and images
```

## Quick changes

| I want to… | Edit |
|---|---|
| Change colours or font | `public/css/theme.css` |
| Change store name, address, reviews, "why us" text | `public/js/config.js` |
| Change sample products/prices (Phase 1 only) | `public/data/sample-catalog.json` |
| Change homepage section order or headings | `public/index.html` |
| Change policy text | `public/privacy.html`, `terms.html`, `refund.html` |

A full "How do I…?" guide (`CHANGES.md`) and the deployment and secrets guide come in the later phases.
