import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getCases, getEvidenceByCase } from "../services/supabase";

export default function StudentDashboard() {
  const [cases, setCases]     = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCases()
      .then((data) => setCases(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectCase(c) {
    setSelectedCase(c);
    setLoading(true);
    try {
      const ev = await getEvidenceByCase(c.id);
      setEvidence(ev.filter((e) => !e.is_confidential));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo">🎓 Student Panel</div>
          <nav className="sidebar-nav">
            <button className="active">Cases</button>
            <button disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>Confidential Evidence 🔒</button>
            <button disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>Analysis Reports 🔒</button>
          </nav>
          <div style={{ padding: "1rem 1.2rem", color: "#b8d4f0", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: "1rem" }}>
            🎓 Academic access<br />
            <span style={{ fontSize: "0.72rem" }}>Non-confidential data only</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-header">
            <h1>Student Dashboard</h1>
            <p>Academic access — non-confidential cases and evidence metadata</p>
          </div>

          <div className="alert alert-info">
            🎓 As a forensic student, you can view non-confidential case data for academic purposes. Sensitive evidence and analysis reports are restricted.
          </div>

          <div className="card">
            <div className="card-title">📂 Cases</div>
            {loading ? <div className="loading">Loading…</div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
                  <tbody>
                    {cases.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No cases available</td></tr>}
                    {cases.map((c) => (
                      <tr key={c.id} style={selectedCase?.id === c.id ? { background: "#f0f7ff" } : {}}>
                        <td><strong>{c.case_number}</strong></td>
                        <td>{c.title}</td>
                        <td><span className={`badge badge-${c.status === "open" ? "success" : "secondary"}`}>{c.status}</span></td>
                        <td>{c.created_at?.slice(0, 10)}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => handleSelectCase(c)}>
                            View Evidence
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedCase && (
            <div className="card">
              <div className="card-title">🧪 Non-Confidential Evidence — Case {selectedCase.case_number}</div>
              {evidence.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔒</div>
                  <p>No publicly accessible evidence for this case.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Title</th><th>Type</th><th>Description</th><th>Verified</th><th>Collected</th></tr></thead>
                    <tbody>
                      {evidence.map((ev) => (
                        <tr key={ev.id}>
                          <td>{ev.title}</td>
                          <td><span className="badge badge-info">{ev.evidence_type}</span></td>
                          <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.description || "—"}</td>
                          <td><span className={`badge badge-${ev.verified ? "success" : "warning"}`}>{ev.verified ? "Yes" : "No"}</span></td>
                          <td>{ev.collected_at?.slice(0, 10) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.8rem" }}>
                🔒 Confidential evidence, detailed analysis, and file attachments are not accessible in student mode.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
