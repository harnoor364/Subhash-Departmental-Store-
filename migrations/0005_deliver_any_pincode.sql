-- =====================================================================
-- 0005_deliver_any_pincode.sql — accept every pincode for now
-- ---------------------------------------------------------------------
-- An EMPTY delivery_pincodes list means "deliver to any pincode".
-- When the real delivery area is known, set the list in
-- Admin > Settings (Phase 4), e.g. ["142022","141013"].
-- =====================================================================

INSERT OR REPLACE INTO settings (key, value) VALUES ('delivery_pincodes', '[]');
