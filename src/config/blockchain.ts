export const BLOCKCHAIN_CONFIG = {
  defaultChainId: import.meta.env.VITE_DEFAULT_CHAIN_ID || "11155111",
  defaultNetworkName: import.meta.env.VITE_DEFAULT_NETWORK_NAME || "sepolia",
  tokenContractAddress: import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || "",
  paymentReceiverAddress: import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS || "",
};

export const SUPPORTED_NETWORKS: Record<string, string> = {
  "1": "Ethereum Mainnet",
  "11155111": "Sepolia Testnet",
  "31337": "Hardhat Localhost",
};

export function formatChainId(hexChainId: string): string {
  return parseInt(hexChainId, 16).toString();
}

export function getNetworkName(chainId: string): string {
  return SUPPORTED_NETWORKS[chainId] || `Unknown Network (${chainId})`;
}