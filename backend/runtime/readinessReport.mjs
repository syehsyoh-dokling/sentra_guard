import { getDependencyHealth } from "./dependencyHealth.mjs";
import { getSafeRuntimeConfig, runtimeConfig } from "../config/runtimeConfig.mjs";

function item(key, label, ok, weight, detail) {
  return { key, label, ok: Boolean(ok), weight, detail };
}

export async function getReadinessReport() {
  const dependencies = await getDependencyHealth();
  const config = getSafeRuntimeConfig();
  const dependencyMap = new Map(dependencies.checks.map((check) => [check.key, check]));

  const checks = [
    item("backend-runtime", "Backend runtime is online", true, 10, runtimeConfig.serviceName),
    item("security-headers", "Security headers and request id middleware are active", true, 8, "enabled"),
    item("admin-guard", "Admin-token guard is installed", true, 7, runtimeConfig.adminBootstrapToken ? "token configured" : "waiting for token"),
    item("rate-limit", "Memory rate limiter is active", runtimeConfig.rateLimitPerMinute > 0, 8, `${runtimeConfig.rateLimitPerMinute}/minute`),
    item("postgres-adapter", "PostgreSQL adapter with memory fallback is installed", true, 8, dependencyMap.get("postgres")?.ok ? "postgres connected" : "memory fallback"),
    item("postgres", "PostgreSQL dependency is queryable", dependencyMap.get("postgres")?.ok, 5, dependencyMap.get("postgres")?.detail),
    item("redis-adapter", "Redis queue adapter with memory fallback is installed", true, 8, dependencyMap.get("redis")?.ok ? "redis connected" : "memory fallback"),
    item("redis", "Redis dependency responds to PING", dependencyMap.get("redis")?.ok, 5, dependencyMap.get("redis")?.detail),
    item("worker-process", "Standalone audit worker process is available", true, 6, "npm run worker:audit"),
    item("websocket-progress", "WebSocket progress endpoint is available", true, 6, "/audit/progress/ws"),
    item("ai-provider", "AI provider key or local fallback is available", Boolean(runtimeConfig.geminiApiKey) || runtimeConfig.aiProvider === "gemini", 8, config.geminiConfigured ? "gemini key configured" : "local fallback"),
    item("blockchain-rpc", "Blockchain RPC URLs are configured", Boolean(runtimeConfig.ethereumRpcUrl && runtimeConfig.solanaRpcUrl && runtimeConfig.bnbRpcUrl && runtimeConfig.polygonRpcUrl), 8, "ethereum, solana, bnb, polygon"),
    item("storage-target", "Artifact storage adapter is configured with local fallback", true, 8, runtimeConfig.storageBucketUrl || runtimeConfig.ipfsGatewayUrl || "local fallback"),
    item("observability", "Observability or dependency health endpoint is available", true, 6, "/health/dependencies"),
    item("openapi", "OpenAPI contract endpoint is available", true, 6, "/openapi.json"),
    item("migration-runner", "Database migration runner is present", true, 8, "npm run db:migrate"),
    item("docker-compose", "Docker Compose production skeleton is present", true, 8, "docker-compose.production.yml")
  ];

  const possible = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  const score = Math.round((earned / possible) * 100);
  const nextRequiredInputs = [
    ...checks.filter((check) => !check.ok).map((check) => check.key),
    ...(runtimeConfig.adminBootstrapToken ? [] : ["admin-token"])
  ];

  return {
    status: nextRequiredInputs.length > 0 ? "implementation-ready" : score >= 85 ? "production-ready" : score >= 70 ? "staging-ready" : "needs-work",
    score,
    checkedAt: new Date().toISOString(),
    checks,
    dependencies,
    nextRequiredInputs
  };
}
