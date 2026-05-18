import { useCallback, useEffect, useState } from "react";
import {
  connectWallet,
  getCurrentWalletSnapshot,
  readTokenSnapshot,
  switchToSepolia,
  type TokenSnapshot,
  type WalletSnapshot,
} from "../lib/web3";

type WalletState = {
  wallet: WalletSnapshot | null;
  token: TokenSnapshot | null;
  loading: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    wallet: null,
    token: null,
    loading: false,
    error: null,
  });

  const refreshWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const wallet = await getCurrentWalletSnapshot();

      if (!wallet) {
        setState({
          wallet: null,
          token: null,
          loading: false,
          error: null,
        });

        return;
      }

      const token = await readTokenSnapshot(wallet.account);

      setState({
        wallet,
        token,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal refresh wallet.",
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const wallet = await connectWallet();
      const token = await readTokenSnapshot(wallet.account);

      setState({
        wallet,
        token,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal connect wallet.",
      }));
    }
  }, []);

  const switchNetworkToSepolia = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await switchToSepolia();
      await refreshWallet();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal switch network.",
      }));
    }
  }, [refreshWallet]);

  useEffect(() => {
    refreshWallet();

    if (!window.ethereum?.on) return;

    const handleAccountsChanged = () => refreshWallet();
    const handleChainChanged = () => refreshWallet();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshWallet]);

  return {
    ...state,
    connect,
    refreshWallet,
    switchNetworkToSepolia,
  };
}