import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { connectMetaMask, getConnectedAccount, isMetaMaskInstalled } from "../services/blockchain";
import { updateWalletAddress, getCurrentUser } from "../services/supabase";

/**
 * MetaMaskButton
 * Props:
 *   onConnect(address) — called after successful connection
 *   required — if true, shows warning when not connected
 */
export default function MetaMaskButton({ onConnect, required = false }) {
  const [wallet, setWallet]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Check if already connected on mount
  useEffect(() => {
    getConnectedAccount().then((addr) => {
      if (addr) {
        setWallet(addr);
        if (onConnect) onConnect(addr);
      }
    }).catch(() => {});

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        const addr = accounts[0] || null;
        setWallet(addr);
        if (onConnect) onConnect(addr);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  async function handleConnect() {
    setError("");
    setLoading(true);
    try {
      if (!isMetaMaskInstalled()) {
        throw new Error("MetaMask not installed. Visit metamask.io");
      }
      const address = await connectMetaMask();

      if (!ethers.isAddress(address)) {
        throw new Error("Invalid wallet address returned from MetaMask.");
      }

      setWallet(address);

      // Save to Supabase if user is logged in
      const user = await getCurrentUser();
      if (user) {
        await updateWalletAddress(user.id, address);
      }

      if (onConnect) onConnect(address);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function shortAddress(addr) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  }

  return (
    <div className="metamask-btn-wrap">
      {wallet ? (
        <span className="wallet-connected">{shortAddress(wallet)}</span>
      ) : (
        <>
          <button
            className="btn btn-metamask"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? "Connecting..." : "🦊 Connect MetaMask"}
          </button>
          {required && !wallet && (
            <p style={{ color: "#e67e22", fontSize: "0.8rem", marginTop: "0.4rem" }}>
              ⚠️ MetaMask connection required to continue
            </p>
          )}
        </>
      )}
      {error && <p className="form-error" style={{ marginTop: "0.4rem" }}>{error}</p>}
    </div>
  );
}
