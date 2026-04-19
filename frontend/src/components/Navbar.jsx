import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser, getCurrentUser } from "../services/supabase";
import { getConnectedAccount } from "../services/blockchain";

export default function Navbar() {
  const [user, setUser]     = useState(null);
  const [wallet, setWallet] = useState(null);
  const navigate            = useNavigate();

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    getConnectedAccount().then(setWallet).catch(() => setWallet(null));

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        setWallet(accounts[0] || null);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  async function handleLogout() {
    await logoutUser();
    navigate("/login");
  }

  const roleLabel = {
    forensic_official: "🔬 Forensic Official",
    police_official:   "🚔 Police Official",
    student:           "🎓 Student",
    public:            "🌐 Public User",
  };

  function shortWallet(addr) {
    return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : null;
  }

  return (
    <nav className="navbar">
      <div className="container">
        <span className="navbar-brand">⚖️ ForensicChain</span>
        <div className="flex gap-1" style={{ alignItems: "center" }}>
          {user && (
            <span className="navbar-user">
              {roleLabel[user.role] || user.role} — {user.full_name}
            </span>
          )}
          {wallet && (
            <span className="navbar-wallet">{shortWallet(wallet)}</span>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
