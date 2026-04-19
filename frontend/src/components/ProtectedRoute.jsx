import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/supabase";
import { getConnectedAccount } from "../services/blockchain";

/**
 * ProtectedRoute
 * Props:
 *   allowedRoles  — array of roles allowed, e.g. ["forensic_official"]
 *   requireWallet — boolean, block if MetaMask not connected
 *   children
 */
export default function ProtectedRoute({ children, allowedRoles = [], requireWallet = false }) {
  const [user, setUser]           = useState(undefined); // undefined = loading
  const [wallet, setWallet]       = useState(null);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const u = await getCurrentUser();
        const w = await getConnectedAccount();
        setUser(u);
        setWallet(w);
      } catch (err) {
        // treat errors as unauthenticated/no-wallet
        setUser(null);
        setWallet(null);
      } finally {
        setChecking(false);
      }
    }
    check();
  }, []);

  if (checking) {
    return <div className="loading">⏳ Loading…</div>;
  }

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Forensic official must have MetaMask
  if (requireWallet && !wallet) {
    return (
      <div className="auth-page">
        <div className="auth-box" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🦊</div>
          <h2>MetaMask Required</h2>
          <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)" }}>
            Forensic Officials must connect their MetaMask wallet to access the dashboard.
          </p>
          <button
            className="btn btn-metamask"
            onClick={async () => {
              const { connectMetaMask } = await import("../services/blockchain");
              const addr = await connectMetaMask();
              if (addr) window.location.reload();
            }}
          >
            🦊 Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return children;
}
