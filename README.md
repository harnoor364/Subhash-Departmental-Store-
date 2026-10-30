# Subhash Departmental Store — Online Grocery Website

Online store for **Subhash Departmental Store**, Pakhowal Road, Ludhiana.
Built by **Upward Web**.

- Frontend: plain HTML + CSS + vanilla JavaScript (Bootstrap 5 from a CDN). No build step.
- Backend (from Phase 2): Cloudflare Pages Functions + D1 database + R2 photo storage.

> **Current status: Phase 2 — database + API.**
> Products, categories, settings, banners, combos and all prices come from the
> Cloudflare D1 database. Orders are still a browser-only demo until Phase 3.

---

## 1. Run it on your computer

You need **Node.js** (LTS) from <https://nodejs.org>. Open a terminal in this project folder and run these commands.

1. Download the project's only tool, Cloudflare's `wrangler` (only needed once):

   ```bash
   npm install
   ```

2. Copy the secrets template. The copy is git-ignored and stays empty for now:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   On Windows Command Prompt, use `copy .dev.vars.example .dev.vars` instead.

3. Create the tables in a **local** test database. It lives in the hidden `.wrangler` folder on your computer:

   ```bash
   npm run db:migrate:local
   ```

4. Fill the local database with the 48 sample products:

   ```bash
   npm run db:seed:local
   ```

5. Start the website and the API together:

   ```bash
   npm run dev
   ```

6. Open <http://localhost:8788>. Press `Ctrl + C` to stop.

To wipe the local database and start fresh, run `npm run db:reset:local`.

No Cloudflare account is needed for local testing.

### Test checklist

- Homepage: every section loads (data now comes from `/api/...`)
- Search: try "dal", "moong dal", "oil", or the Hindi word मसाले
- Category pages, sorting, "In stock only", product page with "Frequently bought together"
- Cart drawer and checkout totals (calculated by the server):
  - Coupons `WELCOME50` (orders ₹499 and up) and `SAVE10` (orders ₹999 and up)
  - An order under ₹199 is blocked.
  - Delivery is free from ₹499.
- Light/dark mode and the mobile bottom nav
- You can open the API directly in your browser: <http://localhost:8788/api/products?q=dal>

---

## 2. Create the live database (Cloudflare)

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. Log wrangler in to your account (a browser window opens, then click **Allow**):

   ```bash
   npx wrangler login
   ```

3. Create the database. `apac` keeps it in Asia-Pacific, close to Ludhiana:

   ```bash
   npx wrangler d1 create subhash-store-db --location=apac
   ```

   If it asks to add the database to your config, answer **No**. The binding is already in `wrangler.toml`.
4. Copy the `database_id` it prints into `wrangler.toml`, replacing `REPLACE-WITH-YOUR-D1-DATABASE-ID`. It is not a secret, so it's fine to commit.
5. Create the tables in the live database (type `y` when asked):

   ```bash
   npm run db:migrate:remote
   ```

6. Add the sample products to the live database:

   ```bash
   npm run db:seed:remote
   ```

7. Check that it worked. This should show 48:

   ```bash
   npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) AS products FROM products"
   ```

---

## 3. Secrets and environment variables

All secrets are listed with explanations in **`.dev.vars.example`**. The rules:

- **Local:** put values in `.dev.vars`. It is git-ignored and never uploaded.
- **Live site:** set each secret with this command, replacing `NAME` with the secret's name. Wrangler asks you to paste the value and never prints it:

  ```bash
  npx wrangler pages secret put NAME
  ```

- Never put secrets in code, in `wrangler.toml`, in the settings table, or in chat.

---

## 4. Database changes (migrations)

- `migrations/0001_init.sql` holds all tables. The comments explain every column.
- `seed/sample-data.sql` holds the sample products, settings, banners and coupons. **All prices in it are samples.**
- To change the database structure, add a new numbered file such as `migrations/0002_add_brand.sql`. Never edit an old migration. Apply it with `npm run db:migrate:local`, then `npm run db:migrate:remote`.

## Folder structure

```
public/                    Everything the browser sees (the website)
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
  js/api.js                The ONLY file that talks to the server (/api/...)
  js/art.js                SVG product illustrations (used until real photos are uploaded)
  js/cart.js               Cart (saved in the browser) + price calculator
  js/ui.js                 Header, footer, bottom nav, cart drawer, product cards
  js/pages/*.js            One script per page
  img/                     Favicon and images
functions/                 Backend (Cloudflare Pages Functions) — each file = one URL
  _lib/http.js             JSON replies + friendly errors
  _lib/validate.js         Cleans/checks all input from browsers
  _lib/settings.js         Store settings + defaults + "is the store open?"
  _lib/catalog.js          Database rows -> website format
  _lib/pricing.js          ★ THE price calculator (cart, checkout, orders)
  api/_middleware.js       Runs before every /api call: error handling, headers
  api/settings.js          GET  /api/settings
  api/categories.js        GET  /api/categories
  api/products/index.js    GET  /api/products?category=&q=&featured=1&deal=1&ids=
  api/products/[id].js     GET  /api/products/<id>  (+ bought-together, similar)
  api/combos.js            GET  /api/combos
  api/banners.js           GET  /api/banners
  api/quote.js             POST /api/quote  (prices the cart from the database)
migrations/                Database structure, numbered (0001_init.sql …)
seed/sample-data.sql       Sample products/settings (SAMPLE PRICES)
wrangler.toml              Cloudflare config (no secrets)
.dev.vars.example          List of every secret, with explanations
```

## Quick changes

| I want to… | Edit |
|---|---|
| Change colours or font | `public/css/theme.css` |
| Change store name, address, reviews, "why us" text | `public/js/config.js` |
| Change products/prices before the admin panel exists | `seed/sample-data.sql`, then `npm run db:seed:local` |
| Change homepage section order or headings | `public/index.html` |
| Change policy text | `public/privacy.html`, `terms.html`, `refund.html` |

A full "How do I…?" guide (`CHANGES.md`) and the deployment and secrets guide come in the later phases.
