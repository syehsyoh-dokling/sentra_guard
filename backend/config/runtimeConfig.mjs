function cleanSecret(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("SET_IN_")) return "";
  if (/replace[-_ ]?with/i.test(text)) return "";
  return text;
}

export const runtimeConfig = {
  serviceName: process.env.SERVICE_NAME || "sentracore-audit-backend",
  environment: process.env.NODE_ENV || "development",
  publicAppUrl: process.env.PUBLIC_APP_URL || "http://127.0.0.1:5173",
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:8787",
  coreBackendUrl: process.env.CORE_BACKEND_URL || "http://127.0.0.1:4000",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  postgresUrl: process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/blockchain_audit",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",

  aiProvider: process.env.AI_PROVIDER || "gemini",
  geminiApiKey: cleanSecret(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiApiBase: process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta",
  aiOrgId: process.env.AI_ORG_ID || "",

  authClientSecret: cleanSecret(process.env.AUTH_CLIENT_SECRET),
  jwtSecret: cleanSecret(process.env.JWT_SECRET),
  sessionEncryptionKey: cleanSecret(process.env.SESSION_ENCRYPTION_KEY),
  adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN || "",

  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  bnbRpcUrl: process.env.BNB_RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org",
  polygonRpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-amoy.drpc.org",
  relayerPrivateKey: cleanSecret(process.env.RELAYER_PRIVATE_KEY),
  detectorRulesUrl: process.env.DETECTOR_RULES_URL || "",

  authIssuerUrl: process.env.AUTH_ISSUER_URL || "https://accounts.google.com",
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/",
  ipfsApiToken: cleanSecret(process.env.IPFS_API_TOKEN),
  dockerRegistryUrl: process.env.DOCKER_REGISTRY_URL || "https://registry-1.docker.io/v2/",
  gitRepositoryUrl: process.env.GIT_REPOSITORY_URL || "https://github.com/syehsyoh-dokling/blockchain",
  storageBucketUrl: process.env.STORAGE_BUCKET_URL || "s3://danandad-audit-reports/staging",
  storageAccessKey: cleanSecret(process.env.STORAGE_ACCESS_KEY),
  storageSecretKey: cleanSecret(process.env.STORAGE_SECRET_KEY),
  realtimeStreamUrl: process.env.REALTIME_STREAM_URL || "",
  observabilityUrl: process.env.OBSERVABILITY_URL || "",
  errorTrackingDsn: cleanSecret(process.env.ERROR_TRACKING_DSN),
  ciWebhookUrl: process.env.CI_WEBHOOK_URL || "",
  ciWebhookSecret: cleanSecret(process.env.CI_WEBHOOK_SECRET),

  queueConcurrency: Number(process.env.QUEUE_CONCURRENCY || 4),
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 365),
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 60),

  hardRulesPrompt: process.env.HARD_RULES_PROMPT || "Reject unverifiable claims, require evidence from static detectors, and never mark a finding closed without a reproducible reason.",
  triagePrompt: process.env.TRIAGE_PROMPT || "Classify findings by exploitability, affected funds, user impact, and chain-specific risk.",
  workerRoutingPrompt: process.env.WORKER_ROUTING_PROMPT || "Route Solidity/EVM, Solana BPF, and infrastructure issues to the most reliable detector and reviewer lane.",
  reportPrompt: process.env.REPORT_PROMPT || "Write concise audit reports with executive summary, confirmed findings, reproduction steps, and remediation guidance.",
  remediationPrompt: process.env.REMEDIATION_PROMPT || "Suggest minimal secure patches and regression tests. Prefer established library patterns over custom security code."
};

