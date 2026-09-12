-- Widen promo_offers.applies_to to include WhatsApp AI chat.
-- Expected current name: promo_offers_applies_to_check
-- (unnamed inline CHECK from 20260911_promo_offers.sql).
-- Do not touch unit_type's constraint.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'promo_offers'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%applies_to%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%unit_type%'
      AND c.conname <> 'promo_offers_date_range'
  LOOP
    EXECUTE format('ALTER TABLE promo_offers DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE promo_offers
  ADD CONSTRAINT promo_offers_applies_to_check
  CHECK (applies_to IN ('ai_chat', 'human_chat', 'both', 'whatsapp_ai_chat'));
