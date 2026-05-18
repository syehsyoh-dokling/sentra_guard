import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./admin-ops.css";

type WorkerStatus = "running" | "idle" | "busy" | "error";
type Tone = "ok" | "warn" | "crit" | "info" | "ai";

type WorkerNode = {
  id: string;
  stack: "rust" | "node" | "py";
  chain: "ETH" | "SOL" | "BNB" | "MATIC";
  status: WorkerStatus;
  tpm: number;
  cpu: number;
  mem: number;
  up: string;
};

type QueueItem = {
  name: string;
  depth: number;
  cap: number;
  proc: number;
  tone: "crit" | "warn" | "info" | "ok";
};

type Vulnerability = {
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  contract: string;
  chain: WorkerNode["chain"];
  by: string;
  time: string;
  status: string;
};

type AiModelData = {
  label: string;
  provider: string;
  latency: string;
  req: string;
  health: string;
  tone: "ok" | "warn";
};

type InfraNode = {
  name: string;
  icon: string;
  status: "ok" | "warn";
  cpu: number;
  mem: number;
};

type CiItemData = {
  branch: string;
  commit: string;
  time: string;
  status: "ok" | "warn" | "crit";
  dur: string;
};

type LogLine = {
  ts: string;
  lvl: "ok" | "ai" | "err" | "info" | "warn";
  msg: string;
};

type ChainNode = {
  name: string;
  sym: string;
  color: string;
  block: number;
  latency: string;
  sync: string;
  peers: number;
  status: "ok" | "warn";
};

type AdminRealtimeState = {
  updatedAt: string;
  metrics: {
    audits24h: number;
    activeWorkers: number;
    maxWorkers: number;
    queueDepth: number;
    vulnsDetected: number;
    criticalVulns: number;
    avgAuditTimeSec: number;
    aiAccuracy: number;
  };
  pipeline: {
    ingest: number;
    parse: number;
    staticAnalysis: number;
    aiScan: number;
    vulnScoring: number;
    reportStore: number;
  };
  workers: WorkerNode[];
  queues: QueueItem[];
  vulnerabilities: Vulnerability[];
  aiModels: AiModelData[];
  infrastructure: InfraNode[];
  cicd: CiItemData[];
  logs: LogLine[];
  chains: ChainNode[];
};

type BackendHealth = {
  status: string;
  service: string;
  mode: string;
  timestamp: string;
  realtimeClients?: number;
  progressSocketClients?: number;
};

type BackendMetrics = {
  totalJobs: number;
  queuedJobs: number;
  queueDepth?: number;
  completedJobs: number;
  failedJobs: number;
  totalFindings: number;
  workerMode: string;
  queueMode: string;
  databaseMode?: string;
  progressMode?: string;
  supportedChains: string[];
  storageTargets: string[];
  aiAnalysis: string;
  coreBackend?: CoreBackendSummary;
};

type CoreBackendSummary = {
  online: boolean;
  source: string;
  baseUrl: string;
  latencyMs: number;
  error?: string;
  counts: {
    audits: number;
    auditJobs: number;
    queuedJobs: number;
    transferredJobs: number;
    payments: number;
    highPriorityJobs: number;
  };
  latest: {
    audit: null | {
      id: string;
      blockchain: string;
      priority: string;
      auditType: string;
      status: string;
      createdAt: string;
    };
    job: null | {
      id: string;
      auditId: string;
      priority: string;
      status: string;
      transferStatus: string;
      createdAt: string;
    };
  };
};

