import { runtimeConfig } from "../config/runtimeConfig.mjs";
import { listNetworkSnapshots, saveNetworkSnapshot } from "../db/postgresAdapter.mjs";

const POLL_INTERVAL_MS = 10_000;
const RPC_TIMEOUT_MS = 3500;
const snapshots = new Map();
let monitorTimer = null;
let polling = false;

function monitoredChains() {
  return [
    {
      chain: "ethereum",
      network: "sepolia",
      rpcUrl: runtimeConfig.ethereumRpcUrl,
      kind: "evm",
      symbol: "ETH"
    },
    {
      chain: "polygon",
      network: "amoy",
      rpcUrl: runtimeConfig.polygonRpcUrl,
      kind: "evm",
      symbol: "MATIC"
    },
    {
      chain: "bnb",
      network: "testnet",
      rpcUrl: runtimeConfig.bnbRpcUrl,
      kind: "evm",
      symbol: "BNB"
    },
    {
      chain: "solana",
      network: "devnet",
      rpcUrl: runtimeConfig.solanaRpcUrl,
      kind: "solana",
      symbol: "SOL"
    }
  ].filter((item) => item.rpcUrl);
}

async function postRpc(rpcUrl, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Sentracore-App2-Network-Indexer"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "RPC error");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function hexToNumber(value) {
  if (!value) return 0;
  return Number.parseInt(value, 16);
}

async function fetchEvmSnapshot(config) {
  const startedAt = Date.now();
  const [blockNumberResponse, gasResponse] = await Promise.all([
    postRpc(config.rpcUrl, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    postRpc(config.rpcUrl, { jsonrpc: "2.0", id: 2, method: "eth_gasPrice", params: [] })
  ]);
  const blockNumber = hexToNumber(blockNumberResponse.result);
  const blockResponse = await postRpc(config.rpcUrl, {
    jsonrpc: "2.0",
    id: 3,
    method: "eth_getBlockByNumber",
    params: [blockNumberResponse.result, false]
  });

  return {
    ...config,
    blockNumber,
    blockHash: blockResponse.result?.hash || "",
    gasPriceWei: String(hexToNumber(gasResponse.result)),
    latencyMs: Date.now() - startedAt,
    status: "ok",
    observedAt: new Date().toISOString(),
    raw: {
      blockNumber: blockNumberResponse.result,
      gasPrice: gasResponse.result,
      blockHash: blockResponse.result?.hash
    }
  };
}

async function fetchSolanaSnapshot(config) {
  const startedAt = Date.now();
  const [slotResponse, blockHeightResponse] = await Promise.all([
    postRpc(config.rpcUrl, { jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
    postRpc(config.rpcUrl, { jsonrpc: "2.0", id: 2, method: "getBlockHeight", params: [] })
  ]);

  return {
    ...config,
    blockNumber: Number(blockHeightResponse.result || slotResponse.result || 0),
    blockHash: `slot:${slotResponse.result}`,
    gasPriceWei: null,
    latencyMs: Date.now() - startedAt,
    status: "ok",
    observedAt: new Date().toISOString(),
    raw: {
      slot: slotResponse.result,
      blockHeight: blockHeightResponse.result
    }
  };
}

function failedSnapshot(config, error, startedAt) {
  return {
    ...config,
    blockNumber: 0,
    blockHash: "",
    gasPriceWei: null,
    latencyMs: Date.now() - startedAt,
    status: "error",
    error: error instanceof Error ? error.message : "Unknown RPC error",
    observedAt: new Date().toISOString(),
    raw: {}
  };
}

async function pollChain(config) {
  const startedAt = Date.now();

  try {
    const snapshot = config.kind === "solana"
      ? await fetchSolanaSnapshot(config)
      : await fetchEvmSnapshot(config);
    snapshots.set(config.chain, snapshot);
    await saveNetworkSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    const snapshot = failedSnapshot(config, error, startedAt);
    snapshots.set(config.chain, snapshot);
    return snapshot;
  }
}

export async function pollBlockchainNetworks() {
  if (polling) return getNetworkActivitySummary();
  polling = true;

  try {
    await Promise.all(monitoredChains().map(pollChain));
  } finally {
    polling = false;
  }

  return getNetworkActivitySummary();
}

export function startBlockchainNetworkMonitor() {
  if (monitorTimer) return;

  void pollBlockchainNetworks();
  monitorTimer = setInterval(() => {
    void pollBlockchainNetworks();
  }, POLL_INTERVAL_MS);
}

export function stopBlockchainNetworkMonitor() {
  if (!monitorTimer) return;
  clearInterval(monitorTimer);
  monitorTimer = null;
}

export async function getNetworkActivitySummary({ refresh = false } = {}) {
  if (refresh || snapshots.size === 0) {
    await pollBlockchainNetworks();
  }

  const latestBlocks = Array.from(snapshots.values()).sort((a, b) => a.chain.localeCompare(b.chain));
  const persisted = await listNetworkSnapshots(30);
  const online = latestBlocks.filter((item) => item.status === "ok").length;

  return {
    status: online > 0 ? "online" : "offline",
    checkedAt: new Date().toISOString(),
    pollIntervalMs: POLL_INTERVAL_MS,
    chains: latestBlocks,
    latestBlocks,
    gas: latestBlocks
      .filter((item) => item.kind === "evm")
      .map((item) => ({
        chain: item.chain,
        network: item.network,
        gasPriceWei: item.gasPriceWei,
        gasPriceGwei: item.gasPriceWei ? Number(Number(item.gasPriceWei) / 1_000_000_000).toFixed(3) : null,
        observedAt: item.observedAt
      })),
    activity: latestBlocks.map((item) => ({
      chain: item.chain,
      eventType: item.status === "ok" ? "latest_block" : "rpc_error",
      blockNumber: item.blockNumber,
      summary: item.status === "ok"
        ? `${item.chain}/${item.network} latest block ${item.blockNumber}`
        : `${item.chain}/${item.network} RPC error: ${item.error}`,
      observedAt: item.observedAt,
      latencyMs: item.latencyMs,
      status: item.status
    })),
    persistedSnapshots: persisted,
    summary: {
      configuredChains: monitoredChains().length,
      onlineChains: online,
      failedChains: latestBlocks.filter((item) => item.status !== "ok").length
    }
  };
}

export async function getNetworkDashboardPatch(baseState) {
  const summary = await getNetworkActivitySummary();
  const chainMap = new Map(summary.latestBlocks.map((item) => [item.chain, item]));

  return {
    ...baseState,
    chains: baseState.chains.map((chain) => {
      const key = chain.sym === "ETH" ? "ethereum" : chain.sym === "SOL" ? "solana" : chain.sym === "BNB" ? "bnb" : "polygon";
      const snapshot = chainMap.get(key);
      if (!snapshot) return chain;

      return {
        ...chain,
        block: snapshot.blockNumber || chain.block,
        latency: `${snapshot.latencyMs}ms`,
        status: snapshot.status === "ok" ? "ok" : "warn",
        sync: snapshot.status === "ok" ? "100%" : "degraded"
      };
    }),
    logs: [
      ...baseState.logs.slice(-20),
      ...summary.activity.slice(0, 4).map((item) => ({
        ts: new Date(item.observedAt).toUTCString().slice(17, 25),
        lvl: item.status === "ok" ? "info" : "warn",
        msg: item.summary
      }))
    ],
    updatedAt: new Date().toISOString()
  };
}
