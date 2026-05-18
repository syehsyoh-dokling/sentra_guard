let tick = 0;

const defaultState = {
  updatedAt: new Date().toISOString(),
  metrics: {
    audits24h: 126,
    activeWorkers: 6,
    maxWorkers: 8,
    queueDepth: 18,
    vulnsDetected: 11,
    criticalVulns: 1,
    avgAuditTimeSec: 47.6,
    aiAccuracy: 88.4
  },
  pipeline: {
    ingest: 28,
    parse: 24,
    staticAnalysis: 18,
    aiScan: 12,
    vulnScoring: 9,
    reportStore: 7
  },
  workers: [
    { id: "wkr-rust-01", stack: "rust", chain: "ETH", status: "running", tpm: 8, cpu: 38, mem: 512, up: "14d 6h" },
    { id: "wkr-rust-02", stack: "rust", chain: "ETH", status: "running", tpm: 7, cpu: 41, mem: 490, up: "14d 6h" },
    { id: "wkr-rust-03", stack: "rust", chain: "SOL", status: "busy", tpm: 5, cpu: 66, mem: 640, up: "5d 2h" },
    { id: "wkr-rust-04", stack: "rust", chain: "SOL", status: "running", tpm: 6, cpu: 44, mem: 520, up: "5d 2h" },
    { id: "wkr-node-01", stack: "node", chain: "BNB", status: "running", tpm: 4, cpu: 29, mem: 380, up: "10d 1h" },
    { id: "wkr-node-02", stack: "node", chain: "MATIC", status: "idle", tpm: 0, cpu: 2, mem: 310, up: "10d 1h" },
    { id: "wkr-rust-05", stack: "rust", chain: "ETH", status: "running", tpm: 9, cpu: 55, mem: 610, up: "2d 8h" },
    { id: "wkr-rust-06", stack: "rust", chain: "ETH", status: "error", tpm: 0, cpu: 0, mem: 0, up: "ERR" }
  ],
  queues: [
    { name: "audit:eth:high", depth: 9, cap: 80, proc: 18, tone: "warn" },
    { name: "audit:sol:normal", depth: 7, cap: 80, proc: 14, tone: "ok" },
    { name: "audit:eth:normal", depth: 6, cap: 80, proc: 12, tone: "info" },
    { name: "audit:bnb:normal", depth: 4, cap: 60, proc: 8, tone: "ok" },
    { name: "report:generate", depth: 3, cap: 40, proc: 6, tone: "ok" },
    { name: "storage:ipfs", depth: 5, cap: 40, proc: 5, tone: "warn" }
  ],
  vulnerabilities: [
    { severity: "critical", type: "Reentrancy", contract: "0x3f2a...8c1d", chain: "ETH", by: "AI+Static", time: "2m ago", status: "Open" },
    { severity: "critical", type: "Flash Loan", contract: "0x9b1e...4f0a", chain: "ETH", by: "LLM Scan", time: "11m ago", status: "Open" },
    { severity: "critical", type: "Priv Escalation", contract: "7d4c...2e9b", chain: "SOL", by: "AI+Static", time: "34m ago", status: "Open" },
    { severity: "high", type: "Integer Overflow", contract: "0xaa3d...7c12", chain: "BNB", by: "Static", time: "1h ago", status: "Review" },
    { severity: "high", type: "Unchecked Call", contract: "0x12bc...9a4f", chain: "ETH", by: "AST Engine", time: "2h ago", status: "Patched" },
    { severity: "medium", type: "Tx Origin", contract: "0x77ef...3310", chain: "MATIC", by: "Static", time: "3h ago", status: "Closed" }
  ],
  aiModels: [
    { label: "Claude Sonnet", provider: "Anthropic - Vuln analysis", latency: "2.8s avg", req: "74 req/24h", health: "Healthy", tone: "ok" },
    { label: "GPT-4o", provider: "OpenAI - Code reasoning", latency: "4.1s avg", req: "51 req/24h", health: "Healthy", tone: "ok" },
    { label: "Local Llama-3.1", provider: "Self-hosted - Fast triage", latency: "0.9s avg", req: "212 req/24h", health: "Healthy", tone: "ok" }
  ],
  infrastructure: [
    { name: "postgres-primary", icon: "DB", status: "ok", cpu: 22, mem: 68 },
    { name: "postgres-replica", icon: "DB", status: "ok", cpu: 18, mem: 62 },
    { name: "redis-master", icon: "RS", status: "ok", cpu: 14, mem: 44 },
    { name: "redis-replica", icon: "RS", status: "ok", cpu: 11, mem: 40 },
    { name: "rust-axum-api", icon: "RX", status: "ok", cpu: 35, mem: 52 },
    { name: "node-ts-api", icon: "TS", status: "warn", cpu: 61, mem: 74 },
    { name: "worker-scheduler", icon: "WK", status: "ok", cpu: 28, mem: 38 },
    { name: "ipfs-gateway", icon: "IP", status: "warn", cpu: 47, mem: 55 },
    { name: "s3-proxy", icon: "S3", status: "ok", cpu: 9, mem: 22 }
  ],
  cicd: [
    { branch: "main <- feat/ws-improvements", commit: "fix: async worker backpressure", time: "8m ago", status: "ok", dur: "3m12s" },
    { branch: "main <- fix/redis-queue", commit: "perf: batch queue flush", time: "1h ago", status: "ok", dur: "2m48s" },
    { branch: "staging <- feat/ai-llm-v2", commit: "feat: Claude integration", time: "3h ago", status: "warn", dur: "7m02s" },
    { branch: "dev <- feat/solana-parser", commit: "feat: BPF bytecode parsing", time: "5h ago", status: "crit", dur: "failed" },
    { branch: "main <- fix/ipfs-storage", commit: "fix: IPFS pin retry logic", time: "8h ago", status: "ok", dur: "4m15s" }
  ],
  logs: [
    { ts: "14:32:07", lvl: "ok", msg: "Worker wkr-rust-01 completed audit task #AU-19843 in 48.2s" },
    { ts: "14:32:09", lvl: "ai", msg: "LLM scan: reentrancy pattern detected in 0x3f2a...8c1d with confidence 89.4%" },
    { ts: "14:32:11", lvl: "err", msg: "CRITICAL vuln flagged and dispatched to review queue [ETH/reentrancy]" },
    { ts: "14:32:15", lvl: "info", msg: "Queue audit:eth:high depth 9; monitor threshold remains below autoscale limit" }
  ],
  chains: [
    { name: "Ethereum", sym: "ETH", color: "#627eea", block: 19472810, latency: "42ms", sync: "100%", peers: 48, status: "ok" },
    { name: "Solana", sym: "SOL", color: "#9945ff", block: 271834102, latency: "18ms", sync: "100%", peers: 32, status: "ok" },
    { name: "BNB Chain", sym: "BNB", color: "#f0b90b", block: 37821047, latency: "89ms", sync: "99.8%", peers: 21, status: "warn" },
    { name: "Polygon", sym: "MATIC", color: "#8247e5", block: 54910372, latency: "61ms", sync: "100%", peers: 19, status: "ok" }
  ]
};

