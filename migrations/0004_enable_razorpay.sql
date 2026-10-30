-- =====================================================================
-- 0004_enable_razorpay.sql — use Razorpay for online payments
-- ---------------------------------------------------------------------
-- Razorpay shows at checkout only when BOTH are true:
--   1. this setting is true (can be switched off later in Admin > Settings)
--   2. RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in Vercel
-- =====================================================================

INSERT OR REPLACE INTO settings (key, value) VALUES ('razorpay_enabled', 'true');
