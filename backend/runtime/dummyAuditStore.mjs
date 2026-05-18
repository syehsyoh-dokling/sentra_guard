const jobs = new Map();

export function createAuditJob(input = {}) {
  const now = new Date().toISOString();

  const job = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    status: "queued",
    chain: input.chain || "ethereum",
    target: input.target || input.contractAddress || "demo-contract",
    sourceType: input.sourceType || "solidity",
    priority: input.priority || "normal",
    findings: [],
    aiSummary: null,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  return job;
}

export function listAuditJobs() {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAuditJob(id) {
  return jobs.get(id) || null;
}

export function processAuditJob(id) {
  const job = jobs.get(id);

  if (!job) {
    return null;
  }

  const now = new Date().toISOString();

  const findings = [
    {
      id: `${id}-finding-1`,
      severity: "medium",
      title: "Potential reentrancy pattern",
      detector: "reentrancy-heuristic-detector",
      description: "Dummy detector found an external-call-like pattern.",
      recommendation: "Review checks-effects-interactions ordering and consider ReentrancyGuard."
    },
    {
      id: `${id}-finding-2`,
      severity: "low",
      title: "Missing explicit audit metadata",
      detector: "metadata-detector",
      description: "Dummy detector recommends clearer compiler, chain, and source metadata.",
      recommendation: "Attach compiler version, target chain, source hash, and deployment metadata."
    }
  ];

  const updated = {
    ...job,
    status: "completed",
    findings,
    aiSummary: "Dummy AI summary: review reentrancy, access control, and deployment metadata risks.",
    updatedAt: now,
    completedAt: now,
    durationMs: Math.floor(Math.random() * 400) + 120
  };

  jobs.set(id, updated);
  return updated;
}

export function getAuditMetrics() {
  const all = listAuditJobs();

  const completed = all.filter((job) => job.status === "completed");
  const queued = all.filter((job) => job.status === "queued");
  const failed = all.filter((job) => job.status === "failed");

  const totalFindings = all.reduce((sum, job) => sum + (job.findings?.length || 0), 0);

  return {
    totalJobs: all.length,
    queuedJobs: queued.length,
    completedJobs: completed.length,
    failedJobs: failed.length,
    totalFindings,
    workerMode: "dummy-in-memory",
    queueMode: "in-memory-review-runtime",
    supportedChains: ["ethereum", "solana", "polygon", "bsc"],
    storageTargets: ["local", "s3-placeholder", "ipfs-placeholder"],
    aiAnalysis: "placeholder"
  };
}