let state = structuredClone(defaultState);

function nowTime() {
  const n = new Date();
  return [
    String(n.getUTCHours()).padStart(2, "0"),
    String(n.getUTCMinutes()).padStart(2, "0"),
    String(n.getUTCSeconds()).padStart(2, "0")
  ].join(":");
}

function mergeObject(base, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return base;
  }

  const output = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      output[key] = value;
    } else if (value && typeof value === "object") {
      output[key] = mergeObject(base?.[key] || {}, value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

export function getAdminRealtimeState() {
  return structuredClone(state);
}

export function resetAdminRealtimeState() {
  tick = 0;
  state = structuredClone(defaultState);
  state.updatedAt = new Date().toISOString();
  return getAdminRealtimeState();
}

export function applyAdminRealtimeEvent(patch = {}) {
  state = mergeObject(state, patch);
  state.updatedAt = new Date().toISOString();
  return getAdminRealtimeState();
}

export function advanceAdminDemoTick(frame = null) {
  tick += 1;

  if (frame && typeof frame === "object") {
    return applyAdminRealtimeEvent(frame);
  }

  const wave = (base, range, offset) => Math.max(0, base + Math.floor(Math.sin((tick + offset) * 0.8) * range));

  state.metrics = {
    ...state.metrics,
    audits24h: wave(126, 18, 1),
    activeWorkers: 5 + (tick % 4),
    queueDepth: wave(18, 9, 2),
    vulnsDetected: wave(11, 4, 3),
    criticalVulns: tick % 6 === 0 ? 2 : 1,
    avgAuditTimeSec: Number((47.6 + Math.sin(tick) * 6.4).toFixed(1)),
    aiAccuracy: Number((88.4 + Math.sin(tick / 2) * 2.2).toFixed(1))
  };

  state.pipeline = {
    ingest: wave(28, 7, 1),
    parse: wave(24, 6, 2),
    staticAnalysis: wave(18, 5, 3),
    aiScan: wave(12, 4, 4),
    vulnScoring: wave(9, 3, 5),
    reportStore: wave(7, 2, 6)
  };

  state.queues = state.queues.map((queue, index) => ({
    ...queue,
    depth: wave(queue.depth, 12 + index, index + 1),
    proc: wave(queue.proc, 30, index + 2)
  }));

  state.workers = state.workers.map((worker, index) => ({
    ...worker,
    status: worker.status === "error" && tick % 4 === 0 ? "running" : worker.status,
    tpm: worker.status === "idle" ? tick % 2 === 0 ? 1 : 0 : wave(worker.tpm || 4, 3, index + 1),
    cpu: Math.min(95, wave(worker.cpu || 20, 18, index + 2)),
    mem: Math.max(220, wave(worker.mem || 400, 45, index + 3))
  }));

  state.infrastructure = state.infrastructure.map((node, index) => ({
    ...node,
    cpu: Math.min(94, wave(node.cpu, 12, index + 1)),
    mem: Math.min(92, wave(node.mem, 10, index + 2)),
    status: node.cpu > 58 || node.mem > 72 ? "warn" : node.status
  }));

  state.aiModels = state.aiModels.map((model, index) => ({
    ...model,
    latency: `${Number((index + 1.1 + Math.abs(Math.sin(tick + index)) * 2.8).toFixed(1))}s avg`,
    req: `${wave(index === 2 ? 212 : 64, 24, index + 1)} req/24h`,
    health: index === 1 && tick % 7 === 0 ? "Degraded" : "Healthy",
    tone: index === 1 && tick % 7 === 0 ? "warn" : "ok"
  }));

  state.chains = state.chains.map((chain, index) => ({
    ...chain,
    block: chain.block + tick + index,
    latency: `${wave(Number.parseInt(chain.latency, 10), 9, index + 1)}ms`,
    peers: wave(chain.peers, 3, index + 2),
    status: index === 2 && tick % 3 === 0 ? "warn" : "ok"
  }));

  const logTemplates = [
    { lvl: "ok", msg: `Worker wkr-rust-0${(tick % 5) + 1} completed audit task #AU-${19840 + tick} in ${38 + (tick % 22)}.2s` },
    { lvl: "ai", msg: `LLM scan completed for contract 0x${String(3000 + tick)}...${String(8000 + tick)} with confidence ${84 + (tick % 11)}%` },
    { lvl: "info", msg: `Queue audit:eth:high depth updated to ${state.queues[0].depth}` },
    { lvl: "warn", msg: `IPFS gateway latency moved to ${state.chains[1].latency}` },
    { lvl: "err", msg: `Critical detector found candidate risk in batch ${tick}` }
  ];

  state.logs = [
    ...state.logs.slice(-24),
    { ts: nowTime(), ...logTemplates[tick % logTemplates.length] }
  ];

  state.updatedAt = new Date().toISOString();

  return getAdminRealtimeState();
}
