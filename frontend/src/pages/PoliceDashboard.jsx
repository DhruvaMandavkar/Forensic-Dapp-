import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  getCases, createCase,
  addEvidence, getEvidenceByCase,
  addCustodyRecord, getCustodyByEvidence,
  verifyEvidence,
} from "../services/supabase";

const TABS = ["Cases", "Evidence", "Chain of Custody", "Verification Status"];

export default function PoliceDashboard() {
  const [activeTab, setActiveTab]       = useState("Cases");
  const [cases, setCases]               = useState([]);
  const [evidence, setEvidence]         = useState([]);
  const [custody, setCustody]           = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState({ type: "", text: "" });

  const [caseForm, setCaseForm] = useState({ caseNumber: "", title: "", description: "", isPublic: false });
  const [evForm, setEvForm]     = useState({ title: "", description: "", evidenceType: "physical", isConfidential: false });
  const [custForm, setCustForm] = useState({ action: "collected", notes: "" });

  useEffect(() => { loadCases(); }, []);

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  }

  async function loadCases() {
    setLoading(true);
    try { setCases(await getCases()); }
    catch (e) { showMsg("error", e.message); }
    finally { setLoading(false); }
  }

  async function handleSelectCase(c) {
    setSelectedCase(c);
    setSelectedEvidence(null);
    setCustody([]);
    try { setEvidence(await getEvidenceByCase(c.id)); }
    catch (e) { showMsg("error", e.message); }
  }

  async function handleSelectEvidence(ev) {
    setSelectedEvidence(ev);
    try {
      setCustody(await getCustodyByEvidence(ev.id));
      setActiveTab("Chain of Custody");
    } catch (e) { showMsg("error", e.message); }
  }

  async function handleCreateCase(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const newCase = await createCase(caseForm);
      setCases([newCase, ...cases]);
      setCaseForm({ caseNumber: "", title: "", description: "", isPublic: false });
      showMsg("success", `Case ${newCase.case_number} created.`);
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleAddEvidence(e) {
    e.preventDefault();
    if (!selectedCase) return showMsg("error", "Select a case first.");
    setLoading(true);
    try {
      const ev = await addEvidence({
        caseId: selectedCase.id,
        title: evForm.title,
        description: evForm.description,
        evidenceType: evForm.evidenceType,
        isConfidential: evForm.isConfidential,
        blockchainId: null,
        txHash: null,
      });
      setEvidence([ev, ...evidence]);
      setEvForm({ title: "", description: "", evidenceType: "physical", isConfidential: false });
      showMsg("success", "Evidence added successfully.");
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleAddCustody(e) {
    e.preventDefault();
    if (!selectedEvidence) return showMsg("error", "Select an evidence item first.");
    setLoading(true);
    try {
      await addCustodyRecord({ evidenceId: selectedEvidence.id, action: custForm.action, notes: custForm.notes, txHash: null });
      setCustody(await getCustodyByEvidence(selectedEvidence.id));
      setCustForm({ action: "collected", notes: "" });
      showMsg("success", "Custody record added.");
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleVerify(evidenceId) {
    setLoading(true);
    try {
      await verifyEvidence(evidenceId);
      setEvidence(evidence.map((ev) => ev.id === evidenceId ? { ...ev, verified: true } : ev));
      showMsg("success", "Evidence marked as verified.");
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  const stats = {
    total: cases.length,
    open: cases.filter((c) => c.status === "open").length,
    totalEv: evidence.length,
    verifiedEv: evidence.filter((e) => e.verified).length,
  };

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo">🚔 Police Panel</div>
          <nav className="sidebar-nav">
            {TABS.map((t) => (
              <button key={t} className={activeTab === t ? "active" : ""} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </nav>
          {selectedCase && (
            <div style={{ padding: "1rem 1.2rem", color: "#b8d4f0", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: "1rem" }}>
              📁 Active Case<br />
              <strong style={{ color: "#e8a020" }}>{selectedCase.case_number}</strong>
              {selectedEvidence && (<><br /><br />🧪 Evidence<br /><strong style={{ color: "#e8a020" }}>{selectedEvidence.title}</strong></>)}
            </div>
          )}
        </aside>

        <main className="main-content">
          <div className="page-header">
            <h1>Police Dashboard</h1>
            <p>Case management, evidence collection and custody tracking</p>
          </div>

          {msg.text && <div className={`alert alert-${msg.type === "error" ? "error" : msg.type === "success" ? "success" : "info"}`}>{msg.text}</div>}

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-num">{stats.total}</div><div className="stat-label">Total Cases</div></div>
            <div className="stat-card accent-border"><div className="stat-num">{stats.open}</div><div className="stat-label">Open Cases</div></div>
            <div className="stat-card success-border"><div className="stat-num">{stats.totalEv}</div><div className="stat-label">Evidence Items</div></div>
            <div className="stat-card danger-border"><div className="stat-num">{stats.verifiedEv}</div><div className="stat-label">Verified Evidence</div></div>
          </div>

          {/* ── CASES ── */}
          {activeTab === "Cases" && (
            <>
              <div className="card">
                <div className="card-title">➕ Create New Case</div>
                <form onSubmit={handleCreateCase}>
                  <div className="form-group">
                    <label>Case Number *</label>
                    <input className="form-control" value={caseForm.caseNumber} onChange={(e) => setCaseForm({ ...caseForm, caseNumber: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Title *</label>
                    <input className="form-control" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" rows={3} value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={caseForm.isPublic} onChange={(e) => setCaseForm({ ...caseForm, isPublic: e.target.checked })} style={{ marginRight: "0.4rem" }} />
                      Make this case public
                    </label>
                  </div>
                  <button className="btn btn-primary" disabled={loading}>Create Case</button>
                </form>
              </div>

              <div className="card">
                <div className="card-title">📂 All Cases</div>
                {loading ? <div className="loading">Loading…</div> : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Case #</th><th>Title</th><th>Status</th><th>Public</th><th>Created</th><th>Action</th></tr></thead>
                      <tbody>
                        {cases.length === 0 && <tr><td colSpan={6} className="text-center text-muted">No cases found</td></tr>}
                        {cases.map((c) => (
                          <tr key={c.id} style={{ background: selectedCase?.id === c.id ? "#f0f7ff" : "" }}>
                            <td><strong>{c.case_number}</strong></td>
                            <td>{c.title}</td>
                            <td><span className={`badge badge-${c.status === "open" ? "success" : "secondary"}`}>{c.status}</span></td>
                            <td>{c.is_public ? "✅" : "🔒"}</td>
                            <td>{c.created_at?.slice(0, 10)}</td>
                            <td>
                              <button className="btn btn-outline btn-sm" onClick={() => { handleSelectCase(c); setActiveTab("Evidence"); }}>
                                {selectedCase?.id === c.id ? "✔ Selected" : "Select"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── EVIDENCE ── */}
          {activeTab === "Evidence" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case from the Cases tab first.</div>}
              {selectedCase && (
                <>
                  <div className="card">
                    <div className="card-title">🧪 Add Evidence — Case: {selectedCase.case_number}</div>
                    <form onSubmit={handleAddEvidence}>
                      <div className="form-group">
                        <label>Title *</label>
                        <input className="form-control" value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-control" rows={3} value={evForm.description} onChange={(e) => setEvForm({ ...evForm, description: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Evidence Type</label>
                        <select className="form-control" value={evForm.evidenceType} onChange={(e) => setEvForm({ ...evForm, evidenceType: e.target.value })}>
                          <option value="physical">Physical</option>
                          <option value="digital">Digital</option>
                          <option value="documentary">Documentary</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" checked={evForm.isConfidential} onChange={(e) => setEvForm({ ...evForm, isConfidential: e.target.checked })} style={{ marginRight: "0.4rem" }} />
                          Mark as Confidential
                        </label>
                      </div>
                      <button className="btn btn-primary" disabled={loading}>Add Evidence</button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-title">📋 Evidence List</div>
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Title</th><th>Type</th><th>Confidential</th><th>Verified</th><th>Action</th></tr></thead>
                        <tbody>
                          {evidence.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No evidence yet</td></tr>}
                          {evidence.map((ev) => (
                            <tr key={ev.id} style={{ background: selectedEvidence?.id === ev.id ? "#f0f7ff" : "" }}>
                              <td>{ev.title}</td>
                              <td><span className="badge badge-info">{ev.evidence_type}</span></td>
                              <td>{ev.is_confidential ? "🔒 Yes" : "🌐 No"}</td>
                              <td><span className={`badge badge-${ev.verified ? "success" : "warning"}`}>{ev.verified ? "Verified" : "Pending"}</span></td>
                              <td>
                                <button className="btn btn-outline btn-sm" onClick={() => handleSelectEvidence(ev)}>
                                  {selectedEvidence?.id === ev.id ? "✔ Selected" : "View Custody"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── CHAIN OF CUSTODY ── */}
          {activeTab === "Chain of Custody" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case from the Cases tab first.</div>}
              {selectedCase && !selectedEvidence && <div className="alert alert-info">Select an evidence item from the Evidence tab to manage its custody.</div>}
              {selectedCase && selectedEvidence && (
                <>
                  <div className="card">
                    <div className="card-title">🔗 Add Custody Record — {selectedEvidence.title}</div>
                    <form onSubmit={handleAddCustody}>
                      <div className="form-group">
                        <label>Action *</label>
                        <select className="form-control" value={custForm.action} onChange={(e) => setCustForm({ ...custForm, action: e.target.value })}>
                          {["collected", "transferred", "analyzed", "stored", "tested", "returned"].map((a) => (
                            <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-control" rows={3} placeholder="Describe the custody action..." value={custForm.notes} onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })} />
                      </div>
                      <button className="btn btn-primary" disabled={loading}>Add Custody Record</button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-title">📜 Custody Chain</div>
                    {custody.length === 0 ? (
                      <div className="empty-state"><div className="icon">🔗</div><p>No custody records yet</p></div>
                    ) : (
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Timestamp</th><th>Handler</th><th>Action</th><th>Notes</th></tr></thead>
                          <tbody>
                            {custody.map((c) => (
                              <tr key={c.id}>
                                <td style={{ whiteSpace: "nowrap" }}>{new Date(c.timestamp).toLocaleString()}</td>
                                <td>{c.users?.full_name || "—"}</td>
                                <td><span className="badge badge-info">{c.action}</span></td>
                                <td>{c.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── VERIFICATION STATUS ── */}
          {activeTab === "Verification Status" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case from the Cases tab first.</div>}
              {selectedCase && (
                <div className="card">
                  <div className="card-title">✅ Verification Status — Case: {selectedCase.case_number}</div>
                  {evidence.length === 0 ? (
                    <div className="empty-state"><div className="icon">🔍</div><p>No evidence found for this case</p></div>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Evidence</th><th>Type</th><th>Confidential</th><th>Blockchain ID</th><th>TX Hash</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                          {evidence.map((ev) => (
                            <tr key={ev.id}>
                              <td>{ev.title}</td>
                              <td><span className="badge badge-info">{ev.evidence_type}</span></td>
                              <td>{ev.is_confidential ? "🔒" : "🌐"}</td>
                              <td>{ev.blockchain_id ?? "—"}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{ev.tx_hash ? ev.tx_hash.slice(0, 14) + "…" : "—"}</td>
                              <td><span className={`badge badge-${ev.verified ? "success" : "warning"}`}>{ev.verified ? "✅ Verified" : "⏳ Pending"}</span></td>
                              <td>
                                {!ev.verified && (
                                  <button className="btn btn-success btn-sm" disabled={loading} onClick={() => handleVerify(ev.id)}>
                                    Mark Verified
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
