CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_jobs (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  target TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'solidity',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'queued',
  source_code TEXT,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  ai_roles JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_jobs_status_created_idx
  ON audit_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_reports (
  report_key TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'text/markdown; charset=utf-8',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runtime_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by TEXT NOT NULL DEFAULT 'admin-ui',
  accepted_keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  skipped_keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  network TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  block_hash TEXT,
  gas_price_wei TEXT,
  latency_ms INT NOT NULL DEFAULT 0,
  rpc_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS network_blocks_chain_observed_idx
  ON network_blocks (chain, observed_at DESC);

CREATE TABLE IF NOT EXISTS blockchain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  event_type TEXT NOT NULL,
  block_number BIGINT,
  tx_hash TEXT,
  contract_address TEXT,
  summary TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blockchain_events_chain_observed_idx
  ON blockchain_events (chain, observed_at DESC);

CREATE TABLE IF NOT EXISTS audit_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  percent INT NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_job_events_job_observed_idx
  ON audit_job_events (job_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detector TEXT,
  line_number INT,
  recommendation TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_findings_job_observed_idx
  ON audit_findings (job_id, observed_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('2026-05-17-initial-audit-runtime')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_migrations (version)
VALUES ('2026-05-18-network-indexer-runtime')
ON CONFLICT (version) DO NOTHING;
