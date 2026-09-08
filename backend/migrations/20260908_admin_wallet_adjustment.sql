-- Manual admin wallet credit/debit (run in Supabase SQL Editor).
-- Enum type in this repo: transaction_type ('recharge' | 'deduction' | 'refund').

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_credit';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_debit';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS performed_by_admin_id UUID REFERENCES admins (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_performed_by_admin
  ON transactions (performed_by_admin_id)
  WHERE performed_by_admin_id IS NOT NULL;
