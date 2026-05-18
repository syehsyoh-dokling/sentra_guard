import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_BACKEND_PORT || 8799);
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, init) {
  const adminToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function waitForBackend() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await fetchJson("/health");
      if (health.status === "ok") return;
    } catch {
      await wait(250);
    }
  }

  throw new Error("Backend did not become healthy in time");
}

async function run() {
  const child = spawn(process.execPath, ["backend/server.mjs"], {
    env: {
      ...process.env,
      BACKEND_PORT: String(port),
      BACKEND_API_URL: baseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  try {
    await waitForBackend();

    const dependencies = await fetchJson("/health/dependencies");
    if (!Array.isArray(dependencies.checks)) {
      throw new Error("Dependency health response did not include checks");
    }

    const configResponse = await fetchJson("/config/runtime", {
      method: "POST",
      body: JSON.stringify({
        backendApiUrl: baseUrl,
        solanaRpcUrl: "https://api.devnet.solana.com",
        ethereumRpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        queueConcurrency: "4"
      })
    });

    if (!configResponse.accepted.includes("backendApiUrl")) {
      throw new Error("Runtime config update did not accept backendApiUrl");
    }

    const jobResponse = await fetchJson("/audit/jobs", {
      method: "POST",
      body: JSON.stringify({
        chain: "ethereum",
        target: "SmokeVault",
        sourceType: "solidity",
        priority: "high"
      })
    });

    const jobId = jobResponse.job?.id;
    if (!jobId) throw new Error("Audit job id was not returned");

    const processResponse = await fetchJson(`/audit/jobs/${jobId}/process`, { method: "POST" });
    if (!Array.isArray(processResponse.result?.findings)) {
      throw new Error("Processed audit job did not include findings");
    }

    const metrics = await fetchJson("/audit/metrics");
    if (metrics.totalJobs < 1 || metrics.completedJobs < 1) {
      throw new Error("Audit metrics did not update after processing");
    }

    const progress = await fetchJson(`/audit/jobs/${jobId}/progress`);
    if (!Array.isArray(progress.events) || !progress.events.some((event) => event.stage === "completed")) {
      throw new Error("Audit progress did not include completed stage");
    }

    const uploadResponse = await fetchJson("/audit/contracts/upload", {
      method: "POST",
      body: JSON.stringify({
        filename: "UploadedSmokeVault.sol",
        chain: "ethereum",
        sourceCode: "pragma solidity ^0.8.20; contract UploadedSmokeVault { address public owner; function setOwner(address next) external { owner = next; } }"
      })
    });
    if (!uploadResponse.job?.id || !uploadResponse.websocketUrl) {
      throw new Error("Contract upload did not return queued job and websocket url");
    }

    const apiTests = await fetchJson("/config/test", {
      method: "POST",
      body: JSON.stringify({ scope: "backend-health" })
    });
    if (apiTests.summary.failed !== 0) {
      throw new Error("Backend health API smoke test failed");
    }

    const readiness = await fetchJson("/readiness");
    if (typeof readiness.score !== "number") {
      throw new Error("Readiness endpoint did not return a score");
    }

    const openapi = await fetchJson("/openapi.json");
    if (openapi.openapi !== "3.1.0") {
      throw new Error("OpenAPI contract was not returned");
    }

    console.log("Backend smoke test passed");
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    if (!child.killed) child.kill();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
