import { useWallet } from "../../hooks/useWallet";
import { BLOCKCHAIN_CONFIG } from "../../config/blockchain";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: string, max = 6) {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, {
    maximumFractionDigits: max,
  });
}

export default function RealBlockchainPanel() {
  const {
    wallet,
    token,
    loading,
    error,
    connect,
    refreshWallet,
    switchNetworkToSepolia,
  } = useWallet();

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(98,126,234,0.28)",
        borderRadius: "18px",
        padding: "20px",
        marginBottom: "28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#00D4AA",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Real Blockchain Layer
          </div>

          <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>
            Wallet, Network, ETH Balance & UCT Token
          </div>

          <div style={{ fontSize: "13px", color: "#777", marginTop: "8px", lineHeight: 1.6 }}>
            Wallet address, chain, block number, dan ETH balance dibaca langsung dari MetaMask/provider browser.
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={connect}
            disabled={loading}
            style={{
              border: "1px solid rgba(98,126,234,0.55)",
              background: "rgba(98,126,234,0.18)",
              color: "#b8c5ff",
              borderRadius: "10px",
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Loading..." : wallet ? "Reconnect Wallet" : "Connect MetaMask"}
          </button>

          <button
            onClick={refreshWallet}
            disabled={loading}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#ccc",
              borderRadius: "10px",
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Refresh
          </button>

          <button
            onClick={switchNetworkToSepolia}
            disabled={loading}
            style={{
              border: "1px solid rgba(0,212,170,0.35)",
              background: "rgba(0,212,170,0.09)",
              color: "#00D4AA",
              borderRadius: "10px",
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Switch Sepolia
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: "16px",
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.28)",
            color: "#ff9c9c",
            padding: "12px",
            borderRadius: "10px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginTop: "18px",
        }}
      >
        <InfoCard label="Wallet" value={wallet ? shortAddress(wallet.account) : "Not connected"} live={Boolean(wallet)} />
        <InfoCard label="Network" value={wallet ? wallet.networkName : BLOCKCHAIN_CONFIG.defaultNetworkName} live={Boolean(wallet)} />
        <InfoCard label="Chain ID" value={wallet ? wallet.chainId : BLOCKCHAIN_CONFIG.defaultChainId} live={Boolean(wallet)} />
        <InfoCard label="ETH Balance" value={wallet ? `${formatNumber(wallet.ethBalance)} ETH` : "-"} live={Boolean(wallet)} />
        <InfoCard label="Block Number" value={wallet ? wallet.blockNumber.toLocaleString() : "-"} live={Boolean(wallet)} />
        <InfoCard label="MetaMask" value={wallet?.isMetaMask ? "Detected" : "Not detected"} live={Boolean(wallet?.isMetaMask)} />
      </div>

      <div
        style={{
          marginTop: "14px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "14px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#555", letterSpacing: "1px", marginBottom: "10px" }}>
          TOKEN CONTRACT
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <InfoCard label="Contract" value={BLOCKCHAIN_CONFIG.tokenContractAddress ? shortAddress(BLOCKCHAIN_CONFIG.tokenContractAddress) : "Not configured"} live={Boolean(BLOCKCHAIN_CONFIG.tokenContractAddress)} />
          <InfoCard label="Token" value={token ? `${token.name} (${token.symbol})` : "Deploy first"} live={Boolean(token)} />
          <InfoCard label="UCT Balance" value={token ? `${formatNumber(token.balance)} ${token.symbol}` : "-"} live={Boolean(token)} />
          <InfoCard label="Total Supply" value={token ? `${formatNumber(token.totalSupply)} ${token.symbol}` : "-"} live={Boolean(token)} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        padding: "14px",
        minHeight: "82px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
        <div style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>
          {label}
        </div>

        <div
          style={{
            fontSize: "10px",
            color: live ? "#00D4AA" : "#777",
            border: `1px solid ${live ? "rgba(0,212,170,0.35)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "999px",
            padding: "2px 7px",
          }}
        >
          {live ? "LIVE" : "READY"}
        </div>
      </div>

      <div style={{ marginTop: "10px", fontSize: "14px", color: "#e8e8f0", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}