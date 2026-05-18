import { createClient } from "redis";
import { runtimeConfig } from "../config/runtimeConfig.mjs";

let client;
let disabledReason = "";
const queueKey = "sentracore:audit:queue";
const completedKey = "sentracore:audit:completed";
const failedKey = "sentracore:audit:failed";
const processingKey = "sentracore:audit:processing";

async function getClient() {
  if (client?.isOpen) return client;

  client = createClient({
    url: runtimeConfig.redisUrl,
    socket: {
      connectTimeout: 2500,
      reconnectStrategy: false
    }
  });

  client.on("error", (error) => {
    disabledReason = error.message;
  });

  await client.connect();
  disabledReason = "";
  return client;
}

export async function checkRedisQueueAdapter() {
  try {
    const redis = await getClient();
    const pong = await redis.ping();
    return { mode: "redis", ok: pong === "PONG" };
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis error";
    return { mode: "memory-fallback", ok: false, reason: disabledReason };
  }
}

export async function enqueueAuditJob(job) {
  try {
    const redis = await getClient();
    await redis.rPush(queueKey, JSON.stringify({
      id: job.id,
      type: "audit-job",
      status: job.status,
      chain: job.chain,
      target: job.target,
      sourceType: job.sourceType,
      priority: job.priority,
      sourceCode: job.sourceCode,
      createdAt: job.createdAt
    }));
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis enqueue error";
    return false;
  }
}

export async function dequeueAuditJob() {
  try {
    const redis = await getClient();
    const payload = await redis.lPop(queueKey);
    if (!payload) return null;

    try {
      return JSON.parse(payload);
    } catch {
      return { id: payload };
    }
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis dequeue error";
    return null;
  }
}

export async function markAuditJobProcessing(job) {
  try {
    const redis = await getClient();
    await redis.hSet(processingKey, job.id, JSON.stringify({
      id: job.id,
      target: job.target,
      chain: job.chain,
      status: "processing",
      updatedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis processing marker error";
    return false;
  }
}

export async function markAuditJobCompleted(job) {
  try {
    const redis = await getClient();
    await redis.hDel(processingKey, job.id);
    await redis.lPush(completedKey, JSON.stringify({
      id: job.id,
      target: job.target,
      chain: job.chain,
      findings: job.findings?.length || 0,
      durationMs: job.durationMs || null,
      completedAt: job.completedAt || new Date().toISOString()
    }));
    await redis.lTrim(completedKey, 0, 499);
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis completion marker error";
    return false;
  }
}

export async function markAuditJobFailed(job, reason) {
  try {
    const redis = await getClient();
    await redis.hDel(processingKey, job.id);
    await redis.lPush(failedKey, JSON.stringify({
      id: job.id,
      target: job.target,
      chain: job.chain,
      reason,
      failedAt: new Date().toISOString()
    }));
    await redis.lTrim(failedKey, 0, 499);
    return true;
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis failure marker error";
    return false;
  }
}

export async function getRedisQueueMetrics() {
  try {
    const redis = await getClient();
    const [queued, processing, completed, failed] = await Promise.all([
      redis.lLen(queueKey),
      redis.hLen(processingKey),
      redis.lLen(completedKey),
      redis.lLen(failedKey)
    ]);

    disabledReason = "";
    return {
      mode: "redis",
      ok: true,
      queues: [
        { name: queueKey, depth: queued, cap: 500, proc: completed, tone: queued > 100 ? "crit" : queued > 40 ? "warn" : "ok" },
        { name: processingKey, depth: processing, cap: 100, proc: processing, tone: processing > 20 ? "warn" : "info" },
        { name: completedKey, depth: completed, cap: 500, proc: completed, tone: "ok" },
        { name: failedKey, depth: failed, cap: 100, proc: failed, tone: failed > 0 ? "crit" : "ok" }
      ],
      totals: { queued, processing, completed, failed },
      queueKey,
      processingKey,
      completedKey,
      failedKey
    };
  } catch (error) {
    disabledReason = error instanceof Error ? error.message : "Unknown Redis metrics error";
    return {
      mode: "memory-fallback",
      ok: false,
      reason: disabledReason,
      queues: [],
      totals: { queued: 0, processing: 0, completed: 0, failed: 0 }
    };
  }
}

export function getRedisQueueStatus() {
  return {
    mode: disabledReason ? "memory-fallback" : "redis-ready",
    reason: disabledReason || null,
    queueKey,
    processingKey,
    completedKey,
    failedKey
  };
}
