-- =====================================================================
-- 0001_init.sql — first version of the database
-- ---------------------------------------------------------------------
-- Migrations run in number order and each runs only ONCE per database.
-- They run AUTOMATICALLY the first time the API is used after a deploy
-- (see lib/migrate.js), or by hand with: npm run db:migrate
-- Never edit a migration that has already run on the live database —
-- add a new numbered file instead (see CHANGES.md).
--
-- Money is stored in rupees (REAL, e.g. 34.5). Dates are ISO text in UTC.
-- Yes/no columns are INTEGER 1/0.
-- =====================================================================

-- Store settings edited from Admin > Settings. value = JSON text.
-- NEVER store secrets (API keys, tokens) here — those are env secrets.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE categories (
  id           TEXT PRIMARY KEY,            -- URL slug, e.g. 'masale'
  name         TEXT NOT NULL,
  name_hi      TEXT NOT NULL DEFAULT '',    -- Hindi label
  image_url    TEXT NOT NULL DEFAULT '',
  icon_product TEXT NOT NULL DEFAULT '',    -- product whose picture is used as the tile icon
  sort         INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id           TEXT PRIMARY KEY,            -- URL slug, e.g. 'toor-dal-1kg'
  name         TEXT NOT NULL,
  category     TEXT NOT NULL REFERENCES categories(id),
  weight       TEXT NOT NULL DEFAULT '',    -- '1 kg', '500 ml'...
  description  TEXT NOT NULL DEFAULT '',
  mrp          REAL NOT NULL,
  price        REAL NOT NULL,               -- selling price (≤ MRP)
  in_stock     INTEGER NOT NULL DEFAULT 1,  -- quick on/off switch
  stock_qty    INTEGER,                     -- optional count; NULL = not tracked
  low_stock_at INTEGER NOT NULL DEFAULT 5,  -- dashboard warns at or below this
  featured     INTEGER NOT NULL DEFAULT 0,
  deal         INTEGER NOT NULL DEFAULT 0,  -- shows in "Today's Deals"
  fbt          TEXT NOT NULL DEFAULT '[]',  -- JSON list of "frequently bought together" product ids
  image_url    TEXT NOT NULL DEFAULT '',    -- uploaded photo (R2); empty = SVG illustration
  art_shape    TEXT NOT NULL DEFAULT 'box', -- SVG illustration settings (see public/js/art.js)
  art_color    TEXT NOT NULL DEFAULT '#F55D2C',
  art_label    TEXT NOT NULL DEFAULT '',
  sort         INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden from the shop (soft delete)
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_products_category ON products(category, active, sort);

CREATE TABLE combos (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  items       TEXT NOT NULL DEFAULT '[]',   -- JSON list of what's inside (text lines)
  mrp         REAL NOT NULL,
  price       REAL NOT NULL,
  in_stock    INTEGER NOT NULL DEFAULT 1,
  image_url   TEXT NOT NULL DEFAULT '',
  art_shape   TEXT NOT NULL DEFAULT 'gift',
  art_color   TEXT NOT NULL DEFAULT '#F55D2C',
  art_label   TEXT NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

-- Homepage banners: kind = 'hero' (slider) or 'promo' (3 small banners)
CREATE TABLE banners (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kind      TEXT NOT NULL CHECK (kind IN ('hero','promo')),
  title     TEXT NOT NULL,
  subtitle  TEXT NOT NULL DEFAULT '',
  button    TEXT NOT NULL DEFAULT 'Shop now',
  link      TEXT NOT NULL DEFAULT '/category',
  color     TEXT NOT NULL DEFAULT '#F55D2C',
  image_url TEXT NOT NULL DEFAULT '',
  products  TEXT NOT NULL DEFAULT '[]',     -- JSON list of product ids drawn on the banner
  sort      INTEGER NOT NULL DEFAULT 0,
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE coupons (
  code             TEXT PRIMARY KEY,        -- always UPPERCASE
  type             TEXT NOT NULL CHECK (type IN ('flat','percent')),
  value            REAL NOT NULL,           -- ₹ off, or % off
  max_discount     REAL,                    -- cap for percent coupons
  min_order        REAL NOT NULL DEFAULT 0,
  expires_at       TEXT,                    -- NULL = never
  usage_limit      INTEGER,                 -- NULL = unlimited
  used_count       INTEGER NOT NULL DEFAULT 0,
  first_order_only INTEGER NOT NULL DEFAULT 0,
  note             TEXT NOT NULL DEFAULT '',
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- One row per customer phone number
CREATE TABLE customers (
  phone          TEXT PRIMARY KEY,          -- 10 digits
  name           TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  landmark       TEXT NOT NULL DEFAULT '',
  pincode        TEXT NOT NULL DEFAULT '',
  points         INTEGER NOT NULL DEFAULT 0, -- loyalty points balance
  orders_count   INTEGER NOT NULL DEFAULT 0,
  total_spent    REAL NOT NULL DEFAULT 0,
  first_order_at TEXT,
  last_order_at  TEXT
);

CREATE TABLE orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no         TEXT NOT NULL UNIQUE,    -- e.g. SDS1A2B3C (shown to customer)
  phone            TEXT NOT NULL,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL DEFAULT '',
  landmark         TEXT NOT NULL DEFAULT '',
  pincode          TEXT NOT NULL DEFAULT '',
  fulfilment       TEXT NOT NULL CHECK (fulfilment IN ('delivery','pickup')),
  slot             TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'new',
                   -- awaiting_payment, payment_submitted, new, confirmed, packed,
                   -- out_for_delivery, ready_for_pickup, delivered, cancelled
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('upi','cod','razorpay')),
  payment_status   TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, paid, failed, refunded
  utr              TEXT NOT NULL DEFAULT '',        -- UPI reference given by customer
  razorpay_order_id   TEXT NOT NULL DEFAULT '',
  razorpay_payment_id TEXT NOT NULL DEFAULT '',
  subtotal         REAL NOT NULL,
  mrp_total        REAL NOT NULL,
  coupon_code      TEXT NOT NULL DEFAULT '',
  coupon_discount  REAL NOT NULL DEFAULT 0,
  points_used      INTEGER NOT NULL DEFAULT 0,
  points_discount  REAL NOT NULL DEFAULT 0,
  delivery_charge  REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL,
  points_earned    INTEGER NOT NULL DEFAULT 0,
  after_hours      INTEGER NOT NULL DEFAULT 0,      -- placed while store was closed
  source           TEXT NOT NULL DEFAULT '',        -- tracking tag, e.g. 'qr-poster'
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_orders_phone ON orders(phone, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Items are COPIED into the order so old orders never change when prices do
CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  item_id    TEXT NOT NULL,                 -- product id, or 'combo:<id>'
  name       TEXT NOT NULL,
  weight     TEXT NOT NULL DEFAULT '',
  mrp        REAL NOT NULL,
  price      REAL NOT NULL,
  qty        INTEGER NOT NULL,
  line_total REAL NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Order history: every status change, who did it and when
CREATE TABLE order_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status   TEXT NOT NULL,
  note     TEXT NOT NULL DEFAULT '',
  by_user  TEXT NOT NULL DEFAULT 'customer',
  at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_order_events_order ON order_events(order_id);

-- Bulk order enquiries
CREATE TABLE enquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  occasion   TEXT NOT NULL DEFAULT '',
  needed_by  TEXT NOT NULL DEFAULT '',
  items      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',   -- new, contacted, closed
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Admin panel users (Phase 4). The first owner login comes from secrets.
CREATE TABLE admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,              -- PBKDF2 hash, never the real password
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Simple rate limiting: how many requests a key (e.g. 'order:<ip>') made in a time window
CREATE TABLE rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL                 -- unix seconds when the window ends
);
