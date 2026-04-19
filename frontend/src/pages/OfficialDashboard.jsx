import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import MetaMaskButton from "../components/MetaMaskButton";
import {
  getCases, createCase,
  addEvidence, getEvidenceByCase,
  addCustodyRecord, getCustodyByEvidence,
  addForensicAnalysis, getAnalysisByCase,
  addCourtVerification, getCourtVerificationsByCase,
  uploadFile,
} from "../services/supabase";
import {
  addEvidenceOnChain,
  verifyEvidenceOnChain,
  transferCustodyOnChain,
} from "../services/blockchain";

const TABS = ["Cases", "Evidence", "Chain of Custody", "Analysis", "Court Verification", "Blockchain"];

export default function OfficialDashboard() {
  const [activeTab, setActiveTab]   = useState("Cases");
  const [cases, setCases]           = useState([]);
  const [evidence, setEvidence]     = useState([]);
  const [custody, setCustody]       = useState([]);
  const [analysis, setAnalysis]     = useState([]);
  const [court, setCourt]           = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [msg, setMsg]               = useState({ type: "", text: "" });
  const [loading, setLoading]       = useState(false);

  // ── Case form state
  const [caseForm, setCaseForm] = useState({ caseNumber: "", title: "", description: "", isPublic: false });
  // ── Evidence form state
  const [evForm, setEvForm] = useState({ title: "", description: "", evidenceType: "digital", isConfidential: true, hash: "" });
  // ── Custody form state
  const [custForm, setCustForm] = useState({ evidenceId: "", action: "collected", notes: "" });
  // ── Analysis form state
  const [anForm, setAnForm] = useState({ evidenceId: "", analysisType: "", findings: "", toolsUsed: "", isConfidential: true });
  // ── Court form state
  const [courtForm, setCourtForm] = useState({ evidenceId: "", courtName: "", notes: "" });
  // ── File upload
  const [fileEvidenceId, setFileEvidenceId] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await getCases();
      setCases(data);
    } catch (e) { showMsg("error", e.message); }
    finally { setLoading(false); }
  }

  async function loadEvidence(caseId) {
    try { setEvidence(await getEvidenceByCase(caseId)); }
    catch (e) { showMsg("error", e.message); }
  }

  async function loadCustody(evidenceId) {
    try { setCustody(await getCustodyByEvidence(evidenceId)); }
    catch (e) { showMsg("error", e.message); }
  }

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  }

  // ── Handlers ──────────────────────────────────────────────────

  async function handleToggleCaseStatus(c) {
    const newStatus = c.status === "open" ? "closed" : "open";
    try {
      const { error } = await import("../services/supabase").then(m =>
        m.supabase.from("cases").update({ status: newStatus }).eq("id", c.id)
      );
      if (error) throw error;
      setCases(cases.map((x) => x.id === c.id ? { ...x, status: newStatus } : x));
      if (selectedCase?.id === c.id) setSelectedCase({ ...c, status: newStatus });
      showMsg("success", `Case ${c.case_number} marked as ${newStatus}.`);
    } catch (err) { showMsg("error", err.message); }
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
    if (!selectedCase) return showMsg("error", "Please select a case first.");
    setLoading(true);
    try {
      // 1. Add on-chain
      let blockchainId = null, txHash = null;
      try {
        const result = await addEvidenceOnChain({
          caseId: selectedCase.case_number,
          evidenceHash: evForm.hash || "0x",
          description: evForm.description,
          isConfidential: evForm.isConfidential,
        });
        blockchainId = result.onChainId;
        txHash = result.txHash;
      } catch (chainErr) {
        console.warn("Blockchain tx skipped (not connected or wrong role):", chainErr.message);
      }

      // 2. Save to Supabase
      const ev = await addEvidence({
        caseId: selectedCase.id,
        title: evForm.title,
        description: evForm.description,
        evidenceType: evForm.evidenceType,
        isConfidential: evForm.isConfidential,
        blockchainId,
        txHash,
      });

      setEvidence([ev, ...evidence]);
      setEvForm({ title: "", description: "", evidenceType: "digital", isConfidential: true, hash: "" });
      showMsg("success", `Evidence added${txHash ? " and recorded on blockchain." : "."}`);
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleAddCustody(e) {
    e.preventDefault();
    if (!custForm.evidenceId) return showMsg("error", "Select an evidence item first.");
    setLoading(true);
    try {
      let txHash = null;
      if (custForm.evidenceId) {
        const ev = evidence.find((ev) => ev.id === custForm.evidenceId);
        if (ev?.blockchain_id) {
          try {
            txHash = await transferCustodyOnChain(ev.blockchain_id, custForm.action, custForm.notes);
          } catch (chainErr) {
            console.warn("Chain tx skipped:", chainErr.message);
          }
        }
      }
      const record = await addCustodyRecord({ ...custForm, txHash });
      await loadCustody(custForm.evidenceId);
      showMsg("success", "Custody record added.");
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleAddAnalysis(e) {
    e.preventDefault();
    if (!selectedCase) return showMsg("error", "Select a case first.");
    setLoading(true);
    try {
      await addForensicAnalysis({ caseId: selectedCase.id, ...anForm });
      setAnalysis(await getAnalysisByCase(selectedCase.id));
      showMsg("success", "Analysis saved.");
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleAddCourtVerification(e) {
    e.preventDefault();
    if (!selectedCase) return showMsg("error", "Select a case first.");
    setLoading(true);
    try {
      let blockchainTx = null;
      const ev = evidence.find((ev) => ev.id === courtForm.evidenceId);
      if (ev?.blockchain_id) {
        try {
          blockchainTx = await verifyEvidenceOnChain(ev.blockchain_id);
        } catch (chainErr) {
          console.warn("Chain verify skipped:", chainErr.message);
        }
      }
      await addCourtVerification({ caseId: selectedCase.id, ...courtForm, blockchainTx });
      setCourt(await getCourtVerificationsByCase(selectedCase.id));
      showMsg("success", `Court verification recorded${blockchainTx ? " on blockchain." : "."}`);
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!uploadedFile || !fileEvidenceId) return showMsg("error", "Select a file and evidence ID.");
    setLoading(true);
    try {
      const result = await uploadFile(uploadedFile, fileEvidenceId);
      showMsg("success", `File uploaded: ${result.path}`);
      setUploadedFile(null);
    } catch (err) { showMsg("error", err.message); }
    finally { setLoading(false); }
  }

  // ── Select case helper
  async function selectCase(c) {
    setSelectedCase(c);
    await loadEvidence(c.id);
    setAnalysis(await getAnalysisByCase(c.id));
    setCourt(await getCourtVerificationsByCase(c.id));
    showMsg("info", `Working on case: ${c.case_number}`);
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">🔬 Official Panel</div>
          <nav className="sidebar-nav">
            {TABS.map((t) => (
              <button key={t} className={activeTab === t ? "active" : ""} onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </nav>
          {selectedCase && (
            <div style={{ padding: "1rem 1.2rem", color: "#b8d4f0", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: "1rem" }}>
              📁 Active Case<br />
              <strong style={{ color: "#e8a020" }}>{selectedCase.case_number}</strong>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="main-content">
          <div className="page-header flex-between">
            <div>
              <h1>Forensic Official Dashboard</h1>
              <p>Full CRUD access — blockchain-verified evidence management</p>
            </div>
            <MetaMaskButton required />
          </div>

          {msg.text && <div className={`alert alert-${msg.type === "error" ? "error" : msg.type === "success" ? "success" : "info"}`}>{msg.text}</div>}

          {/* ── CASES ─────────────────────────────────────── */}
          {activeTab === "Cases" && (
            <>
              {/* Create case form */}
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

              {/* Cases table */}
              <div className="card">
                <div className="card-title">📂 All Cases</div>
                {loading ? <div className="loading">Loading…</div> : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Case #</th><th>Title</th><th>Status</th><th>Public</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {cases.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No cases yet</td></tr>}
                        {cases.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.case_number}</strong></td>
                            <td>{c.title}</td>
                            <td><span className={`badge badge-${c.status === "open" ? "success" : "secondary"}`}>{c.status}</span></td>
                            <td>{c.is_public ? "✅" : "🔒"}</td>
                            <td>
                              <button className="btn btn-outline btn-sm" onClick={() => selectCase(c)} style={{ marginRight: "0.4rem" }}>
                                {selectedCase?.id === c.id ? "✔ Selected" : "Select"}
                              </button>
                              <button
                                className={`btn btn-sm ${c.status === "open" ? "btn-danger" : "btn-success"}`}
                                onClick={() => handleToggleCaseStatus(c)}
                              >
                                {c.status === "open" ? "Close" : "Reopen"}
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

          {/* ── EVIDENCE ──────────────────────────────────── */}
          {activeTab === "Evidence" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Please select a case from the Cases tab first.</div>}
              {selectedCase && (
                <>
                  <div className="card">
                    <div className="card-title">🧪 Add Evidence to Case: {selectedCase.case_number}</div>
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
                          <option value="digital">Digital</option>
                          <option value="physical">Physical</option>
                          <option value="documentary">Documentary</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>File Hash (SHA-256 or IPFS CID)</label>
                        <input className="form-control" placeholder="0x... or QmXxx..." value={evForm.hash} onChange={(e) => setEvForm({ ...evForm, hash: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" checked={evForm.isConfidential} onChange={(e) => setEvForm({ ...evForm, isConfidential: e.target.checked })} style={{ marginRight: "0.4rem" }} />
                          Confidential (hidden from students/public)
                        </label>
                      </div>
                      <button className="btn btn-accent" disabled={loading}>Add Evidence + Record on Blockchain</button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-title">📋 Evidence List</div>
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Title</th><th>Type</th><th>Confidential</th><th>Verified</th><th>TX Hash</th></tr></thead>
                        <tbody>
                          {evidence.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No evidence yet</td></tr>}
                          {evidence.map((ev) => (
                            <tr key={ev.id}>
                              <td>{ev.title}</td>
                              <td><span className="badge badge-info">{ev.evidence_type}</span></td>
                              <td>{ev.is_confidential ? "🔒 Yes" : "🌐 No"}</td>
                              <td><span className={`badge badge-${ev.verified ? "success" : "warning"}`}>{ev.verified ? "Verified" : "Pending"}</span></td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{ev.tx_hash ? ev.tx_hash.slice(0, 16) + "…" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* File upload */}
                  <div className="card">
                    <div className="card-title">📁 Upload Digital Evidence File</div>
                    <form onSubmit={handleFileUpload}>
                      <div className="form-group">
                        <label>Select Evidence</label>
                        <select className="form-control" value={fileEvidenceId} onChange={(e) => setFileEvidenceId(e.target.value)} required>
                          <option value="">-- Select Evidence --</option>
                          {evidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>File</label>
                        <input className="form-control" type="file" onChange={(e) => setUploadedFile(e.target.files[0])} required />
                      </div>
                      <button className="btn btn-primary" disabled={loading}>Upload to Supabase Storage</button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── CHAIN OF CUSTODY ──────────────────────────── */}
          {activeTab === "Chain of Custody" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case first.</div>}
              {selectedCase && (
                <>
                  <div className="card">
                    <div className="card-title">🔗 Add Custody Record</div>
                    <form onSubmit={handleAddCustody}>
                      <div className="form-group">
                        <label>Select Evidence</label>
                        <select className="form-control" value={custForm.evidenceId} onChange={(e) => { setCustForm({ ...custForm, evidenceId: e.target.value }); loadCustody(e.target.value); }} required>
                          <option value="">-- Select --</option>
                          {evidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Action</label>
                        <select className="form-control" value={custForm.action} onChange={(e) => setCustForm({ ...custForm, action: e.target.value })}>
                          {["collected","transferred","analyzed","stored","tested","returned"].map((a) => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-control" rows={2} value={custForm.notes} onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })} />
                      </div>
                      <button className="btn btn-accent" disabled={loading}>Record Custody Transfer</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-title">📜 Custody Chain</div>
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Time</th><th>Handler</th><th>Action</th><th>Notes</th><th>TX</th></tr></thead>
                        <tbody>
                          {custody.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No records</td></tr>}
                          {custody.map((c) => (
                            <tr key={c.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{new Date(c.timestamp).toLocaleString()}</td>
                              <td>{c.users?.full_name || "—"}</td>
                              <td><span className="badge badge-info">{c.action}</span></td>
                              <td>{c.notes}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{c.tx_hash ? c.tx_hash.slice(0, 12) + "…" : "—"}</td>
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

          {/* ── ANALYSIS ──────────────────────────────────── */}
          {activeTab === "Analysis" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case first.</div>}
              {selectedCase && (
                <>
                  <div className="card">
                    <div className="card-title">🔬 Forensic Analysis Report</div>
                    <form onSubmit={handleAddAnalysis}>
                      <div className="form-group">
                        <label>Evidence</label>
                        <select className="form-control" value={anForm.evidenceId} onChange={(e) => setAnForm({ ...anForm, evidenceId: e.target.value })}>
                          <option value="">-- Select --</option>
                          {evidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Analysis Type</label>
                        <input className="form-control" placeholder="e.g. DNA, Ballistics, Digital Forensics" value={anForm.analysisType} onChange={(e) => setAnForm({ ...anForm, analysisType: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Findings *</label>
                        <textarea className="form-control" rows={4} value={anForm.findings} onChange={(e) => setAnForm({ ...anForm, findings: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Tools Used</label>
                        <input className="form-control" placeholder="e.g. Autopsy, EnCase, FTK" value={anForm.toolsUsed} onChange={(e) => setAnForm({ ...anForm, toolsUsed: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" checked={anForm.isConfidential} onChange={(e) => setAnForm({ ...anForm, isConfidential: e.target.checked })} style={{ marginRight: "0.4rem" }} />
                          Confidential
                        </label>
                      </div>
                      <button className="btn btn-primary" disabled={loading}>Save Analysis</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-title">📄 Analysis Records</div>
                    {analysis.length === 0 ? <p className="text-muted">No analysis records yet.</p> : analysis.map((a) => (
                      <div key={a.id} style={{ padding: "0.8rem", borderBottom: "1px solid var(--border)" }}>
                        <strong>{a.analysis_type}</strong> — {a.created_at?.slice(0, 10)}<br />
                        <p style={{ margin: "0.4rem 0", fontSize: "0.88rem" }}>{a.findings}</p>
                        <span className="badge badge-info">{a.tools_used}</span>
                        {a.is_confidential && <span className="badge badge-danger" style={{ marginLeft: "0.5rem" }}>Confidential</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── COURT VERIFICATION ────────────────────────── */}
          {activeTab === "Court Verification" && (
            <>
              {!selectedCase && <div className="alert alert-warning">⚠️ Select a case first.</div>}
              {selectedCase && (
                <>
                  <div className="card">
                    <div className="card-title">🏛️ Court Verification Form</div>
                    <form onSubmit={handleAddCourtVerification}>
                      <div className="form-group">
                        <label>Evidence *</label>
                        <select className="form-control" value={courtForm.evidenceId} onChange={(e) => setCourtForm({ ...courtForm, evidenceId: e.target.value })} required>
                          <option value="">-- Select --</option>
                          {evidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Court Name *</label>
                        <input className="form-control" value={courtForm.courtName} onChange={(e) => setCourtForm({ ...courtForm, courtName: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-control" rows={3} value={courtForm.notes} onChange={(e) => setCourtForm({ ...courtForm, notes: e.target.value })} />
                      </div>
                      <button className="btn btn-success" disabled={loading}>Verify &amp; Submit to Blockchain</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-title">📋 Court Verification Records</div>
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Court</th><th>Status</th><th>Date</th><th>TX Hash</th></tr></thead>
                        <tbody>
                          {court.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No verifications yet</td></tr>}
                          {court.map((cv) => (
                            <tr key={cv.id}>
                              <td>{cv.court_name}</td>
                              <td><span className={`badge badge-${cv.verification_status === "approved" ? "success" : "warning"}`}>{cv.verification_status}</span></td>
                              <td>{cv.verified_at?.slice(0, 10)}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{cv.blockchain_tx ? cv.blockchain_tx.slice(0, 16) + "…" : "—"}</td>
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

          {/* ── BLOCKCHAIN ────────────────────────────────── */}
          {activeTab === "Blockchain" && (
            <div className="card">
              <div className="card-title">⛓️ Blockchain Validation</div>
              <div className="alert alert-info">
                Evidence is recorded on-chain when you add evidence or transfer custody. TX hashes are shown in the Evidence and Custody tabs.
              </div>
              <p style={{ marginBottom: "1rem" }}>Contract: <code style={{ background: "#f0f2f5", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{import.meta.env.VITE_CONTRACT_ADDRESS || "Not configured"}</code></p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Connect MetaMask and ensure you are on the correct network (Polygon Amoy testnet) to interact with the smart contract. Role assignment on-chain is managed by the contract owner.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <MetaMaskButton required />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
