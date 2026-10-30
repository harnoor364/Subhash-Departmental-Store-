# Subhash Departmental Store — Online Grocery Website

Online store for **Subhash Departmental Store**, Pakhowal Road, Ludhiana.
Built by **Upward Web**.

- Frontend: plain HTML + CSS + vanilla JavaScript (Bootstrap 5 from a CDN). No build step.
- Backend: **Vercel Functions** (`/api`) + **Turso** database (SQLite in the cloud).

> **Current status: Phase 2 — database + API (on Vercel).**
> Products, categories, settings, banners, combos and all prices come from the
> database. Orders are still a browser-only demo until Phase 3.

---

## 1. Run it on your computer

You need **Node.js 20 or newer** from <https://nodejs.org>. No Vercel or Turso account is needed for local testing.

1. Download the project's one dependency, the database driver (only needed once):

   ```bash
   npm install
   ```

2. Start the website and the API:

   ```bash
   npm run dev
   ```

3. Open <http://localhost:3000>. Press `Ctrl + C` to stop.

The first time it runs, the site creates a local database file, `local.db`, with all tables and the 48 sample products. The file is git-ignored.

To wipe it and start fresh, run `npm run db:reset`.

Optionally, copy `.env.example` to `.env.local` to test features that need keys (Telegram and so on, from Phase 3).

### Test checklist

- Homepage: every section loads (data comes from `/api/...`)
- Search: try "dal", "moong dal", "oil", or the Hindi word मसाले
- Category pages, sorting, "In stock only", product page with "Frequently bought together"
- Cart drawer and checkout totals (calculated by the server):
  - Coupons `WELCOME50` (orders ₹499 and up) and `SAVE10` (orders ₹999 and up)
  - An order under ₹199 is blocked.
  - Delivery is free from ₹499.
- Light/dark mode and the mobile bottom nav
- You can open the API directly in your browser: <http://localhost:3000/api/products?q=dal>

---

## 2. The live site (Vercel)

- Every push to GitHub deploys automatically.
- Settings come from `vercel.json`:
  - The website folder is `public`.
  - Clean URLs: `/category` instead of `/category.html`.
  - Functions run in Mumbai (`bom1`).

### Connect the database (once)

1. Open <https://vercel.com/dashboard>, then your project, then the **Storage** tab.
2. Click **Create Database**, choose **Turso** (Serverless SQLite), then click **Continue**.
3. Accept the Turso terms and pick the **free** plan.
4. For the region, pick the one closest to India (Mumbai / `ap-south-1`) if it's offered.
5. Name the database `subhash-store`, then click **Create**.
6. When it asks which project and environments to connect, choose this project and tick **Production, Preview and Development**. Click **Connect**.

   This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to *Settings → Environment Variables* for you.
7. Go to **Deployments**, click **⋯** on the latest deployment, then click **Redeploy**.
8. Open `https://<your-site>.vercel.app/api/products?limit=1`. You should see one product.

   The first request creates all tables and loads the sample data automatically.

---

## 3. Secrets and environment variables

All of them are listed with explanations in **`.env.example`**.

- **Local:** put values in `.env.local`. It's git-ignored and never uploaded.
- **Live:** go to Vercel → project → **Settings → Environment Variables**, add the name and value, then **Redeploy**.
- Never put secrets in code, in `vercel.json`, in the settings table, or in chat.

---

## 4. Database changes (migrations)

- `migrations/0001_init.sql` holds all tables. The comments explain every column.
- `migrations/0002_sample_data.sql` holds the sample products, settings, banners and coupons. **All prices in it are samples.**
- Migrations run **automatically**: each new file runs once, the first time the API is used after a deploy.
- To change the database structure, add a new numbered file such as `migrations/0003_add_brand.sql`. Never edit one that has already run on the live site.
- To run migrations by hand, use `npm run db:migrate`. It runs on `local.db`, or on the live database if `.env.local` contains the Turso values.

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
api/                       Backend — each file is one URL (Vercel Functions)
  settings.js              GET  /api/settings
  categories.js            GET  /api/categories
  products/index.js        GET  /api/products?category=&q=&featured=1&deal=1&ids=
  products/[id].js         GET  /api/products/<id>  (+ bought-together, similar)
  combos.js                GET  /api/combos
  banners.js               GET  /api/banners
  quote.js                 POST /api/quote  (prices the cart from the database)
lib/                       Shared backend code
  handler.js               Wraps every route: database setup + friendly errors
  db.js                    Database connection (Turso live, local.db on your computer)
  migrate.js               Runs new migrations automatically
  http.js                  JSON replies + friendly errors
  validate.js              Cleans/checks all input from browsers
  settings.js              Store settings + defaults + "is the store open?"
  catalog.js               Database rows -> website format
  pricing.js               ★ THE price calculator (cart, checkout, orders)
migrations/                Database structure + sample data, numbered (0001_…, 0002_…)
scripts/dev-server.js      Local test server (npm run dev)
scripts/migrate.js         Run migrations by hand / reset local database
vercel.json                Vercel settings (no secrets)
.env.example               List of every secret, with explanations
```

## Quick changes

| I want to… | Edit |
|---|---|
| Change colours or font | `public/css/theme.css` |
| Change store name, address, reviews, "why us" text | `public/js/config.js` |
| Change sample products before the admin panel exists | `migrations/0002_sample_data.sql`, then `npm run db:reset` (local only) |
| Change homepage section order or headings | `public/index.html` |
| Change policy text | `public/privacy.html`, `terms.html`, `refund.html` |

A full "How do I…?" guide (`CHANGES.md`) and the deployment and secrets guide come in the later phases.
