import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getPublicCases } from "../services/supabase";

export default function PublicDashboard() {
  const [cases, setCases]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    getPublicCases()
      .then(setCases)
      .catch((err) => {
        console.error(err);
        setError("Failed to load public cases. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(
    (c) =>
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo">🌐 Public Portal</div>
          <nav className="sidebar-nav">
            <button className="active">Public Cases</button>
          </nav>
          <div style={{ padding: "1rem 1.2rem", color: "#b8d4f0", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: "1rem" }}>
            🌐 Public access<br />
            <span style={{ fontSize: "0.72rem" }}>View publicly disclosed cases</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-header">
            <h1>Public Case Portal</h1>
            <p>Publicly disclosed forensic cases</p>
          </div>

          <div className="alert alert-info">
            🌐 This portal shows only cases that forensic officials have designated as public. Confidential cases, evidence details, and analysis reports are not accessible to public users.
          </div>

          {/* Search */}
          <div className="card" style={{ padding: "1rem 1.5rem" }}>
            <input
              className="form-control"
              placeholder="🔍 Search by case number or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-num">{filtered.length}</div>
              <div className="stat-label">Public Cases</div>
            </div>
            <div className="stat-card accent-border">
              <div className="stat-num">{filtered.filter((c) => c.status === "open").length}</div>
              <div className="stat-label">Open Cases</div>
            </div>
            <div className="stat-card success-border">
              <div className="stat-num">{filtered.filter((c) => c.status === "closed").length}</div>
              <div className="stat-label">Closed Cases</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📂 Public Cases</div>
            {error ? (
              <div className="alert alert-error">{error}</div> // Display error message
            ) : loading ? (
              <div className="loading">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>No public cases {search ? "matching your search" : "available"}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Case #</th><th>Title</th><th>Description</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.case_number}</strong></td>
                        <td>{c.title}</td>
                        <td style={{ maxWidth: "240px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {c.description ? c.description.slice(0, 80) + (c.description.length > 80 ? "…" : "") : "—"}
                        </td>
                        <td>
                          <span className={`badge badge-${c.status === "open" ? "success" : c.status === "closed" ? "secondary" : "warning"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>{c.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ background: "#f8f9fa", borderTop: "3px solid var(--primary)" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <strong>Note:</strong> All evidence in this system is recorded on the blockchain to ensure tamper-proof integrity. For inquiries about specific cases, please contact the relevant law enforcement or forensic agency.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
