import { runAuditPipeline } from "../pipelines/auditPipeline.mjs";
import {
  getPostgresAdapterStatus,
  saveAuditEventSnapshot,
  saveAuditFindingsSnapshot,
  saveAuditJobSnapshot,
  saveAuditReportSnapshot
} from "../db/postgresAdapter.mjs";
import {
  dequeueAuditJob,
  enqueueAuditJob,
  getRedisQueueMetrics,
  getRedisQueueStatus,
  markAuditJobCompleted,
  markAuditJobFailed,
  markAuditJobProcessing
} from "./redisQueueAdapter.mjs";
import { recordJobProgress, getJobProgress } from "./progressHub.mjs";
import { getStorageAdapterStatus, storeAuditArtifact } from "../storage/artifactStorage.mjs";
import { getCoreBackendSummary } from "../integrations/coreBackendAdapter.mjs";
import { recordPipelineEvent, recordSystemEvent, recordWorkerHeartbeat } from "./operationalTelemetry.mjs";

const jobs = new Map();
const queue = [];
const reports = new Map();

const progressDefaults = {
  stage: "queued",
  percent: 0,
  message: "Audit job queued"
};

const demoSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DemoVault {
  mapping(address => uint256) public balances;
  address public owner;

  function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok, "transfer failed");
    balances[msg.sender] = 0;
  }

  function setOwner(address nextOwner) external {
    owner = nextOwner;
  }
}`;

function normalizeChain(chain) {
  const value = String(chain || "ethereum").toLowerCase();
  if (["ethereum", "solana", "polygon", "bsc", "bnb"].includes(value)) {
    return value === "bnb" ? "bsc" : value;
  }
  return "unknown";
}

export async function createAuditJob(input = {}) {
  const externalId = input.externalId || input.coreJobId || input.app1JobId || null;
  if (externalId) {
    const existing = Array.from(jobs.values()).find((job) => job.externalId === externalId);
    if (existing) return getAuditJob(existing.id);
  }

  const now = new Date().toISOString();
  const job = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    externalSource: input.externalSource || null,
    externalId,
    status: "queued",
    chain: normalizeChain(input.chain),
    target: input.target || input.contractName || input.contractAddress || "DemoVault",
    sourceType: input.sourceType || "solidity",
    priority: input.priority || "normal",
    sourceCode: input.sourceCode || input.source || demoSource,
    findings: [],
    aiSummary: null,
    reportUrl: null,
    progress: progressDefaults,
    createdAt: now,
    updatedAt: now
  };

  jobs.set(job.id, job);
  queue.push(job.id);
  recordJobProgress(job.id, progressDefaults);
  recordSystemEvent({
    lvl: "info",
    msg: `Audit job queued: ${job.target} / ${job.chain}`,
    jobId: job.id
  });
  await Promise.all([
    enqueueAuditJob(job),
    saveAuditJobSnapshot(job)
  ]);
  return structuredClone(job);
}

export async function createAuditJobFromUpload(input = {}) {
  const sourceCode = input.sourceCode || input.source || input.content || "";
  if (!sourceCode.trim()) {
    throw new Error("sourceCode is required");
  }

  return createAuditJob({
    ...input,
    target: input.target || input.contractName || input.filename || "UploadedContract",
    sourceType: input.sourceType || "solidity",
    sourceCode
  });
}

export function listAuditJobs() {
  return Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((job) => {
      const { sourceCode, reportMarkdown, ...safeJob } = job;
      return safeJob;
    });
}

export function getAuditJob(id, { includeSource = false, includeReport = false } = {}) {
  const job = jobs.get(id);
  if (!job) return null;

  const clone = structuredClone(job);
  if (!includeSource) delete clone.sourceCode;
  if (!includeReport) delete clone.reportMarkdown;
  return clone;
}

export async function processAuditJob(id, options = {}) {
  const job = jobs.get(id);
  if (!job) return null;

  const updateProgress = async (event) => {
    const nextProgress = recordJobProgress(id, {
      status: "running",
      ...event
    });
    const current = jobs.get(id);
    if (current && nextProgress) {
      jobs.set(id, {
        ...current,
        progress: nextProgress,
        updatedAt: new Date().toISOString()
      });
      recordPipelineEvent(current, nextProgress);
      await saveAuditEventSnapshot(id, nextProgress);
    }
  };

  const processing = {
    ...job,
    status: "processing",
    progress: {
      stage: "worker-claimed",
      percent: 8,
      message: "Audit worker claimed job"
    },
    updatedAt: new Date().toISOString()
  };
  jobs.set(id, processing);
  recordJobProgress(id, processing.progress);
  recordWorkerHeartbeat({
    id: options.worker?.id || `node-audit-worker-${process.pid}`,
    stack: options.worker?.runtime?.includes("rust") ? "rust" : "node",
    chain: processing.chain === "solana" ? "SOL" : processing.chain === "bsc" ? "BNB" : processing.chain === "polygon" ? "MATIC" : "ETH",
    status: "busy",
    tpm: 1,
    cpu: 18,
    mem: Math.round(process.memoryUsage().rss / 1024 / 1024)
  });
  recordPipelineEvent(processing, processing.progress);
  await saveAuditEventSnapshot(id, processing.progress);
  await markAuditJobProcessing(processing);
  await saveAuditJobSnapshot(processing);

  let result;

  try {
    result = await runAuditPipeline(processing, {
      ...options,
      onProgress: updateProgress
    });
  } catch (error) {
    const failed = {
      ...processing,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown audit pipeline error",
      updatedAt: new Date().toISOString()
    };
    jobs.set(id, failed);
    recordSystemEvent({ lvl: "err", msg: `Audit job failed: ${failed.id} - ${failed.error}`, jobId: failed.id });
    await Promise.all([
      markAuditJobFailed(failed, failed.error),
      saveAuditJobSnapshot(failed)
    ]);
    throw error;
  }
  const artifact = await storeAuditArtifact({
    jobId: result.id,
    filename: "audit-report.md",
    body: result.reportMarkdown,
    contentType: "text/markdown"
  });
  const reportKey = artifact.key;
  const reportUrl = artifact.uri;

  recordJobProgress(id, {
    stage: "artifact-storage",
    status: "running",
    percent: 94,
    message: "Report artifact stored with fallback adapter",
    detail: artifact
  });

  reports.set(reportKey, {
    key: reportKey,
    contentType: "text/markdown",
    body: result.reportMarkdown,
    artifact,
    createdAt: new Date().toISOString()
  });

  const completed = {
    ...result,
    reportUrl,
    reportKey,
    artifact,
    progress: recordJobProgress(id, {
      stage: "completed",
      status: "completed",
      percent: 100,
      message: "Audit completed and report is ready"
    })
  };
  jobs.set(id, completed);
  recordWorkerHeartbeat({
    id: options.worker?.id || `node-audit-worker-${process.pid}`,
    stack: options.worker?.runtime?.includes("rust") ? "rust" : "node",
    chain: completed.chain === "solana" ? "SOL" : completed.chain === "bsc" ? "BNB" : completed.chain === "polygon" ? "MATIC" : "ETH",
    status: "running",
    tpm: 1,
    cpu: 12,
    mem: Math.round(process.memoryUsage().rss / 1024 / 1024)
  });
  recordSystemEvent({
    lvl: completed.findings?.length ? "ok" : "info",
    msg: `Audit job completed: ${completed.target} / findings ${completed.findings?.length || 0}`,
    jobId: completed.id
  });
  await Promise.all([
    markAuditJobCompleted(completed),
    saveAuditJobSnapshot(completed),
    saveAuditFindingsSnapshot(id, completed.findings || []),
    saveAuditReportSnapshot(reports.get(reportKey), id)
  ]);

  const queueIndex = queue.indexOf(id);
  if (queueIndex >= 0) queue.splice(queueIndex, 1);

  return getAuditJob(id, { includeReport: true });
}

export async function processNextAuditJob(options = {}) {
  const payload = await dequeueAuditJob();
  const id = payload?.id || queue[0];
  if (!id) return null;

  if (!jobs.has(id) && payload?.sourceCode) {
    jobs.set(id, {
      ...payload,
      status: "queued",
      findings: [],
      aiSummary: null,
      reportUrl: null,
      progress: progressDefaults,
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return processAuditJob(id, options);
}

export function getAuditReport(keyOrId) {
  const key = keyOrId?.startsWith?.("reports/") ? keyOrId : `reports/${keyOrId}/audit-report.md`;
  return reports.get(key) || reports.get(`reports/${keyOrId}.md`) || null;
}

export async function getAuditMetrics() {
  const all = Array.from(jobs.values());
  const completed = all.filter((job) => job.status === "completed");
  const queued = all.filter((job) => job.status === "queued");
  const processing = all.filter((job) => job.status === "processing");
  const failed = all.filter((job) => job.status === "failed");
  const totalFindings = all.reduce((sum, job) => sum + (job.findings?.length || 0), 0);
  const [coreBackend, redisMetrics] = await Promise.all([
    getCoreBackendSummary(),
    getRedisQueueMetrics()
  ]);
  const redisQueued = redisMetrics.totals?.queued || 0;

  return {
    totalJobs: all.length + (coreBackend.counts?.auditJobs || 0),
    queuedJobs: queued.length,
    processingJobs: processing.length,
    completedJobs: completed.length,
    failedJobs: failed.length,
    totalFindings,
    queueDepth: Math.max(queue.length, redisQueued),
    workerMode: "node-runtime-ready",
    queueMode: getRedisQueueStatus().mode,
    databaseMode: getPostgresAdapterStatus().mode,
    supportedChains: ["ethereum", "solana", "polygon", "bsc"],
    storageTargets: [getStorageAdapterStatus().mode, "s3-ready", "ipfs-ready"],
    progressMode: "sse-and-websocket",
    aiAnalysis: "gemini-ready-with-local-fallback",
    coreBackend
  };
}

export function getAuditJobProgress(id) {
  return getJobProgress(id);
}
