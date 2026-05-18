import pg from "pg";
import { createClient } from "redis";
import { runtimeConfig } from "../config/runtimeConfig.mjs";

const { Client } = pg;
const DEFAULT_TIMEOUT_MS = 2500;

function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function redactUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.password) url.password = "********";
    if (url.username) url.username = url.username ? url.username : "";
    return url.toString();
  } catch {
    return String(value).replace(/:\/\/([^:@]+):([^@]+)@/, "://$1:********@");
  }
}

async function checkPostgres() {
  const client = new Client({
    connectionString: runtimeConfig.postgresUrl,
    connectionTimeoutMillis: DEFAULT_TIMEOUT_MS
  });

  try {
    await withTimeout(client.connect());
    const result = await withTimeout(client.query("SELECT 1 AS ready, current_database() AS database_name, version() AS version"));
    const row = result.rows[0] || {};

    return {
      key: "postgres",
      ok: true,
      mode: "query",
      target: redactUrl(runtimeConfig.postgresUrl),
      detail: {
        database: row.database_name,
        version: typeof row.version === "string" ? row.version.split(",")[0] : "PostgreSQL"
      }
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function checkRedis() {
  const client = createClient({
    url: runtimeConfig.redisUrl,
    socket: {
      connectTimeout: DEFAULT_TIMEOUT_MS,
      reconnectStrategy: false
    }
  });

  client.on("error", () => {});

  try {
    await withTimeout(client.connect());
    const pong = await withTimeout(client.ping());

    return {
      key: "redis",
      ok: pong === "PONG",
      mode: "ping",
      target: redactUrl(runtimeConfig.redisUrl),
      detail: pong
    };
  } finally {
    await client.quit().catch(() => client.disconnect());
  }
}

async function checkDependency(key, fn) {
  const started = Date.now();

  try {
    return {
      ...(await fn()),
      latencyMs: Date.now() - started
    };
  } catch (error) {
    return {
      key,
      ok: false,
      mode: "connection",
      target: redactUrl(key === "postgres" ? runtimeConfig.postgresUrl : runtimeConfig.redisUrl),
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Unknown dependency error"
    };
  }
}

export async function getDependencyHealth() {
  const checks = await Promise.all([
    checkDependency("postgres", checkPostgres),
    checkDependency("redis", checkRedis)
  ]);

  const failed = checks.filter((check) => !check.ok);

  return {
    status: failed.length === 0 ? "ok" : "degraded",
    checkedAt: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length
    }
  };
}
