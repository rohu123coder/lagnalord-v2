-- Cashfree wallet recharge columns (run in Supabase SQL Editor).
-- Keep existing Razorpay columns; new recharges store Cashfree ids.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_cashfree_order_id
  ON transactions (cashfree_order_id)
  WHERE cashfree_order_id IS NOT NULL;
