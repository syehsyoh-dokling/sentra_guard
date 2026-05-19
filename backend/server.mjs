import "dotenv/config";
import http from "node:http";
import {
  createAuditJob,
  createAuditJobFromUpload,
  getAuditJobProgress,
  getAuditReport,
  getAuditJob,
  getAuditMetrics,
  listAuditJobs,
  processAuditJob,
  processNextAuditJob
} from "./runtime/auditJobStore.mjs";
import {
  applyRuntimeConfigPatch,
  getEditableRuntimeConfig,
  getSafeRuntimeConfig,
  runtimeConfig
} from "./config/runtimeConfig.mjs";
import {
  buildCoreDashboardState,
  fetchCoreAuditJobs,
  getCoreBackendSummary
} from "./integrations/coreBackendAdapter.mjs";
import {
  advanceAdminDemoTick,
  applyAdminRealtimeEvent,
  getAdminRealtimeState,
  resetAdminRealtimeState
} from "./runtime/adminRealtimeStore.mjs";
import {
  getNetworkActivitySummary,
  getNetworkDashboardPatch,
  startBlockchainNetworkMonitor
} from "./runtime/blockchainNetworkMonitor.mjs";
import {
  getLiveOperationsState,
  recordSystemEvent
} from "./runtime/operationalTelemetry.mjs";
import { getDetectorRulesResponse } from "./security/detectorEngine.mjs";
import { runApiTests } from "./runtime/apiTesting.mjs";
import { getDependencyHealth } from "./runtime/dependencyHealth.mjs";
import { getReadinessReport } from "./runtime/readinessReport.mjs";
import { openApiDocument } from "./openapi.mjs";
import {
  beginRequest,
  finishRequest,
  isAdminAuthorized,
  isOriginRejected,
  isRateLimited,
  setResponseStatus
} from "./security/httpGuards.mjs";
import {
  addRealtimeClient,
  broadcastRealtimeEvent,
  getRealtimeClientCount
} from "./runtime/realtimeHub.mjs";
import {
  attachProgressWebSocket,
  getProgressSocketClientCount
} from "./runtime/progressHub.mjs";

