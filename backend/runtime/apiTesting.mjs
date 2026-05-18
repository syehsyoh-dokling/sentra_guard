import { runtimeConfig } from "../config/runtimeConfig.mjs";

async function timed(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return {
      name,
      ok: true,
      latencyMs: Date.now() - started,
      detail
    };
  } catch (error) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Unknown test error"
    };
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Sentracore-Backend-Api-Test" }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function getAny(url, accepted = [200]) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Sentracore-Backend-Api-Test" }
  });

  if (!accepted.includes(response.status)) {
    throw new Error(`HTTP ${response.status}`);
  }

  return `HTTP ${response.status}`;
}

async function testEvm(url) {
  const data = await postJson(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_blockNumber",
    params: []
  });

  if (!data.result) throw new Error("Missing block number result");
  return data.result;
}

export async function runApiTests(filter = "all") {
  const tests = [
    ["backend-health", () => getJson(`${runtimeConfig.backendApiUrl}/health`).then((data) => data.status)],
    ["detector-rules", () => getJson(`${runtimeConfig.backendApiUrl}/security/detector-rules`).then((data) => `${data.rules.length} rules`)],
    ["realtime-state", () => getJson(`${runtimeConfig.backendApiUrl}/admin/realtime-state`).then((data) => `audits24h=${data.metrics.audits24h}`)],
    ["solana-devnet", async () => {
      const data = await postJson(runtimeConfig.solanaRpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth"
      });
      return data.result;
    }],
    ["ethereum-sepolia", () => testEvm(runtimeConfig.ethereumRpcUrl)],
    ["bnb-testnet", () => testEvm(runtimeConfig.bnbRpcUrl)],
    ["polygon-amoy", () => testEvm(runtimeConfig.polygonRpcUrl)],
    ["network-activity", () => getJson(`${runtimeConfig.backendApiUrl}/api/v1/network/activity?refresh=true`).then((data) => `${data.summary.onlineChains}/${data.summary.configuredChains} chains online`)],
    ["network-gas", () => getJson(`${runtimeConfig.backendApiUrl}/api/v1/network/gas`).then((data) => `${data.gas.length} gas feeds`)],
    ["oidc-discovery", () => getJson(`${runtimeConfig.authIssuerUrl}/.well-known/openid-configuration`).then((data) => data.issuer)],
    ["ipfs-gateway", () => getAny(`${runtimeConfig.ipfsGatewayUrl}bafybeicn7i3soqdgr7dwnrwytgq4zxy7a5jpkizrvhm5mv6bgjd32wm3q4`)],
    ["docker-registry", () => getAny(runtimeConfig.dockerRegistryUrl, [200, 401])]
  ];

  const selected = filter === "all" ? tests : tests.filter(([name]) => name === filter);
  const results = [];

  for (const [name, fn] of selected) {
    results.push(await timed(name, fn));
  }

  return {
    testedAt: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length
    }
  };
}
