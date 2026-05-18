export {};

type EthereumRequestParams =
  | readonly unknown[]
  | Record<string, unknown>;

type EthereumEventHandler = (...args: unknown[]) => void;

interface EthereumRequestArguments {
  method: string;
  params?: EthereumRequestParams;
}

interface EthereumProvider {
  isMetaMask?: boolean;

  request(args: { method: "eth_requestAccounts"; params?: EthereumRequestParams }): Promise<string[]>;
  request(args: { method: "eth_accounts"; params?: EthereumRequestParams }): Promise<string[]>;
  request(args: { method: "eth_chainId"; params?: EthereumRequestParams }): Promise<string>;
  request(args: { method: "wallet_switchEthereumChain"; params?: EthereumRequestParams }): Promise<null>;
  request(args: { method: "wallet_addEthereumChain"; params?: EthereumRequestParams }): Promise<null>;
  request(args: EthereumRequestArguments): Promise<unknown>;

  on?(eventName: "accountsChanged", handler: (accounts: string[]) => void): void;
  on?(eventName: "chainChanged", handler: (chainId: string) => void): void;
  on?(eventName: string, handler: EthereumEventHandler): void;

  removeListener?(eventName: "accountsChanged", handler: (accounts: string[]) => void): void;
  removeListener?(eventName: "chainChanged", handler: (chainId: string) => void): void;
  removeListener?(eventName: string, handler: EthereumEventHandler): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
