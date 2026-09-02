CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  current_step TEXT NOT NULL DEFAULT 'language_select',
  collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  chart_data JSONB,
  question_count INTEGER NOT NULL DEFAULT 0,
  free_questions_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone
  ON whatsapp_conversations (phone);