type BackendJob = {
  id: string;
  status: string;
  chain: string;
  target: string;
  sourceType: string;
  priority: string;
  findings?: Array<{ id: string; severity: string; title: string }>;
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendFeature = {
  key: string;
  status: string;
  description: string;
};

type ApiTestResult = {
  name: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
};

type ApiTestResponse = {
  testedAt: string;
  results: ApiTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type ReadinessResponse = {
  status: string;
  score: number;
  nextRequiredInputs: string[];
};

type RuntimeConfig = {
  publicAppUrl: string;
  environmentName: string;
  deploymentRegion: string;
  backendApiUrl: string;
  coreBackendUrl: string;
  allowedOrigins: string;
  authIssuerUrl: string;
  authClientId: string;
  authClientSecret: string;
  jwtSecret: string;
  sessionEncryptionKey: string;
  adminBootstrapToken: string;
  aiProviderUrl: string;
  aiApiKey: string;
  aiOrgId: string;
  databaseUrl: string;
  redisUrl: string;
  ethereumRpcUrl: string;
  solanaRpcUrl: string;
  bnbRpcUrl: string;
  polygonRpcUrl: string;
  relayerPrivateKey: string;
  detectorRulesUrl: string;
  storageBucketUrl: string;
  storageAccessKey: string;
  storageSecretKey: string;
  ipfsGatewayUrl: string;
  ipfsApiToken: string;
  realtimeStreamUrl: string;
  observabilityUrl: string;
  errorTrackingDsn: string;
  ciWebhookUrl: string;
  ciWebhookSecret: string;
  gitRepositoryUrl: string;
  dockerRegistryUrl: string;
  rateLimitPerMinute: string;
  auditRetentionDays: string;
  queueConcurrency: string;
  adminEmail: string;
  hardRulesPrompt: string;
  triagePrompt: string;
  workerRoutingPrompt: string;
  reportPrompt: string;
  remediationPrompt: string;
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  publicAppUrl: "http://127.0.0.1:5173",
  environmentName: "staging",
  deploymentRegion: "ap-southeast-3",
  backendApiUrl: "http://localhost:8787",
  coreBackendUrl: "http://127.0.0.1:4000",
  allowedOrigins: "http://127.0.0.1:5173,http://localhost:5173",
  authIssuerUrl: "https://accounts.google.com",
  authClientId: "SET_IN_GOOGLE_CLOUD_CONSOLE:OAUTH_CLIENT_ID",
  authClientSecret: "SET_IN_SERVER_ENV:OAUTH_CLIENT_SECRET",
  jwtSecret: "SET_IN_SERVER_ENV:JWT_SIGNING_SECRET",
  sessionEncryptionKey: "SET_IN_SERVER_ENV:SESSION_ENCRYPTION_KEY",
  adminBootstrapToken: "demo-admin-token",
  aiProviderUrl: "https://api.openai.com/v1",
  aiApiKey: "SET_IN_SERVER_ENV:OPENAI_API_KEY",
  aiOrgId: "SET_IN_SERVER_ENV:OPENAI_PROJECT_OR_ORG_ID",
  databaseUrl: "postgres://postgres:postgres@localhost:5432/blockchain_audit",
  redisUrl: "redis://localhost:6379/0",
  ethereumRpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  solanaRpcUrl: "https://api.devnet.solana.com",
  bnbRpcUrl: "https://bsc-testnet-dataseed.bnbchain.org",
  polygonRpcUrl: "https://polygon-amoy.drpc.org",
  relayerPrivateKey: "SET_IN_SERVER_ENV:RELAYER_PRIVATE_KEY",
  detectorRulesUrl: "http://localhost:8787/security/detector-rules",
  storageBucketUrl: "s3://danandad-audit-reports/staging",
  storageAccessKey: "SET_IN_SERVER_ENV:S3_ACCESS_KEY_ID",
  storageSecretKey: "SET_IN_SERVER_ENV:S3_SECRET_ACCESS_KEY",
  ipfsGatewayUrl: "https://ipfs.io/ipfs/",
  ipfsApiToken: "SET_IN_SERVER_ENV:PINATA_JWT_OR_IPFS_TOKEN",
  realtimeStreamUrl: "http://localhost:8787/admin/realtime-state",
  observabilityUrl: "http://localhost:8787/health",
  errorTrackingDsn: "SET_IN_SERVER_ENV:SENTRY_DSN",
  ciWebhookUrl: "https://api.github.com/repos/syehsyoh-dokling/blockchain",
  ciWebhookSecret: "SET_IN_SERVER_ENV:DEPLOY_WEBHOOK_SECRET",
  gitRepositoryUrl: "https://github.com/syehsyoh-dokling/blockchain",
  dockerRegistryUrl: "https://registry-1.docker.io/v2/",
  rateLimitPerMinute: "60",
  auditRetentionDays: "365",
  queueConcurrency: "8",
  adminEmail: "admin@danandad.com",
  hardRulesPrompt: "Reject unverifiable claims, require evidence from static detectors, and never mark a finding closed without a reproducible reason.",
  triagePrompt: "Classify findings by exploitability, affected funds, user impact, and chain-specific risk. Return severity with short rationale.",
  workerRoutingPrompt: "Route Solidity/EVM, Solana BPF, and infrastructure issues to the most reliable detector and reviewer lane.",
  reportPrompt: "Write concise audit reports with executive summary, confirmed findings, false-positive notes, reproduction steps, and remediation guidance.",
  remediationPrompt: "Suggest minimal secure patches and regression tests. Prefer established library patterns over custom security code.",
};

const RUNTIME_CONFIG_VERSION = "2026-05-network-indexer-link";

const TASK_READY_FIELDS: Partial<Record<keyof RuntimeConfig, string>> = {
  backendApiUrl: "API backend / upload / queue",
  coreBackendUrl: "Existing core backend / audit intake",
  databaseUrl: "Postgres audit snapshots",
  redisUrl: "Redis audit queue",
  queueConcurrency: "Worker throughput",
  detectorRulesUrl: "Vulnerability detector",
  realtimeStreamUrl: "SSE + WebSocket progress",
  observabilityUrl: "Health + readiness",
  ethereumRpcUrl: "Ethereum RPC testing",
  solanaRpcUrl: "Solana RPC testing",
  bnbRpcUrl: "BNB RPC testing",
  polygonRpcUrl: "Polygon RPC testing",
  storageBucketUrl: "Report artifact storage",
  ipfsGatewayUrl: "IPFS gateway fallback",
  aiProviderUrl: "AI/LLM analysis layer",
  aiApiKey: "AI provider secret",
  hardRulesPrompt: "LLM hard rules",
  triagePrompt: "LLM triage",
  workerRoutingPrompt: "Worker role routing",
  reportPrompt: "Report generator",
  remediationPrompt: "Remediation guidance",
  rateLimitPerMinute: "API hardening",
  auditRetentionDays: "Audit retention",
  allowedOrigins: "Production CORS",
  publicAppUrl: "Frontend domain",
  gitRepositoryUrl: "CI/CD source",
  dockerRegistryUrl: "Container registry",
};

const SETTINGS_GROUPS: Array<{
  category: "Secrets & Credentials" | "General Config";
  title: string;
  fields: Array<{ key: keyof RuntimeConfig; label: string; placeholder: string; secret?: boolean }>;
}> = [
  {
    category: "General Config",
    title: "Integrations",
    fields: [
      { key: "publicAppUrl", label: "Public App URL", placeholder: "https://audit.example.com" },
      { key: "backendApiUrl", label: "Backend API URL", placeholder: "http://localhost:8787" },
      { key: "coreBackendUrl", label: "Core Backend URL", placeholder: "http://127.0.0.1:4000" },
      { key: "adminEmail", label: "Admin Account Email", placeholder: "admin@danandad.com" },
      { key: "allowedOrigins", label: "Allowed CORS Origins", placeholder: "https://audit.example.com,https://admin.example.com" },
      { key: "environmentName", label: "Environment Name", placeholder: "production / staging" },
      { key: "deploymentRegion", label: "Deployment Region", placeholder: "ap-southeast-3" },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "Auth & Secrets",
    fields: [
      { key: "authIssuerUrl", label: "Auth Issuer URL", placeholder: "https://auth.example.com/oauth2/default" },
      { key: "authClientId", label: "OAuth Client ID", placeholder: "public client id" },
      { key: "authClientSecret", label: "OAuth Client Secret", placeholder: "server-side secret", secret: true },
      { key: "jwtSecret", label: "JWT Signing Secret", placeholder: "server-side JWT secret", secret: true },
      { key: "sessionEncryptionKey", label: "Session Encryption Key", placeholder: "server-side encryption key", secret: true },
      { key: "adminBootstrapToken", label: "Admin Bootstrap Token", placeholder: "one-time admin setup token", secret: true },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "AI Runtime",
    fields: [
      { key: "aiProviderUrl", label: "AI Gateway URL", placeholder: "https://api.openai.com/v1 or internal gateway" },
      { key: "aiApiKey", label: "AI API Key", placeholder: "Store production secrets on the server", secret: true },
      { key: "aiOrgId", label: "AI Organization / Project ID", placeholder: "org/project identifier" },
    ],
  },
  {
    category: "General Config",
    title: "Prompting",
    fields: [
      { key: "hardRulesPrompt", label: "Hard Rules Prompt", placeholder: "Non-negotiable rules for every AI response" },
      { key: "triagePrompt", label: "Vulnerability Triage Prompt", placeholder: "How AI ranks severity and confidence" },
      { key: "workerRoutingPrompt", label: "Worker Role Routing Prompt", placeholder: "How AI assigns detector/reviewer roles" },
      { key: "reportPrompt", label: "Audit Report Prompt", placeholder: "How AI writes final reports" },
      { key: "remediationPrompt", label: "Remediation Prompt", placeholder: "How AI suggests fixes and tests" },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "Database & Queue",
    fields: [
      { key: "databaseUrl", label: "Postgres Database URL", placeholder: "postgres://user:pass@host:5432/db", secret: true },
      { key: "redisUrl", label: "Redis Queue URL", placeholder: "redis://:pass@host:6379/0", secret: true },
      { key: "queueConcurrency", label: "Worker Queue Concurrency", placeholder: "8" },
    ],
  },
  {
    category: "General Config",
    title: "Blockchain Nodes",
    fields: [
      { key: "ethereumRpcUrl", label: "Ethereum RPC", placeholder: "https://mainnet.infura.io/v3/..." },
      { key: "solanaRpcUrl", label: "Solana RPC", placeholder: "https://api.mainnet-beta.solana.com" },
      { key: "bnbRpcUrl", label: "BNB Chain RPC", placeholder: "https://bsc-dataseed.binance.org" },
      { key: "polygonRpcUrl", label: "Polygon RPC", placeholder: "https://polygon-rpc.com" },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "Chain Credentials",
    fields: [
      { key: "relayerPrivateKey", label: "Relayer Private Key", placeholder: "server-side relayer wallet key", secret: true },
    ],
  },
  {
    category: "General Config",
    title: "Security Engines",
    fields: [
      { key: "detectorRulesUrl", label: "Detector Rules URL", placeholder: "https://security.example.com/ruleset.json" },
      { key: "rateLimitPerMinute", label: "Rate Limit Per Minute", placeholder: "60" },
      { key: "auditRetentionDays", label: "Audit Retention Days", placeholder: "365" },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "Storage",
    fields: [
      { key: "storageBucketUrl", label: "Report Storage URL", placeholder: "s3://danandad-audit-reports/prod" },
      { key: "storageAccessKey", label: "Storage Access Key", placeholder: "S3 access key or provider id", secret: true },
      { key: "storageSecretKey", label: "Storage Secret Key", placeholder: "S3 secret key", secret: true },
      { key: "ipfsGatewayUrl", label: "IPFS Gateway URL", placeholder: "https://ipfs.io/ipfs/" },
      { key: "ipfsApiToken", label: "IPFS API Token", placeholder: "pinning service API token", secret: true },
    ],
  },
  {
    category: "General Config",
    title: "Realtime",
    fields: [
      { key: "realtimeStreamUrl", label: "Realtime Stream URL", placeholder: "wss://api.example.com/audit/events" },
    ],
  },
  {
    category: "General Config",
    title: "Observability",
    fields: [
      { key: "observabilityUrl", label: "Logs / Metrics URL", placeholder: "https://grafana.example.com/d/audit-ops" },
      { key: "errorTrackingDsn", label: "Error Tracking DSN", placeholder: "https://public@sentry.example/project" },
    ],
  },
  {
    category: "Secrets & Credentials",
    title: "CI/CD & Deploy",
    fields: [
      { key: "ciWebhookUrl", label: "CI/CD Webhook URL", placeholder: "https://ci.example.com/hooks/deploy" },
      { key: "ciWebhookSecret", label: "CI/CD Webhook Secret", placeholder: "deploy webhook secret", secret: true },
      { key: "gitRepositoryUrl", label: "Git Repository URL", placeholder: "https://github.com/org/repo" },
      { key: "dockerRegistryUrl", label: "Docker Registry URL", placeholder: "registry.example.com/danandad/audit" },
    ],
  },
];

function loadRuntimeConfig() {
  const defaults = getRuntimeDefaults();
  const raw = localStorage.getItem("danandadRuntimeConfig");
  const version = localStorage.getItem("danandadRuntimeConfigVersion");

  if (!raw || version !== RUNTIME_CONFIG_VERSION) {
    localStorage.setItem("danandadRuntimeConfig", JSON.stringify(defaults));
    localStorage.setItem("danandadRuntimeConfigVersion", RUNTIME_CONFIG_VERSION);
    return defaults;
  }

  try {
    const saved = JSON.parse(raw) as Partial<RuntimeConfig>;
    const next = { ...defaults };

    for (const key of Object.keys(next) as Array<keyof RuntimeConfig>) {
      const value = saved[key];

      if (typeof value === "string" && value.trim()) {
        next[key] = value;
      }
    }

    localStorage.setItem("danandadRuntimeConfig", JSON.stringify(next));
    localStorage.setItem("danandadRuntimeConfigVersion", RUNTIME_CONFIG_VERSION);
    return next;
  } catch {
    localStorage.setItem("danandadRuntimeConfig", JSON.stringify(defaults));
    localStorage.setItem("danandadRuntimeConfigVersion", RUNTIME_CONFIG_VERSION);
    return defaults;
  }
}

function getRuntimeDefaults(): RuntimeConfig {
  const publicAppUrl = window.location.origin || DEFAULT_RUNTIME_CONFIG.publicAppUrl;
  const backendApiUrl = "http://127.0.0.1:8787";
  const allowedOrigins = Array.from(new Set([
    publicAppUrl,
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
  ])).join(",");

  return {
    ...DEFAULT_RUNTIME_CONFIG,
    publicAppUrl,
    backendApiUrl,
    coreBackendUrl: "http://127.0.0.1:4000",
    allowedOrigins,
    detectorRulesUrl: `${backendApiUrl}/security/detector-rules`,
    realtimeStreamUrl: `${backendApiUrl}/admin/realtime-state`,
    observabilityUrl: `${backendApiUrl}/health`,
  };
}

async function fetchBackendJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${cleanBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function toneVar(tone: Tone) {
  if (tone === "crit") return "var(--crit)";
  if (tone === "warn") return "var(--warn)";
  if (tone === "info") return "var(--info)";
  if (tone === "ai") return "var(--ai)";
  return "var(--ok)";
}

function chainColor(chain: WorkerNode["chain"]) {
  if (chain === "ETH") return "#627eea";
  if (chain === "SOL") return "#9945ff";
  if (chain === "BNB") return "#f0b90b";
  return "#8247e5";
}

function utcTime() {
  return new Date().toUTCString().slice(17, 25) + " UTC";
}

function isPlaceholder(value: string) {
  return value.startsWith("SET_IN_") || value.includes("replace-with");
}

function getAdminHeaders(config: RuntimeConfig): Record<string, string> {
  return config.adminBootstrapToken && !isPlaceholder(config.adminBootstrapToken)
    ? { "X-Admin-Token": config.adminBootstrapToken }
    : {};
}

export default function AdminOperationsCenter() {
  const [clock, setClock] = useState(utcTime());
  const [adminState, setAdminState] = useState<AdminRealtimeState | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [backendMetrics, setBackendMetrics] = useState<BackendMetrics | null>(null);
  const [backendJobs, setBackendJobs] = useState<BackendJob[]>([]);
  const [backendFeatures, setBackendFeatures] = useState<BackendFeature[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendBusy, setBackendBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(() => loadRuntimeConfig());
  const [openSettingsGroup, setOpenSettingsGroup] = useState("Integrations");
  const [selectedPromptKey, setSelectedPromptKey] = useState<keyof RuntimeConfig>("hardRulesPrompt");
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [apiTestResults, setApiTestResults] = useState<ApiTestResult[]>([]);
  const [apiTestBusy, setApiTestBusy] = useState(false);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "fallback">("connecting");

  const updateRuntimeConfig = (key: keyof RuntimeConfig, value: string) => {
    setRuntimeConfig((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem("danandadRuntimeConfig", JSON.stringify(next));
      return next;
    });
  };

  const refreshBackendState = useCallback(async () => {
    try {
      const [health, metrics, featuresResponse, jobsResponse, readinessResponse] = await Promise.all([
        fetchBackendJson<BackendHealth>(runtimeConfig.backendApiUrl, "/health"),
        fetchBackendJson<BackendMetrics>(runtimeConfig.backendApiUrl, "/audit/metrics"),
        fetchBackendJson<{ features: BackendFeature[] }>(runtimeConfig.backendApiUrl, "/audit/features"),
        fetchBackendJson<{ jobs: BackendJob[] }>(runtimeConfig.backendApiUrl, "/audit/jobs"),
        fetchBackendJson<ReadinessResponse>(runtimeConfig.backendApiUrl, "/readiness"),
      ]);
      const realtimeState = await fetchBackendJson<AdminRealtimeState>(runtimeConfig.backendApiUrl, "/admin/realtime-state", {
        headers: getAdminHeaders(runtimeConfig),
      }).catch(() => null);
      const coreDashboard = await fetchBackendJson<{ summary: CoreBackendSummary; state: AdminRealtimeState }>(
        runtimeConfig.backendApiUrl,
        "/integrations/core-backend/dashboard-state",
      ).catch(() => null);

      setBackendHealth(health);
      setBackendMetrics(metrics);
      setBackendFeatures(featuresResponse.features);
      setBackendJobs(jobsResponse.jobs);
      if (coreDashboard?.state) {
        setAdminState(coreDashboard.state);
      } else if (realtimeState) {
        setAdminState(realtimeState);
      }
      setReadiness(readinessResponse);
      setBackendError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown backend connection error";
      setBackendError(message);
      setBackendHealth(null);
      setReadiness(null);
    }
  }, [runtimeConfig]);

  const createDummyAuditJob = useCallback(async () => {
    setBackendBusy(true);

    try {
      await fetchBackendJson<{ job: BackendJob }>(runtimeConfig.backendApiUrl, "/audit/jobs", {
        method: "POST",
        body: JSON.stringify({
          chain: "ethereum",
          target: "DemoVault",
          sourceType: "solidity",
          priority: "normal",
        }),
      });

      await refreshBackendState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create dummy audit job";
      setBackendError(message);
    } finally {
      setBackendBusy(false);
    }
  }, [refreshBackendState, runtimeConfig.backendApiUrl]);

  const processLatestAuditJob = useCallback(async () => {
    const latestJob = backendJobs.find((job) => job.status !== "completed") ?? backendJobs[0];

    if (!latestJob) {
      setBackendError("No audit job available. Create a job first.");
      return;
    }

    setBackendBusy(true);

    try {
      await fetchBackendJson<{ result: BackendJob }>(runtimeConfig.backendApiUrl, `/audit/jobs/${latestJob.id}/process`, {
        method: "POST",
      });

      await refreshBackendState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process audit job";
      setBackendError(message);
    } finally {
      setBackendBusy(false);
    }
  }, [backendJobs, refreshBackendState, runtimeConfig.backendApiUrl]);

  const triggerDemoTick = useCallback(async () => {
    setBackendBusy(true);

    try {
      await fetchBackendJson<{ state: AdminRealtimeState }>(runtimeConfig.backendApiUrl, "/admin/realtime-demo/tick", {
        method: "POST",
        headers: getAdminHeaders(runtimeConfig),
        body: JSON.stringify({}),
      });

      await refreshBackendState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to trigger realtime tick";
      setBackendError(message);
    } finally {
      setBackendBusy(false);
    }
  }, [refreshBackendState, runtimeConfig]);

  const saveRuntimeSettings = useCallback(async () => {
    setApiTestBusy(true);
    setSettingsStatus("Saving runtime settings...");

    try {
      const response = await fetchBackendJson<{ accepted: string[]; skipped: string[] }>(runtimeConfig.backendApiUrl, "/config/runtime", {
        method: "POST",
        headers: getAdminHeaders(runtimeConfig),
        body: JSON.stringify(runtimeConfig),
      });

      setSettingsStatus(`Saved ${response.accepted.length} fields. Skipped ${response.skipped.length} placeholders/empty values.`);
      await refreshBackendState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save runtime settings";
      setSettingsStatus(message);
    } finally {
      setApiTestBusy(false);
    }
  }, [refreshBackendState, runtimeConfig]);

  const runConnectionTests = useCallback(async () => {
    setApiTestBusy(true);
    setSettingsStatus("Testing configured endpoints...");

    try {
      const response = await fetchBackendJson<ApiTestResponse>(runtimeConfig.backendApiUrl, "/config/test", {
        method: "POST",
        headers: getAdminHeaders(runtimeConfig),
        body: JSON.stringify({ scope: "all" }),
      });

      setApiTestResults(response.results);
      setSettingsStatus(`API tests: ${response.summary.passed}/${response.summary.total} passed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run API tests";
      setSettingsStatus(message);
    } finally {
      setApiTestBusy(false);
    }
  }, [runtimeConfig]);

  const resetRuntimeSettings = useCallback(() => {
    const defaults = getRuntimeDefaults();
    localStorage.setItem("danandadRuntimeConfig", JSON.stringify(defaults));
    localStorage.setItem("danandadRuntimeConfigVersion", RUNTIME_CONFIG_VERSION);
    setRuntimeConfig(defaults);
    setSettingsStatus("Local settings reset to demo-ready defaults.");
    setApiTestResults([]);
  }, []);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(utcTime()), 1000);

    const initialTimer = window.setTimeout(() => {
      void refreshBackendState();
    }, 0);

    const backendTimer = window.setInterval(() => {
      void refreshBackendState();
    }, 2000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearTimeout(initialTimer);
      window.clearInterval(backendTimer);
    };
  }, [refreshBackendState]);

  useEffect(() => {
    const cleanBaseUrl = runtimeConfig.backendApiUrl.replace(/\/$/, "");
    const streamUrl = new URL(`${cleanBaseUrl}/admin/realtime-stream`);
    if (runtimeConfig.adminBootstrapToken && !isPlaceholder(runtimeConfig.adminBootstrapToken)) {
      streamUrl.searchParams.set("adminToken", runtimeConfig.adminBootstrapToken);
    }
    const source = new EventSource(streamUrl.toString());

    source.addEventListener("dashboard-state", (event) => {
      try {
        setAdminState(JSON.parse((event as MessageEvent).data) as AdminRealtimeState);
        setStreamStatus("live");
      } catch {
        setStreamStatus("fallback");
      }
    });

    source.onerror = () => {
      setStreamStatus("fallback");
    };

    return () => source.close();
  }, [runtimeConfig.backendApiUrl]);

  const metrics = adminState?.metrics;
  const pipeline = adminState?.pipeline;
  const workers = adminState?.workers ?? [];
  const queues = adminState?.queues ?? [];
  const vulnerabilities = adminState?.vulnerabilities ?? [];
  const aiModels = adminState?.aiModels ?? [];
  const infra = adminState?.infrastructure ?? [];
  const cicd = adminState?.cicd ?? [];
  const logs = adminState?.logs ?? [];
  const chains = adminState?.chains ?? [];
  const getSettingFieldState = (key: keyof RuntimeConfig) => {
    const value = runtimeConfig[key];
    const task = TASK_READY_FIELDS[key];
    const hasValue = typeof value === "string" && value.trim().length > 0 && !isPlaceholder(value);

    if (!task && !hasValue) return { tone: "dim", label: "OPTIONAL", task: "Optional config" };
    if (!hasValue && key !== "aiApiKey") return { tone: "needs", label: "INPUT", task: task || "Needs value" };

    if (key === "databaseUrl") {
      return backendMetrics?.databaseMode === "postgres-ready"
        ? { tone: "connected", label: "CONNECTED", task }
        : { tone: "ready", label: "READY", task: "Postgres adapter will connect after valid URL" };
    }

    if (key === "redisUrl") {
      return backendMetrics?.queueMode === "redis-ready"
        ? { tone: "connected", label: "CONNECTED", task }
        : { tone: "ready", label: "READY", task: "Redis queue adapter will connect after valid URL" };
    }

    if (key === "backendApiUrl" || key === "detectorRulesUrl" || key === "observabilityUrl") {
      return backendHealth ? { tone: "connected", label: "LIVE", task } : { tone: "ready", label: "READY", task };
    }

    if (key === "coreBackendUrl") {
      return backendMetrics?.coreBackend?.online
        ? { tone: "connected", label: "LIVE", task: `${task}: ${backendMetrics.coreBackend.counts.auditJobs} jobs` }
        : { tone: "ready", label: "READY", task };
    }

    if (key === "realtimeStreamUrl") {
      return streamStatus === "live"
        ? { tone: "connected", label: "LIVE", task }
        : { tone: "ready", label: "READY", task: "SSE/WebSocket endpoint ready" };
    }

    if (key === "aiApiKey") {
      return hasValue
        ? { tone: "connected", label: "SET", task }
        : { tone: "needs", label: "SECRET", task: "Input production AI key to switch from fallback" };
    }

    if (key === "storageAccessKey" || key === "storageSecretKey" || key === "ipfsApiToken" || key === "authClientSecret" || key === "jwtSecret" || key === "sessionEncryptionKey" || key === "adminBootstrapToken" || key === "ciWebhookSecret" || key === "relayerPrivateKey" || key === "errorTrackingDsn") {
      return hasValue
        ? { tone: "connected", label: "SET", task: task || "Secret configured" }
        : { tone: "needs", label: "SECRET", task: task || "Input secret on server" };
    }

    if (String(key).includes("Prompt")) return { tone: "ai", label: "PROMPT", task };
    if (key.endsWith("RpcUrl")) return { tone: "ready", label: "TESTABLE", task };
    if (task) return { tone: "connected", label: "READY", task };

    return { tone: "ready", label: "READY", task: "Config accepted by runtime" };
  };
  const orderedSettingsGroups = [...SETTINGS_GROUPS].sort((a, b) => {
    if (a.category === b.category) return 0;
    return a.category === "General Config" ? -1 : 1;
  });

  return (
    <div className="ops-app">
      <aside className="ops-sidebar">
        <div className="settings-admin-card">
          <button
            className="settings-admin-trigger"
            type="button"
            onClick={() => setSettingsOpen((current) => !current)}
            aria-expanded={settingsOpen}
          >
            <span className="settings-gear" aria-hidden="true">⚙</span>
            <span className="settings-title">SETTINGS</span>
            <span className="settings-subtitle">Admin Account</span>
          </button>
        </div>

        <div className="sb-status">
          <div className="pulse" />
          {backendHealth ? "ALL SYSTEMS OPERATIONAL" : "BACKEND OFFLINE"}
        </div>

        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-readiness">
              <div>
                <span>BACKEND READINESS</span>
                <b className={readiness?.score === 100 ? "text-ok" : readiness ? "text-warn" : "text-crit"}>
                  {readiness ? `${readiness.score}% ${readiness.status}` : "OFFLINE"}
                </b>
              </div>
              <small>
                Queue: {backendMetrics?.queueMode ?? "offline"} / DB: {backendMetrics?.databaseMode ?? "offline"} / Progress: {backendMetrics?.progressMode ?? streamStatus}
              </small>
            </div>
            {orderedSettingsGroups.map((group, index) => (
              <div className="settings-group" key={group.title}>
                {(index === 0 || orderedSettingsGroups[index - 1].category !== group.category) && (
                  <div className="settings-category">{group.category}</div>
                )}

                <button
                  className={`settings-group-trigger ${openSettingsGroup === group.title ? "active" : ""}`}
                  type="button"
                  onClick={() => setOpenSettingsGroup((current) => current === group.title ? "" : group.title)}
                >
                  <span>›</span>
                  {group.title}
                </button>

                {openSettingsGroup === group.title && (
                  <div className="settings-fields">
                    {group.title === "Prompting" ? (
                      <>
                        <label className="settings-field">
                          <span>Prompt Role</span>
                          <select
                            value={selectedPromptKey}
                            onChange={(event) => setSelectedPromptKey(event.target.value as keyof RuntimeConfig)}
                          >
                            {group.fields.map((field) => (
                              <option key={field.key} value={field.key}>{field.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="settings-field">
                          <span className="settings-field-head">
                            <span>{group.fields.find((field) => field.key === selectedPromptKey)?.label ?? "Prompt"}</span>
                            <b>PROMPT</b>
                          </span>
                          <textarea
                            value={runtimeConfig[selectedPromptKey]}
                            placeholder={group.fields.find((field) => field.key === selectedPromptKey)?.placeholder}
                            onChange={(event) => updateRuntimeConfig(selectedPromptKey, event.target.value)}
                          />
                          <small>{getSettingFieldState(selectedPromptKey).task}</small>
                        </label>
                      </>
                    ) : (
                      group.fields.map((field) => {
                        const state = getSettingFieldState(field.key);
                        return (
                        <label className={`settings-field ${state.tone}`} key={field.key}>
                          <span className="settings-field-head">
                            <span>{field.label}</span>
                            <b>{state.label}</b>
                          </span>
                          <input
                            type={field.secret ? "password" : "text"}
                            value={runtimeConfig[field.key]}
                            placeholder={field.placeholder}
                            onChange={(event) => updateRuntimeConfig(field.key, event.target.value)}
                          />
                          <small>{state.task}</small>
                        </label>
                      );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="settings-actions">
              <button type="button" onClick={() => void saveRuntimeSettings()} disabled={apiTestBusy}>Save</button>
              <button type="button" onClick={() => void runConnectionTests()} disabled={apiTestBusy}>Test APIs</button>
              <button type="button" onClick={resetRuntimeSettings} disabled={apiTestBusy}>Reset</button>
            </div>
            {settingsStatus && <div className="settings-status">{settingsStatus}</div>}
            {apiTestResults.length > 0 && (
              <div className="settings-test-list">
                {apiTestResults.map((result) => (
                  <div className="settings-test-row" key={result.name}>
                    <span className={result.ok ? "text-ok" : "text-crit"}>{result.ok ? "OK" : "FAIL"}</span>
                    <b>{result.name}</b>
                    <small>{result.latencyMs}ms</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sb-section">Core</div>
        <div className="sb-item active">Overview</div>
        <div className="sb-item">Worker Fleet <span className="sb-badge ok">{metrics?.activeWorkers ?? 0} UP</span></div>
        <div className="sb-item">Pipelines <span className="sb-badge warn">{pipeline?.aiScan ?? 0}</span></div>
        <div className="sb-item">Queue Manager</div>

        <div className="sb-section">Audit</div>
        <div className="sb-item">Vuln Detection <span className="sb-badge crit">{metrics?.criticalVulns ?? 0}</span></div>
        <div className="sb-item">Smart Contracts</div>
        <div className="sb-item">Blockchain Nodes</div>
        <div className="sb-item">AI / LLM Engine</div>

        <div className="sb-section">Infrastructure</div>
        <div className="sb-item">Postgres / Redis</div>
        <div className="sb-item">Storage S3/IPFS</div>
        <div className="sb-item">CI/CD Pipelines</div>
        <div className="sb-item">Docker Fleet</div>

        <div className="sb-section">System</div>
        <div className="sb-item">Logs & Alerts</div>
        <div className="sb-item">Security</div>
        <div className="sb-item">Settings</div>

        <div className="sb-footer">
          <div className="sb-uptime">UPDATED <span>{adminState?.updatedAt ? adminState.updatedAt.slice(11, 19) : "--:--:--"}</span></div>
          <div className="sb-uptime sb-build">BUILD <span>v2.14.1-rc3</span></div>
        </div>
      </aside>

      <main className="ops-main">
        <header className="topbar">
          <div className="topbar-title">OPERATIONS</div>
          <div className="topbar-path">/ <span>overview</span> / realtime</div>
          <div className="tb-chips">
            <div className="chip active">Live</div>
            <div className="chip">1H</div>
            <div className="chip">6H</div>
            <div className="chip">24H</div>
          </div>
          <div className="tb-clock">{clock}</div>
        </header>

        <section className="ops-content">
          <div className="kpi-row">
            <Kpi label="Audits / 24h" value={String(metrics?.audits24h ?? 0)} subMain="Realtime" subText="from live telemetry" color="var(--ok)" />
            <Kpi label="Active Workers" value={`${metrics?.activeWorkers ?? 0}/${metrics?.maxWorkers ?? 0}`} subMain="Worker fleet" color="var(--warn)" />
            <Kpi label="Queue Depth" value={String(metrics?.queueDepth ?? 0)} subMain="Redis queues" subText={backendMetrics?.queueMode ?? "offline"} color="var(--warn)" />
            <Kpi label="Vulns Detected" value={String(metrics?.vulnsDetected ?? 0)} subMain={`${metrics?.criticalVulns ?? 0} CRITICAL`} subText="today" color="var(--crit)" />
            <Kpi label="Avg Audit Time" value={`${metrics?.avgAuditTimeSec ?? 0}s`} subMain="Pipeline" subText="throughput" color="var(--info)" />
            <Kpi label="AI Accuracy" value={`${metrics?.aiAccuracy ?? 0}%`} subMain="LLM triage" subText={backendMetrics?.aiAnalysis ?? "offline"} color="var(--ai)" />
          </div>

          <Panel title="Backend Runtime Connection" meta={backendHealth ? "CONNECTED" : "LOCAL API"}>
            <div className="backend-grid">
              <div className="backend-status-card">
                <div className="backend-label">API Status</div>
                <div className={backendHealth ? "backend-value ok" : "backend-value warn"}>{backendHealth ? "ONLINE" : "OFFLINE"}</div>
                <div className="backend-small">{backendHealth?.service ?? `Waiting for ${runtimeConfig.backendApiUrl}`}</div>
                <div className="backend-small">{backendHealth?.mode ?? "Start backend with npm run backend:dev"}</div>
                <div className={`backend-small ${streamStatus === "live" ? "text-ok" : "text-warn"}`}>stream: {streamStatus}</div>
              </div>

              <div className="backend-status-card">
                <div className="backend-label">Audit Runtime Metrics</div>
                <MetricRow label="Total Jobs" value={backendMetrics?.totalJobs ?? 0} />
                <MetricRow label="Core Audits" value={backendMetrics?.coreBackend?.counts.audits ?? 0} />
                <MetricRow label="Core Queue" value={backendMetrics?.coreBackend?.counts.queuedJobs ?? 0} />
                <MetricRow label="Completed" value={backendMetrics?.completedJobs ?? 0} />
                <MetricRow label="Findings" value={backendMetrics?.totalFindings ?? 0} />
              </div>

              <div className="backend-status-card">
                <div className="backend-label">Core Backend</div>
                <div className={backendMetrics?.coreBackend?.online ? "backend-value ok" : "backend-value warn"}>
                  {backendMetrics?.coreBackend?.online ? "CONNECTED" : "OFFLINE"}
                </div>
                <MetricRow label="Audit Jobs" value={backendMetrics?.coreBackend?.counts.auditJobs ?? 0} />
                <MetricRow label="Payments" value={backendMetrics?.coreBackend?.counts.payments ?? 0} />
                <div className="backend-small">{backendMetrics?.coreBackend?.baseUrl ?? runtimeConfig.coreBackendUrl}</div>
                <div className="backend-small">
                  latest: {backendMetrics?.coreBackend?.latest.job?.status ?? backendMetrics?.coreBackend?.latest.audit?.status ?? "none"}
                </div>
              </div>

              <div className="backend-status-card">
                <div className="backend-label">Actions</div>
                <div className="backend-actions">
                  <button className="backend-btn" onClick={() => void refreshBackendState()} disabled={backendBusy}>Refresh</button>
                  <button className="backend-btn" onClick={() => void createDummyAuditJob()} disabled={backendBusy}>Create Job</button>
                  <button className="backend-btn warn" onClick={() => void processLatestAuditJob()} disabled={backendBusy}>Process Latest</button>
                  <button className="backend-btn" onClick={() => void triggerDemoTick()} disabled={backendBusy}>Manual Tick</button>
                </div>
                {backendBusy && <div className="backend-small">Working...</div>}
                {backendError && <div className="backend-error">{backendError}</div>}
              </div>

              <div className="backend-status-card">
                <div className="backend-label">Latest Jobs</div>
                <div className="backend-job-list">
                  {backendJobs.length === 0 ? (
                    <div className="backend-small">No audit job yet.</div>
                  ) : (
                    backendJobs.slice(0, 4).map((job) => (
                      <div className="backend-job" key={job.id}>
                        <span>{job.target}</span>
                        <b className={job.status === "completed" ? "text-ok" : "text-warn"}>{job.status}</b>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="backend-feature-row">
              {backendFeatures.slice(0, 7).map((feature) => (
                <span className="backend-feature" key={feature.key}>{feature.key}: {feature.status}</span>
              ))}
            </div>
          </Panel>

          <Panel title="Audit Pipeline - Real-Time Throughput" meta="LIVE">
            <div className="pipeline">
              <PipelineStage name="Ingest" count={pipeline?.ingest ?? 0} sub="WebSocket + REST" color="var(--info)" />
              <PipelineStage name="Parse / Decode" count={pipeline?.parse ?? 0} sub="Rust worker pool" color="var(--ok)" />
              <PipelineStage name="Static Analysis" count={pipeline?.staticAnalysis ?? 0} sub="AST + CFG engines" color="var(--ok)" />
              <PipelineStage name="AI / LLM Scan" count={pipeline?.aiScan ?? 0} sub="GPT + Claude" color="var(--ai)" />
              <PipelineStage name="Vuln Scoring" count={pipeline?.vulnScoring ?? 0} sub="CVSS + custom" color="var(--ok)" />
              <PipelineStage name="Report / Store" count={pipeline?.reportStore ?? 0} sub="S3 + IPFS + PG" color="var(--ok)" />
            </div>
          </Panel>

          <div className="row2 col-6-4">
            <Panel title="Distributed Worker Fleet" meta="Rust Axum - async workers" noPadding>
              <table className="worker-table">
                <thead>
                  <tr>
                    <th>Worker ID</th><th>Stack</th><th>Chain</th><th>Status</th><th>Tasks/min</th><th>CPU</th><th>Mem</th><th>Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id}>
                      <td><span className="worker-id">{worker.id}</span></td>
                      <td><span className={`stack-badge ${worker.stack}`}>{worker.stack.toUpperCase()}</span></td>
                      <td><span className="chain-tag"><span className="chain-dot" style={{ background: chainColor(worker.chain) }} />{worker.chain}</span></td>
                      <td><span className={`status-pill ${worker.status}`}>{worker.status.toUpperCase()}</span></td>
                      <td className={worker.status === "error" ? "text-crit" : ""}>{worker.tpm || "-"}</td>
                      <td><MiniMeter value={worker.cpu} /></td>
                      <td>{worker.mem ? `${worker.mem}MB` : "-"}</td>
                      <td>{worker.up}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Queue Status" meta="Redis - 6 queues">
              <div className="queue-list">
                {queues.map((queue) => (
                  <div className="q-item" key={queue.name}>
                    <div className="q-header">
                      <span className="q-name">{queue.name}</span>
                      <span className="q-stats" style={{ color: toneVar(queue.tone) }}>
                        {queue.depth} <span>/ {queue.cap} - {queue.proc}/min</span>
                      </span>
                    </div>
                    <div className="q-bar-bg">
                      <div className="q-bar" style={{ width: `${Math.round((queue.depth / queue.cap) * 100)}%`, background: toneVar(queue.tone) }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="row2 col-6-4">
            <Panel title="Active Vulnerability Detections" meta="Live findings from processed jobs" noPadding>
              <table className="vuln-table">
                <thead>
                  <tr>
                    <th>Severity</th><th>Type</th><th>Contract</th><th>Chain</th><th>Detected By</th><th>Time</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vulnerabilities.map((item) => (
                    <VulnRow key={`${item.contract}-${item.type}`} item={item} />
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="AI / LLM Engine Status" meta={`${aiModels.length} models active`}>
              <div className="ai-models">
                {aiModels.map((model) => (
                  <AiModel key={model.label} model={model} />
                ))}
              </div>

              <div className="token-usage">
                <div className="mini-title">Token Usage 24h</div>
                <div className="token-grid">
                  <MetricBox value={`${Math.round((metrics?.audits24h ?? 0) * 2.2)}K`} label="Input tokens" tone="ai" />
                  <MetricBox value={`${Math.round((metrics?.audits24h ?? 0) * 0.48)}K`} label="Output tokens" tone="info" />
                  <MetricBox value={`$${((metrics?.audits24h ?? 0) * 0.017).toFixed(2)}`} label="Cost today" tone="ok" />
                </div>
              </div>
            </Panel>
          </div>

          <div className="row2 col-4-4-4">
            <Panel title="Infrastructure Nodes" meta="Docker stats / live containers">
              <div className="infra-grid">
                {infra.map((node) => (
                  <div className="infra-node" key={node.name}>
                    <div className="infra-name">
                      <span className="infra-icon">{node.icon}</span>
                      <span className={node.status === "warn" ? "text-warn" : ""}>{node.name}</span>
                      <span className={`infra-status ${node.status}`} />
                    </div>
                    <InfraMetric label="CPU" value={node.cpu} warnAt={60} />
                    <InfraMetric label="MEM" value={node.mem} warnAt={70} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="CI/CD Pipeline" meta="GitHub Actions">
              <div className="cicd-list">
                {cicd.map((item) => (
                  <CiItem key={`${item.branch}-${item.time}`} item={item} />
                ))}
              </div>
            </Panel>

            <Panel title="System Log Stream" meta="Live tail">
              <div className="log-stream">
                {logs.map((line, index) => (
                  <div className="log-line" key={`${line.ts}-${index}`}>
                    <span className="log-ts">{line.ts}</span>
                    <span className={`log-lvl ${line.lvl}`}>[{line.lvl.toUpperCase()}]</span>
                    <span className="log-msg">{line.msg}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Blockchain Node Connectivity" meta={`${chains.length} ecosystems monitored`}>
            <div className="chain-nodes">
              {chains.map((chain) => (
                <div className={`chain-card ${chain.status}`} key={chain.sym} style={{ borderColor: chain.status === "warn" ? "rgba(245,166,35,.25)" : "var(--border)" }}>
                  <div className="chain-head">
                    <span className="chain-big-dot" style={{ background: chain.color, boxShadow: `0 0 8px ${chain.color}` }} />
                    <span className="chain-symbol">{chain.sym}</span>
                    <span className="chain-name">{chain.name}</span>
                    <span className={`chain-state ${chain.status}`}>{chain.status === "warn" ? "DEGRADED" : "LIVE"}</span>
                  </div>
                  <div className="chain-grid">
                    <span>Block</span><b>#{chain.block.toLocaleString()}</b>
                    <span>Latency</span><b className={chain.status === "warn" ? "text-warn" : "text-ok"}>{chain.latency}</b>
                    <span>Sync</span><b className="text-ok">{chain.sync}</b>
                    <span>Peers</span><b>{chain.peers}</b>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value, subMain, subText, color }: { label: string; value: string; subMain: string; subText?: string; color: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub"><span style={{ color }}>{subMain}</span> {subText && <span>{subText}</span>}</div>
      <div className="kpi-accent" style={{ background: color }} />
    </div>
  );
}

function Panel({ title, meta, children, noPadding = false }: { title: string; meta: string; children: ReactNode; noPadding?: boolean }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        <div className="panel-meta">{meta}</div>
      </div>
      <div className={noPadding ? "panel-body no-padding" : "panel-body"}>{children}</div>
    </div>
  );
}

function PipelineStage({ name, count, sub, color }: { name: string; count: number; sub: string; color: string }) {
  return (
    <div className="pipe-stage">
      <div className="pipe-stage-name">{name}</div>
      <div className="pipe-stage-count" style={{ color }}>{count}</div>
      <div className="pipe-stage-sub"><span className="pipe-dot" style={{ background: color }} />{sub}</div>
    </div>
  );
}

function MiniMeter({ value }: { value: number }) {
  const color = value > 70 ? "var(--crit)" : value > 50 ? "var(--warn)" : "var(--ok)";

  return (
    <div className="mini-meter-wrap">
      <div className="mini-meter"><div style={{ width: `${value}%`, background: color }} /></div>
      <span style={{ color }}>{value}%</span>
    </div>
  );
}

function VulnRow({ item }: { item: Vulnerability }) {
  return (
    <tr>
      <td><span className={`sev ${item.severity}`}>{item.severity.toUpperCase()}</span></td>
      <td>{item.type}</td>
      <td className="text-info">{item.contract}</td>
      <td><span className="chain-tag"><span className="chain-dot" style={{ background: chainColor(item.chain) }} />{item.chain}</span></td>
      <td className={item.by.includes("AI") || item.by.includes("LLM") ? "text-ai" : ""}>{item.by}</td>
      <td>{item.time}</td>
      <td><span className={`status-pill ${item.status === "Open" ? "error" : item.status === "Review" ? "busy" : "running"}`}>{item.status}</span></td>
    </tr>
  );
}

function AiModel({ model }: { model: AiModelData }) {
  return (
    <div className="ai-model-item">
      <div className={`ai-icon ${model.tone}`}>AI</div>
      <div>
        <div className="ai-name">{model.label}</div>
        <div className="ai-provider">{model.provider}</div>
      </div>
      <div className="ai-stats">
        <div className={`ai-latency text-${model.tone}`}>{model.latency}</div>
        <div className="ai-req">{model.req}</div>
        <div className={`ai-health ${model.tone}`}>{model.health}</div>
      </div>
    </div>
  );
}

function MetricBox({ value, label, tone }: { value: string; label: string; tone: "ai" | "info" | "ok" }) {
  return (
    <div className="metric-box">
      <div className={`metric-value text-${tone}`}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function InfraMetric({ label, value, warnAt }: { label: string; value: number; warnAt: number }) {
  const warn = value > warnAt;

  return (
    <>
      <div className="infra-metric"><span>{label}</span><span className={warn ? "text-warn" : ""}>{value}%</span></div>
      <div className="micro-bar-bg"><div className="micro-bar" style={{ width: `${value}%`, background: warn ? "var(--warn)" : "var(--info)" }} /></div>
    </>
  );
}

function CiItem({ item }: { item: CiItemData }) {
  return (
    <div className="cicd-item">
      <div>
        <div className="cicd-branch">{item.branch}</div>
        <div className="cicd-commit">{item.commit}</div>
      </div>
      <div className="cicd-time">{item.time}</div>
      <div className={`cicd-dur ${item.status}`}>{item.status === "ok" ? "OK" : item.status === "warn" ? "WARN" : "FAIL"} {item.dur}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="backend-metrics-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