const PORT = Number(process.env.BACKEND_PORT || 8787);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  setResponseStatus(res, statusCode);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    const maxBytes = 1024 * 1024;

    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function getJobIdFromPath(pathname) {
  const match = pathname.match(/^\/audit\/jobs\/([^/]+)(?:\/process)?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getReportKeyFromPath(pathname) {
  const match = pathname.match(/^\/audit\/reports\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

const server = http.createServer(async (req, res) => {
  beginRequest(req, res);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    finishRequest(req, res);
    return;
  }

  try {
    if (isOriginRejected(req, res)) {
      sendJson(res, 403, { error: "Origin is not allowed" });
      return;
    }

    if (isRateLimited(req, res)) {
      sendJson(res, 429, { error: "Rate limit exceeded" });
      return;
    }

    if (!isAdminAuthorized(req, pathname)) {
      sendJson(res, 401, { error: "Admin token required" });
      return;
    }

    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: runtimeConfig.serviceName,
        mode: "production-ready-demo-runtime",
        timestamp: new Date().toISOString(),
        realtimeClients: getRealtimeClientCount(),
        progressSocketClients: getProgressSocketClientCount(),
        config: getSafeRuntimeConfig()
      });
      return;
    }

    if (req.method === "GET" && pathname === "/health/dependencies") {
      sendJson(res, 200, await getDependencyHealth());
      return;
    }

    if (req.method === "GET" && pathname === "/readiness") {
      sendJson(res, 200, await getReadinessReport());
      return;
    }

    if (req.method === "GET" && pathname === "/openapi.json") {
      sendJson(res, 200, openApiDocument);
      return;
    }

    if (req.method === "GET" && pathname === "/config/runtime") {
      sendJson(res, 200, getSafeRuntimeConfig());
      return;
    }

    if (req.method === "GET" && pathname === "/config/editable") {
      sendJson(res, 200, {
        config: getEditableRuntimeConfig(),
        safe: getSafeRuntimeConfig()
      });
      return;
    }

    if (req.method === "POST" && pathname === "/config/runtime") {
      const body = await readJsonBody(req);
      sendJson(res, 200, {
        message: "Runtime config accepted for current backend process",
        ...applyRuntimeConfigPatch(body)
      });
      return;
    }

    if (req.method === "POST" && pathname === "/config/test") {
      const body = await readJsonBody(req);
      sendJson(res, 200, await runApiTests(body.scope || "all"));
      return;
    }

    if (req.method === "GET" && pathname === "/audit/features") {
      sendJson(res, 200, {
        features: [
          { key: "distributed-workers", status: "ready-contract", description: "Queue and worker runtime contracts are available with in-memory fallback." },
          { key: "queue-orchestration", status: "active-local", description: "In-memory queue is active; Redis URL is configured for production adapter handoff." },
          { key: "audit-pipeline", status: "active", description: "Static detector pipeline processes Solidity source and generates reports." },
          { key: "ai-vulnerability-analysis", status: runtimeConfig.geminiApiKey ? "gemini-active" : "local-fallback", description: "Gemini adapter is wired with deterministic fallback when no API key is present." },
          { key: "multi-chain", status: "rpc-testable", description: "Ethereum, Solana, Polygon, and BNB testnet RPC checks are available." },
          { key: "storage", status: "adapter-ready", description: "Memory report storage is active; S3/IPFS production settings are covered." },
          { key: "realtime-updates", status: "sse-active", description: "Server-sent events endpoint streams dashboard state updates." }
        ]
      });
      return;
    }

    if (req.method === "GET" && pathname === "/security/detector-rules") {
      sendJson(res, 200, getDetectorRulesResponse());
      return;
    }

    if (req.method === "GET" && pathname === "/api-tests") {
      const scope = url.searchParams.get("scope") || "all";
      sendJson(res, 200, await runApiTests(scope));
      return;
    }

    if (req.method === "GET" && pathname === "/audit/metrics") {
      sendJson(res, 200, await getAuditMetrics());
      return;
    }

    if (req.method === "GET" && pathname === "/integrations/core-backend/summary") {
      sendJson(res, 200, await getCoreBackendSummary());
      return;
    }

    if (req.method === "GET" && pathname === "/integrations/core-backend/dashboard-state") {
      const summary = await getCoreBackendSummary();
      const liveState = await getLiveOperationsState(listAuditJobs());
      const state = await getNetworkDashboardPatch(buildCoreDashboardState(liveState, summary));
      sendJson(res, 200, { summary, state });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/network/activity") {
      const refresh = url.searchParams.get("refresh") === "true";
      sendJson(res, 200, await getNetworkActivitySummary({ refresh }));
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/network/gas") {
      const summary = await getNetworkActivitySummary();
      sendJson(res, 200, {
        checkedAt: summary.checkedAt,
        gas: summary.gas
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/network/blocks/latest") {
      const summary = await getNetworkActivitySummary();
      sendJson(res, 200, {
        checkedAt: summary.checkedAt,
        blocks: summary.latestBlocks
      });
      return;
    }

    if (req.method === "GET" && /^\/api\/v1\/contracts\/[^/]+\/events$/.test(pathname)) {
      const summary = await getNetworkActivitySummary();
      sendJson(res, 200, {
        contractId: decodeURIComponent(pathname.match(/^\/api\/v1\/contracts\/([^/]+)\/events$/)?.[1] || ""),
        events: summary.activity
      });
      return;
    }

    if (req.method === "GET" && pathname === "/audit/jobs") {
      sendJson(res, 200, { jobs: listAuditJobs() });
      return;
    }

    if (req.method === "POST" && pathname === "/audit/contracts/upload") {
      const body = await readJsonBody(req);
      const job = await createAuditJobFromUpload(body);

      broadcastRealtimeEvent("audit-job-created", { job });
      sendJson(res, 202, {
        message: "Contract uploaded and audit job queued",
        job,
        progressUrl: `/audit/jobs/${job.id}/progress`,
        websocketUrl: `/audit/progress/ws?jobId=${encodeURIComponent(job.id)}`
      });
      return;
    }

    if (req.method === "POST" && pathname === "/audit/jobs") {
      const body = await readJsonBody(req);
      const job = await createAuditJob(body);

      advanceAdminDemoTick({
        logs: [
          ...getAdminRealtimeState().logs.slice(-24),
          { ts: new Date().toUTCString().slice(17, 25), lvl: "info", msg: `Audit job created: ${job.target} / ${job.chain}` }
        ]
      });
      broadcastRealtimeEvent("audit-job-created", { job });

      sendJson(res, 201, {
        message: "Audit job created",
        job,
        nextStep: `POST /audit/jobs/${job.id}/process`
      });
      return;
    }

    if (req.method === "POST" && pathname === "/integrations/core-backend/import-audit-jobs") {
      const body = await readJsonBody(req);
      const limit = Math.max(1, Math.min(Number(body.limit || 25), 50));
      const coreJobs = await fetchCoreAuditJobs();
      const candidates = coreJobs
        .filter((job) => ["CREATED", "QUEUED", "READY_TO_TRANSFER"].includes(String(job.status || "").toUpperCase()))
        .slice(0, limit);
      const imported = [];

      for (const coreJob of candidates) {
        const payload = coreJob.payload_json || coreJob.payload || {};
        const job = await createAuditJob({
          externalSource: "sentracore-core-backend",
          externalId: String(coreJob.id),
          app1JobId: String(coreJob.id),
          chain: payload.blockchain || payload.chain || "ethereum",
          target: payload.contract_name || payload.target || `APP1-${String(coreJob.id).slice(0, 8)}`,
          sourceType: payload.source_type || "solidity",
          priority: String(coreJob.priority || "normal").toLowerCase(),
          sourceCode: payload.source_code || payload.sourceCode
        });
        imported.push(job);
      }

      broadcastRealtimeEvent("audit-jobs-imported", {
        source: "sentracore-core-backend",
        imported: imported.length
      });
      sendJson(res, 202, {
        message: "Core audit jobs imported into APP2 queue",
        requested: limit,
        imported: imported.length,
        jobs: imported
      });
      return;
    }

    if (req.method === "GET" && /^\/audit\/jobs\/[^/]+$/.test(pathname)) {
      const id = getJobIdFromPath(pathname);
      const job = getAuditJob(id);

      if (!job) {
        sendJson(res, 404, { error: "Audit job not found", id });
        return;
      }

      sendJson(res, 200, { job });
      return;
    }

    if (req.method === "GET" && /^\/audit\/jobs\/[^/]+\/progress$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/audit\/jobs\/([^/]+)\/progress$/)?.[1] || "");
      const job = getAuditJob(id);

      if (!job) {
        sendJson(res, 404, { error: "Audit job not found", id });
        return;
      }

      sendJson(res, 200, getAuditJobProgress(id));
      return;
    }

    if (req.method === "POST" && /^\/audit\/jobs\/[^/]+\/process$/.test(pathname)) {
      const id = getJobIdFromPath(pathname);
      const body = await readJsonBody(req);
      const result = await processAuditJob(id, body);

      if (!result) {
        sendJson(res, 404, { error: "Audit job not found", id });
        return;
      }

      advanceAdminDemoTick({
        metrics: {
          audits24h: getAdminRealtimeState().metrics.audits24h + 1,
          vulnsDetected: getAdminRealtimeState().metrics.vulnsDetected + result.findings.length
        },
        logs: [
          ...getAdminRealtimeState().logs.slice(-24),
          { ts: new Date().toUTCString().slice(17, 25), lvl: "ok", msg: `Audit job processed: ${result.target} / findings ${result.findings.length}` }
        ]
      });
      broadcastRealtimeEvent("audit-job-processed", { job: result });

      sendJson(res, 200, {
        message: "Audit job processed by dummy pipeline",
        result
      });
      return;
    }

    if (req.method === "POST" && pathname === "/audit/jobs/process-next") {
      const body = await readJsonBody(req);
      const result = await processNextAuditJob(body);

      if (!result) {
        sendJson(res, 404, { error: "No queued audit job available" });
        return;
      }

      broadcastRealtimeEvent("audit-job-processed", { job: result });
      sendJson(res, 200, {
        message: "Next audit job processed",
        result
      });
      return;
    }

    if (req.method === "GET" && /^\/audit\/reports\/[^/]+$/.test(pathname)) {
      const key = getReportKeyFromPath(pathname);
      const report = getAuditReport(key);

      if (!report) {
        sendJson(res, 404, { error: "Audit report not found", key });
        return;
      }

      res.writeHead(200, {
        "Content-Type": report.contentType || "text/markdown; charset=utf-8",
        "Cache-Control": "no-store"
      });
      setResponseStatus(res, 200);
      res.end(report.body);
      return;
    }

    if (req.method === "GET" && pathname === "/admin/realtime-state") {
      const state = await getNetworkDashboardPatch(await getLiveOperationsState(listAuditJobs()));
      broadcastRealtimeEvent("dashboard-state", state);
      sendJson(res, 200, state);
      return;
    }

    if (req.method === "GET" && pathname === "/admin/realtime-stream") {
      const cleanup = addRealtimeClient(res);
      setResponseStatus(res, 200);
      const state = await getNetworkDashboardPatch(await getLiveOperationsState(listAuditJobs()));
      res.write("event: dashboard-state\n");
      res.write(`data: ${JSON.stringify(state)}\n\n`);

      req.on("close", cleanup);
      return;
    }

    if (req.method === "POST" && pathname === "/admin/realtime-events") {
      const body = await readJsonBody(req);
      const next = applyAdminRealtimeEvent(body);
      broadcastRealtimeEvent("dashboard-state", next);
      sendJson(res, 200, {
        message: "Admin realtime state updated",
        state: next
      });
      return;
    }

    if (req.method === "POST" && pathname === "/admin/realtime-demo/tick") {
      const body = await readJsonBody(req);
      const next = advanceAdminDemoTick(body.frame || body);
      broadcastRealtimeEvent("dashboard-state", next);
      sendJson(res, 200, {
        message: "Admin realtime demo tick applied",
        state: next
      });
      return;
    }

    if (req.method === "POST" && pathname === "/admin/realtime-reset") {
      const next = resetAdminRealtimeState();
      broadcastRealtimeEvent("dashboard-state", next);
      sendJson(res, 200, {
        message: "Admin realtime state reset",
        state: next
      });
      return;
    }

    sendJson(res, 404, {
      error: "Route not found",
      method: req.method,
      path: pathname,
      availableEndpoints: [
        "GET /health",
        "GET /health/dependencies",
        "GET /readiness",
        "GET /openapi.json",
        "GET /config/runtime",
        "GET /config/editable",
        "POST /config/runtime",
        "POST /config/test",
        "GET /audit/features",
        "GET /security/detector-rules",
        "GET /api-tests",
        "GET /audit/metrics",
        "GET /audit/jobs",
        "POST /audit/jobs",
        "POST /audit/contracts/upload",
        "GET /audit/jobs/:id",
        "GET /audit/jobs/:id/progress",
        "POST /audit/jobs/:id/process",
        "WS /audit/progress/ws?jobId=:id",
        "POST /audit/jobs/process-next",
        "GET /audit/reports/:id",
        "GET /admin/realtime-state",
        "GET /admin/realtime-stream",
        "POST /admin/realtime-events",
        "POST /admin/realtime-demo/tick",
        "POST /admin/realtime-reset"
      ]
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    finishRequest(req, res);
  }
});

attachProgressWebSocket(server);

server.listen(PORT, () => {
  startBlockchainNetworkMonitor();
  recordSystemEvent({ lvl: "ok", msg: `Sentracore backend started on port ${PORT}` });
  console.log(`Backend dummy API running at http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/health/dependencies`);
  console.log(`  GET  http://localhost:${PORT}/readiness`);
  console.log(`  GET  http://localhost:${PORT}/openapi.json`);
  console.log(`  GET  http://localhost:${PORT}/config/runtime`);
  console.log(`  GET  http://localhost:${PORT}/config/editable`);
  console.log(`  POST http://localhost:${PORT}/config/runtime`);
  console.log(`  POST http://localhost:${PORT}/config/test`);
  console.log(`  GET  http://localhost:${PORT}/audit/features`);
  console.log(`  GET  http://localhost:${PORT}/security/detector-rules`);
  console.log(`  GET  http://localhost:${PORT}/api-tests`);
  console.log(`  GET  http://localhost:${PORT}/audit/metrics`);
  console.log(`  GET  http://localhost:${PORT}/audit/jobs`);
  console.log(`  POST http://localhost:${PORT}/audit/jobs`);
  console.log(`  POST http://localhost:${PORT}/audit/contracts/upload`);
  console.log(`  GET  http://localhost:${PORT}/audit/jobs/:id/progress`);
  console.log(`  WS   ws://localhost:${PORT}/audit/progress/ws?jobId=:id`);
  console.log(`  GET  http://localhost:${PORT}/admin/realtime-state`);
  console.log(`  GET  http://localhost:${PORT}/admin/realtime-stream`);
  console.log(`  POST http://localhost:${PORT}/admin/realtime-events`);
  console.log(`  POST http://localhost:${PORT}/admin/realtime-demo/tick`);
});