const editableKeyMap = {
  publicAppUrl: "publicAppUrl",
  backendApiUrl: "backendApiUrl",
  coreBackendUrl: "coreBackendUrl",
  allowedOrigins: "allowedOrigins",
  authIssuerUrl: "authIssuerUrl",
  authClientSecret: "authClientSecret",
  jwtSecret: "jwtSecret",
  sessionEncryptionKey: "sessionEncryptionKey",
  adminBootstrapToken: "adminBootstrapToken",
  aiProviderUrl: "geminiApiBase",
  aiApiKey: "geminiApiKey",
  aiOrgId: "aiOrgId",
  databaseUrl: "postgresUrl",
  redisUrl: "redisUrl",
  ethereumRpcUrl: "ethereumRpcUrl",
  solanaRpcUrl: "solanaRpcUrl",
  bnbRpcUrl: "bnbRpcUrl",
  polygonRpcUrl: "polygonRpcUrl",
  relayerPrivateKey: "relayerPrivateKey",
  detectorRulesUrl: "detectorRulesUrl",
  storageBucketUrl: "storageBucketUrl",
  storageAccessKey: "storageAccessKey",
  storageSecretKey: "storageSecretKey",
  ipfsGatewayUrl: "ipfsGatewayUrl",
  ipfsApiToken: "ipfsApiToken",
  realtimeStreamUrl: "realtimeStreamUrl",
  observabilityUrl: "observabilityUrl",
  errorTrackingDsn: "errorTrackingDsn",
  ciWebhookUrl: "ciWebhookUrl",
  ciWebhookSecret: "ciWebhookSecret",
  gitRepositoryUrl: "gitRepositoryUrl",
  dockerRegistryUrl: "dockerRegistryUrl",
  rateLimitPerMinute: "rateLimitPerMinute",
  auditRetentionDays: "auditRetentionDays",
  queueConcurrency: "queueConcurrency",
  hardRulesPrompt: "hardRulesPrompt",
  triagePrompt: "triagePrompt",
  workerRoutingPrompt: "workerRoutingPrompt",
  reportPrompt: "reportPrompt",
  remediationPrompt: "remediationPrompt"
};

const secretKeys = new Set([
  "authClientSecret",
  "jwtSecret",
  "sessionEncryptionKey",
  "adminBootstrapToken",
  "aiApiKey",
  "databaseUrl",
  "redisUrl",
  "relayerPrivateKey",
  "storageAccessKey",
  "storageSecretKey",
  "ipfsApiToken",
  "errorTrackingDsn",
  "ciWebhookSecret"
]);

const numericKeys = new Set(["rateLimitPerMinute", "auditRetentionDays", "queueConcurrency"]);

function normalizeConfigValue(key, value) {
  if (numericKeys.has(key)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 1) {
      throw new Error(`${key} must be a positive number`);
    }
    return numeric;
  }

  if (key === "allowedOrigins") {
    return String(value)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return String(value ?? "").trim();
}

function looksLikePlaceholder(value) {
  return typeof value === "string" && (value.startsWith("SET_IN_") || /replace[-_ ]?with/i.test(value));
}

function maskSecretValue(value) {
  if (!value || looksLikePlaceholder(value)) return "";
  return "********";
}

export function applyRuntimeConfigPatch(patch = {}) {
  const accepted = [];
  const skipped = [];

  for (const [key, value] of Object.entries(patch)) {
    const runtimeKey = editableKeyMap[key];

    if (!runtimeKey) {
      skipped.push(key);
      continue;
    }

    if (value === undefined || value === null || String(value).trim() === "") {
      skipped.push(key);
      continue;
    }

    const normalized = normalizeConfigValue(key, value);
    if (secretKeys.has(key) && looksLikePlaceholder(normalized)) {
      skipped.push(key);
      continue;
    }

    runtimeConfig[runtimeKey] = normalized;
    accepted.push(key);
  }

  return {
    accepted,
    skipped,
    config: getSafeRuntimeConfig(),
    editable: getEditableRuntimeConfig()
  };
}

