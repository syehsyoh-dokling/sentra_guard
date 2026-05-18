import { BrowserProvider, Contract, formatEther, formatUnits } from "ethers";
import { BLOCKCHAIN_CONFIG, formatChainId, getNetworkName } from "../config/blockchain";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

export type WalletSnapshot = {
  account: string;
  chainId: string;
  networkName: string;
  ethBalance: string;
  blockNumber: number;
  isMetaMask: boolean;
};

export type TokenSnapshot = {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  totalSupply: string;
};

export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask belum tersedia. Install atau aktifkan MetaMask di browser.");
  }

  return new BrowserProvider(window.ethereum);
}

export async function connectWallet(): Promise<WalletSnapshot> {
  if (!window.ethereum) {
    throw new Error("MetaMask belum tersedia.");
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const account = accounts[0];

  if (!account) {
    throw new Error("Tidak ada wallet account yang dipilih.");
  }

  const provider = await getBrowserProvider();
  const network = await provider.getNetwork();
  const ethBalanceRaw = await provider.getBalance(account);
  const blockNumber = await provider.getBlockNumber();

  const chainId = network.chainId.toString();

  return {
    account,
    chainId,
    networkName: getNetworkName(chainId),
    ethBalance: formatEther(ethBalanceRaw),
    blockNumber,
    isMetaMask: Boolean(window.ethereum?.isMetaMask),
  };
}

export async function getCurrentWalletSnapshot(): Promise<WalletSnapshot | null> {
  if (!window.ethereum) {
    return null;
  }

  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  const account = accounts[0];

  if (!account) {
    return null;
  }

  const provider = await getBrowserProvider();
  const network = await provider.getNetwork();
  const ethBalanceRaw = await provider.getBalance(account);
  const blockNumber = await provider.getBlockNumber();

  const chainId = network.chainId.toString();

  return {
    account,
    chainId,
    networkName: getNetworkName(chainId),
    ethBalance: formatEther(ethBalanceRaw),
    blockNumber,
    isMetaMask: Boolean(window.ethereum?.isMetaMask),
  };
}

export async function switchToSepolia() {
  if (!window.ethereum) {
    throw new Error("MetaMask belum tersedia.");
  }

  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }],
  });
}

export async function readTokenSnapshot(walletAddress: string): Promise<TokenSnapshot | null> {
  const contractAddress = BLOCKCHAIN_CONFIG.tokenContractAddress;

  if (!contractAddress) {
    return null;
  }

  const provider = await getBrowserProvider();
  const contract = new Contract(contractAddress, ERC20_ABI, provider);

  const [name, symbol, decimals, balanceRaw, totalSupplyRaw] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.balanceOf(walletAddress),
    contract.totalSupply(),
  ]);

  return {
    contractAddress,
    name,
    symbol,
    decimals: Number(decimals),
    balance: formatUnits(balanceRaw, decimals),
    totalSupply: formatUnits(totalSupplyRaw, decimals),
  };
}

export async function getRawChainId(): Promise<string | null> {
  if (!window.ethereum) return null;

  const hexChainId = await window.ethereum.request({
    method: "eth_chainId",
  });

  return formatChainId(hexChainId);
}

