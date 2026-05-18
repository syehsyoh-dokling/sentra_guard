import "dotenv/config";
import { checkRedisQueueAdapter, dequeueAuditJob, getRedisQueueStatus } from "../runtime/redisQueueAdapter.mjs";

const intervalMs = Number(process.env.AUDIT_WORKER_INTERVAL_MS || 2500);
const backendApiUrl = (process.env.BACKEND_API_URL || "http://localhost:8787").replace(/\/$/, "");
let busy = false;

async function tick() {
  if (busy) return;
  busy = true;

  try {
    const payload = await dequeueAuditJob();
    if (!payload?.id) return;

    const response = await fetch(`${backendApiUrl}/audit/jobs/${encodeURIComponent(payload.id)}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worker: {
          id: process.env.WORKER_ID || `node-audit-worker-${process.pid}`,
          runtime: "node-fallback-worker"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Backend process request failed: HTTP ${response.status}`);
    }

    const { result } = await response.json();

    if (result) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: "audit-job-processed",
        jobId: result.id,
        findings: result.findings?.length || 0,
        status: result.status
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: "audit-worker-error",
      message: error instanceof Error ? error.message : "Unknown worker error"
    }));
  } finally {
    busy = false;
  }
}

const queueStatus = await checkRedisQueueAdapter();
console.log(JSON.stringify({
  ts: new Date().toISOString(),
  event: "audit-worker-started",
  intervalMs,
  queue: queueStatus.ok ? queueStatus : getRedisQueueStatus()
}));

await tick();
setInterval(() => void tick(), intervalMs);
