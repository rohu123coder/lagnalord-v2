CREATE INDEX IF NOT EXISTS idx_chat_sessions_astrologer_status
  ON chat_sessions (astrologer_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_session_created
  ON messages (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON transactions (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_razorpay_order_id
  ON transactions (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
