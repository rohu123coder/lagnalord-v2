-- Promotional offers (run in Supabase SQL Editor).
-- One claim row per user per offer; remaining units live on promo_offer_claims.

CREATE TABLE IF NOT EXISTS promo_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('ai_chat', 'human_chat', 'both')),
  unit_type TEXT NOT NULL CHECK (unit_type IN ('minutes', 'messages')),
  unit_value INTEGER NOT NULL CHECK (unit_value > 0),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  per_user_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_offers_date_range CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS promo_offer_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES promo_offers (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  units_granted INTEGER NOT NULL CHECK (units_granted > 0),
  units_used INTEGER NOT NULL DEFAULT 0 CHECK (units_used >= 0),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, user_id),
  CONSTRAINT promo_offer_claims_used_lte_granted CHECK (units_used <= units_granted)
);

CREATE INDEX IF NOT EXISTS idx_promo_offers_active_window
  ON promo_offers (active, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_promo_offer_claims_user_offer
  ON promo_offer_claims (user_id, offer_id);