export function getEditableRuntimeConfig() {
  return {
    publicAppUrl: runtimeConfig.publicAppUrl,
    backendApiUrl: runtimeConfig.backendApiUrl,
    coreBackendUrl: runtimeConfig.coreBackendUrl,
    allowedOrigins: Array.isArray(runtimeConfig.allowedOrigins) ? runtimeConfig.allowedOrigins.join(",") : runtimeConfig.allowedOrigins,
    authIssuerUrl: runtimeConfig.authIssuerUrl,
    authClientSecret: maskSecretValue(runtimeConfig.authClientSecret),
    jwtSecret: maskSecretValue(runtimeConfig.jwtSecret),
    sessionEncryptionKey: maskSecretValue(runtimeConfig.sessionEncryptionKey),
    adminBootstrapToken: maskSecretValue(runtimeConfig.adminBootstrapToken),
    aiProviderUrl: runtimeConfig.geminiApiBase,
    aiApiKey: maskSecretValue(runtimeConfig.geminiApiKey),
    aiOrgId: runtimeConfig.aiOrgId || "",
    databaseUrl: maskSecretValue(runtimeConfig.postgresUrl),
    redisUrl: maskSecretValue(runtimeConfig.redisUrl),
    ethereumRpcUrl: runtimeConfig.ethereumRpcUrl,
    solanaRpcUrl: runtimeConfig.solanaRpcUrl,
    bnbRpcUrl: runtimeConfig.bnbRpcUrl,
    polygonRpcUrl: runtimeConfig.polygonRpcUrl,
    relayerPrivateKey: maskSecretValue(runtimeConfig.relayerPrivateKey),
    detectorRulesUrl: runtimeConfig.detectorRulesUrl || `${runtimeConfig.backendApiUrl}/security/detector-rules`,
    storageBucketUrl: runtimeConfig.storageBucketUrl,
    storageAccessKey: maskSecretValue(runtimeConfig.storageAccessKey),
    storageSecretKey: maskSecretValue(runtimeConfig.storageSecretKey),
    ipfsGatewayUrl: runtimeConfig.ipfsGatewayUrl,
    ipfsApiToken: maskSecretValue(runtimeConfig.ipfsApiToken),
    realtimeStreamUrl: runtimeConfig.realtimeStreamUrl || `${runtimeConfig.backendApiUrl}/admin/realtime-stream`,
    observabilityUrl: runtimeConfig.observabilityUrl || `${runtimeConfig.backendApiUrl}/health`,
    errorTrackingDsn: maskSecretValue(runtimeConfig.errorTrackingDsn),
    ciWebhookUrl: runtimeConfig.ciWebhookUrl || runtimeConfig.gitRepositoryUrl,
    ciWebhookSecret: maskSecretValue(runtimeConfig.ciWebhookSecret),
    gitRepositoryUrl: runtimeConfig.gitRepositoryUrl,
    dockerRegistryUrl: runtimeConfig.dockerRegistryUrl,
    rateLimitPerMinute: String(runtimeConfig.rateLimitPerMinute),
    auditRetentionDays: String(runtimeConfig.auditRetentionDays),
    queueConcurrency: String(runtimeConfig.queueConcurrency),
    hardRulesPrompt: runtimeConfig.hardRulesPrompt || "",
    triagePrompt: runtimeConfig.triagePrompt || "",
    workerRoutingPrompt: runtimeConfig.workerRoutingPrompt || "",
    reportPrompt: runtimeConfig.reportPrompt || "",
    remediationPrompt: runtimeConfig.remediationPrompt || ""
  };
}

export function getSafeRuntimeConfig() {
  return {
    serviceName: runtimeConfig.serviceName,
    environment: runtimeConfig.environment,
    publicAppUrl: runtimeConfig.publicAppUrl,
    backendApiUrl: runtimeConfig.backendApiUrl,
    coreBackendUrl: runtimeConfig.coreBackendUrl,
    allowedOrigins: runtimeConfig.allowedOrigins,
    aiProvider: runtimeConfig.aiProvider,
    geminiModel: runtimeConfig.geminiModel,
    geminiApiBase: runtimeConfig.geminiApiBase,
    geminiConfigured: Boolean(runtimeConfig.geminiApiKey),
    postgresConfigured: Boolean(runtimeConfig.postgresUrl),
    redisConfigured: Boolean(runtimeConfig.redisUrl),
    ethereumRpcUrl: runtimeConfig.ethereumRpcUrl,
    solanaRpcUrl: runtimeConfig.solanaRpcUrl,
    bnbRpcUrl: runtimeConfig.bnbRpcUrl,
    polygonRpcUrl: runtimeConfig.polygonRpcUrl,
    authIssuerUrl: runtimeConfig.authIssuerUrl,
    ipfsGatewayUrl: runtimeConfig.ipfsGatewayUrl,
    dockerRegistryUrl: runtimeConfig.dockerRegistryUrl,
    gitRepositoryUrl: runtimeConfig.gitRepositoryUrl,
    storageBucketUrl: runtimeConfig.storageBucketUrl,
    queueConcurrency: runtimeConfig.queueConcurrency,
    auditRetentionDays: runtimeConfig.auditRetentionDays,
    rateLimitPerMinute: runtimeConfig.rateLimitPerMinute,
    secretsConfigured: {
      authClientSecret: Boolean(runtimeConfig.authClientSecret),
      jwtSecret: Boolean(runtimeConfig.jwtSecret),
      sessionEncryptionKey: Boolean(runtimeConfig.sessionEncryptionKey),
      adminBootstrapToken: Boolean(runtimeConfig.adminBootstrapToken),
      aiApiKey: Boolean(runtimeConfig.geminiApiKey),
      databaseUrl: Boolean(runtimeConfig.postgresUrl),
      redisUrl: Boolean(runtimeConfig.redisUrl),
      relayerPrivateKey: Boolean(runtimeConfig.relayerPrivateKey),
      storageAccessKey: Boolean(runtimeConfig.storageAccessKey),
      storageSecretKey: Boolean(runtimeConfig.storageSecretKey),
      ipfsApiToken: Boolean(runtimeConfig.ipfsApiToken),
      errorTrackingDsn: Boolean(runtimeConfig.errorTrackingDsn),
      ciWebhookSecret: Boolean(runtimeConfig.ciWebhookSecret)
    }
  };
}
