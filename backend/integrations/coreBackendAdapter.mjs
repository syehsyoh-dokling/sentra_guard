import { runtimeConfig } from "../config/runtimeConfig.mjs";

const DEFAULT_TIMEOUT_MS = 2500;

function coreUrl(path) {
  return `${runtimeConfig.coreBackendUrl.replace(/\/$/, "")}${path}`;
}

async function fetchJson(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(coreUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function asArray(payload) {
  return Array.isArray(payload?.data) ? payload.data : [];
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = String(item?.[key] || "UNKNOWN").toUpperCase();
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export async function getCoreBackendSummary() {
  const startedAt = Date.now();

  try {
    const [health, systemHealth, providers, auditsPayload, jobsPayload, paymentsPayload] = await Promise.all([
      fetchJson("/health"),
      fetchJson("/api/v1/admin/system-health").catch(() => null),
      fetchJson("/api/v1/external/providers"),
      fetchJson("/api/v1/audits"),
      fetchJson("/api/v1/audit-jobs"),
      fetchJson("/api/v1/payments/history")
    ]);

    const audits = asArray(auditsPayload);
    const auditJobs = asArray(jobsPayload);
    const payments = asArray(paymentsPayload);
    const queuedJobs = auditJobs.filter((job) => ["CREATED", "QUEUED", "READY_TO_TRANSFER"].includes(String(job.status).toUpperCase()));
    const transferredJobs = auditJobs.filter((job) => String(job.app2_transfer_status || "").toUpperCase() === "TRANSFERRED");
    const highPriorityJobs = auditJobs.filter((job) => String(job.priority || "").toUpperCase() === "HIGH");
    const lastAudit = audits[0] || null;
    const lastJob = auditJobs[0] || null;
    const healthCounts = systemHealth?.data || {};
    const auditCount = Number.isFinite(Number(healthCounts.audits)) ? Number(healthCounts.audits) : audits.length;
    const auditJobCount = Number.isFinite(Number(healthCounts.audit_jobs)) ? Number(healthCounts.audit_jobs) : auditJobs.length;
    const paymentCount = Number.isFinite(Number(healthCounts.payments)) ? Number(healthCounts.payments) : payments.length;

    return {
      online: true,
      source: "sentracore-core-backend",
      baseUrl: runtimeConfig.coreBackendUrl,
      latencyMs: Date.now() - startedAt,
      health: {
        ...(health?.data || health),
        ...(systemHealth?.data || {})
      },
      providers: providers?.data || providers,
      counts: {
        audits: auditCount,
        auditJobs: auditJobCount,
        queuedJobs: Math.max(queuedJobs.length, auditJobCount - transferredJobs.length),
        transferredJobs: transferredJobs.length,
        payments: paymentCount,
        highPriorityJobs: Math.max(highPriorityJobs.length, Math.round(auditJobCount * (highPriorityJobs.length / Math.max(auditJobs.length, 1))))
      },
      statusBreakdown: {
        audits: countBy(audits, "status"),
        auditJobs: countBy(auditJobs, "status"),
        payments: countBy(payments, "status")
      },
      latest: {
        audit: lastAudit
          ? {
              id: lastAudit.id,
              blockchain: lastAudit.blockchain,
              priority: lastAudit.priority,
              auditType: lastAudit.audit_type,
              status: lastAudit.status,
              createdAt: lastAudit.created_at
            }
          : null,
        job: lastJob
          ? {
              id: lastJob.id,
              auditId: lastJob.audit_id,
              priority: lastJob.priority,
              status: lastJob.status,
              transferStatus: lastJob.app2_transfer_status,
              createdAt: lastJob.created_at
            }
          : null
      },
      raw: {
        audits: audits.slice(0, 10),
        auditJobs: auditJobs.slice(0, 10),
        payments: payments.slice(0, 10)
      }
    };
  } catch (error) {
    return {
      online: false,
      source: "sentracore-core-backend",
      baseUrl: runtimeConfig.coreBackendUrl,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown core backend error",
      counts: {
        audits: 0,
        auditJobs: 0,
        queuedJobs: 0,
        transferredJobs: 0,
        payments: 0,
        highPriorityJobs: 0
      },
      statusBreakdown: {
        audits: {},
        auditJobs: {},
        payments: {}
      },
      latest: {
        audit: null,
        job: null
      },
      raw: {
        audits: [],
        auditJobs: [],
        payments: []
      }
    };
  }
}

export async function fetchCoreAuditJobs() {
  const payload = await fetchJson("/api/v1/audit-jobs");
  return asArray(payload);
}

export function buildCoreDashboardState(baseState, summary) {
  const counts = summary.counts || {};
  const queuedJobs = counts.queuedJobs || 0;
  const auditJobs = counts.auditJobs || 0;
  const audits = counts.audits || 0;
  const payments = counts.payments || 0;
  const highPriority = counts.highPriorityJobs || 0;
  const latestAudit = summary.latest?.audit;
  const latestJob = summary.latest?.job;

  return {
    ...baseState,
    updatedAt: new Date().toISOString(),
    metrics: {
      ...baseState.metrics,
      audits24h: audits,
      activeWorkers: baseState.metrics.activeWorkers,
      maxWorkers: Math.max(baseState.metrics.maxWorkers, 1),
      queueDepth: (baseState.metrics.queueDepth || 0) + queuedJobs,
      vulnsDetected: baseState.metrics.vulnsDetected,
      criticalVulns: baseState.metrics.criticalVulns,
      avgAuditTimeSec: baseState.metrics.avgAuditTimeSec,
      aiAccuracy: baseState.metrics.aiAccuracy
    },
    pipeline: {
      ...baseState.pipeline,
      ingest: (baseState.pipeline.ingest || 0) + audits,
      parse: (baseState.pipeline.parse || 0) + auditJobs,
      reportStore: (baseState.pipeline.reportStore || 0) + payments
    },
    queues: [
      { name: "sentracore:audit_jobs:created", depth: queuedJobs, cap: 80, proc: auditJobs, tone: queuedJobs > 10 ? "warn" : "ok" },
      { name: "sentracore:sentraguard_transfer", depth: Math.max(0, auditJobs - (counts.transferredJobs || 0)), cap: 80, proc: counts.transferredJobs || 0, tone: "info" },
      ...baseState.queues.slice(2)
    ],
    logs: [
      ...baseState.logs.slice(-20),
      {
        ts: new Date().toUTCString().slice(17, 25),
        lvl: summary.online ? "ok" : "err",
        msg: summary.online
          ? `Core backend connected: ${audits} audits, ${auditJobs} audit jobs, latest ${latestJob?.status || latestAudit?.status || "none"}`
          : `Core backend offline: ${summary.error || "connection failed"}`
      }
    ]
  };
}
