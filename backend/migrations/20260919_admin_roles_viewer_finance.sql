-- Postgres cannot ADD VALUE inside a transaction block on older versions;
-- run this file as a single migration statement batch (Render/Postgres 12+).
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'finance';
