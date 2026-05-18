import pg from "pg";
import { runtimeConfig } from "../config/runtimeConfig.mjs";

const { Pool } = pg;
let pool;
let disabledReason = "";
let networkTablesReady = false;
let operationsTablesReady = false;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: runtimeConfig.postgresUrl,
    connectionTimeoutMillis: 2500,
    idleTimeoutMillis: 5000,
    max: 4
  });

  pool.on("error", (error) => {
    disabledReason = error.message;
  });

  return pool;
}

export async function checkPostgresAdapter() {
  try {
    const result = await getPool().query("SELECT 1 AS ready");
    disabledReason = "";
    return { mode: "postgres", ok: result.rows[0]?.ready === 1 };
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres error";
    return { mode: "memory-fallback", ok: false, reason: disabledReason };
  }
}

export async function saveAuditJobSnapshot(job) {
  try {
    await getPool().query("ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS ai_roles JSONB NOT NULL DEFAULT '{}'::jsonb");
    await getPool().query(
      `INSERT INTO audit_jobs (
        id, chain, target, source_type, priority, status, source_code, findings, ai_summary, ai_roles, report_key, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        chain = EXCLUDED.chain,
        target = EXCLUDED.target,
        source_type = EXCLUDED.source_type,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        source_code = EXCLUDED.source_code,
        findings = EXCLUDED.findings,
        ai_summary = EXCLUDED.ai_summary,
        ai_roles = EXCLUDED.ai_roles,
        report_key = EXCLUDED.report_key,
        updated_at = EXCLUDED.updated_at`,
      [
        job.id,
        job.chain,
        job.target,
        job.sourceType,
        job.priority,
        job.status,
        job.sourceCode || null,
        JSON.stringify(job.findings || []),
        job.aiSummary || null,
        JSON.stringify(job.aiRoles || {}),
        job.reportUrl?.replace("memory://", "") || null,
        job.createdAt,
        job.updatedAt
      ]
    );
    disabledReason = "";
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres write error";
    return false;
  }
}

export async function saveAuditReportSnapshot(report, jobId) {
  try {
    await getPool().query(
      `INSERT INTO audit_reports (report_key, job_id, content_type, body, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (report_key) DO UPDATE SET
        content_type = EXCLUDED.content_type,
        body = EXCLUDED.body`,
      [report.key, jobId, report.contentType, report.body, report.createdAt]
    );
    disabledReason = "";
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres report write error";
    return false;
  }
}

export function getPostgresAdapterStatus() {
  return {
    mode: disabledReason ? "memory-fallback" : "postgres-ready",
    reason: disabledReason || null
  };
}

async function ensureOperationsTables() {
  if (operationsTablesReady) return;

  await getPool().query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  `);

  operationsTablesReady = true;
}

export async function saveAuditEventSnapshot(jobId, event) {
  try {
    await ensureOperationsTables();
    await getPool().query(
      `INSERT INTO audit_job_events (job_id, stage, status, percent, message, detail, observed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        jobId,
        event.stage || "unknown",
        event.status || "running",
        Number(event.percent || 0),
        event.message || "Audit event",
        JSON.stringify(event.detail || {}),
        new Date().toISOString()
      ]
    );
    disabledReason = "";
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres audit event write error";
    return false;
  }
}

export async function saveAuditFindingsSnapshot(jobId, findings = []) {
  try {
    await ensureOperationsTables();
    await getPool().query("DELETE FROM audit_findings WHERE job_id = $1", [jobId]);

    for (const finding of findings) {
      await getPool().query(
        `INSERT INTO audit_findings (
          job_id, severity, title, detector, line_number, recommendation, payload_json, observed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          jobId,
          finding.severity || "medium",
          finding.title || finding.type || "Detected Finding",
          finding.detector || finding.source || null,
          finding.line || null,
          finding.recommendation || null,
          JSON.stringify(finding),
          new Date().toISOString()
        ]
      );
    }

    disabledReason = "";
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres findings write error";
    return false;
  }
}

async function ensureNetworkTables() {
  if (networkTablesReady) return;

  await getPool().query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  `);

  networkTablesReady = true;
}

export async function saveNetworkSnapshot(snapshot) {
  try {
    await ensureNetworkTables();
    await getPool().query(
      `INSERT INTO network_blocks (
        chain, network, block_number, block_hash, gas_price_wei, latency_ms, rpc_url, status, raw_json, observed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        snapshot.chain,
        snapshot.network,
        snapshot.blockNumber,
        snapshot.blockHash || null,
        snapshot.gasPriceWei || null,
        snapshot.latencyMs || 0,
        snapshot.rpcUrl,
        snapshot.status || "ok",
        JSON.stringify(snapshot.raw || {}),
        snapshot.observedAt || new Date().toISOString()
      ]
    );

    await getPool().query(
      `INSERT INTO blockchain_events (
        chain, event_type, block_number, tx_hash, contract_address, summary, payload_json, observed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        snapshot.chain,
        "latest_block",
        snapshot.blockNumber,
        null,
        null,
        `${snapshot.chain} latest block ${snapshot.blockNumber}`,
        JSON.stringify(snapshot),
        snapshot.observedAt || new Date().toISOString()
      ]
    );

    disabledReason = "";
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres network write error";
    return false;
  }
}

export async function listNetworkSnapshots(limit = 50) {
  try {
    await ensureNetworkTables();
    const result = await getPool().query(
      `SELECT chain, network, block_number, block_hash, gas_price_wei, latency_ms, rpc_url, status, raw_json, observed_at
       FROM network_blocks
       ORDER BY observed_at DESC
       LIMIT $1`,
      [limit]
    );
    disabledReason = "";
    return result.rows;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Postgres network read error";
    return [];
  }
}
