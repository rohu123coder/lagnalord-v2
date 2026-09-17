-- User session history: GET /api/chat/history (non-astrologer path)
--   WHERE user_id = $1
--   ORDER BY ended_at DESC NULLS LAST, started_at DESC NULLS LAST, id DESC
-- Also covers COUNT(*) FROM chat_sessions WHERE user_id = $1 (leftmost column).
-- chat_sessions has no created_at; started_at/ended_at are the timestamp columns.
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id_ended_started
  ON chat_sessions (user_id, ended_at DESC, started_at DESC);
