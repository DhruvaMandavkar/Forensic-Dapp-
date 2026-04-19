import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/supabase";
import MetaMaskButton from "../components/MetaMaskButton";

const ROLE_LABELS = {
  forensic_official: "🔬 Forensic Official",
  police_official:   "🚔 Police Official",
  student:           "🎓 Forensic Student",
  public:            "🌐 Public User",
};

// ── Sub-forms defined OUTSIDE the parent component ───────────────
// This is the critical fix: if they were defined inside, React would
// unmount + remount them on every keystroke, clearing what you typed.

function ForensicForm({ form, handleChange, wallet, setWallet, onFileChange }) {
  return (
    <>
      <div className="form-group">
        <label>Full Name *</label>
        <input
          className="form-control"
          value={form.full_name || ""}
          onChange={handleChange("full_name")}
          required
        />
      </div>
      <div className="form-group">
        <label>Official Email *</label>
        <input
          className="form-control"
          type="email"
          value={form.email || ""}
          onChange={handleChange("email")}
          required
        />
      </div>
      <div className="form-group">
        <label>Organization / Lab Name *</label>
        <input
          className="form-control"
          value={form.organization || ""}
          onChange={handleChange("organization")}
          required
        />
      </div>
      <div className="form-group">
        <label>MetaMask Wallet Address</label>
        <MetaMaskButton onConnect={(addr) => setWallet(addr)} required />
        {wallet && <p className="form-hint">Connected: {wallet}</p>}
      </div>
      <div className="form-group">
        <label>Official ID Document</label>
        <input className="form-control" type="file" accept=".pdf,.jpg,.png" onChange={(e) => onFileChange("forensic", e)} />
        <p className="form-hint">{form.forensic_file ? `Selected: ${form.forensic_file.name}` : "Upload your official ID document"}</p>
      </div>
      <div className="form-group">
        <label>Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.password || ""}
          onChange={handleChange("password")}
          required
          minLength={8}
        />
      </div>
      <div className="form-group">
        <label>Confirm Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.confirm_password || ""}
          onChange={handleChange("confirm_password")}
          required
        />
      </div>
    </>
  );
}

function PoliceForm({ form, handleChange, onFileChange }) {
  return (
    <>
      <div className="form-group">
        <label>Full Name *</label>
        <input
          className="form-control"
          value={form.full_name || ""}
          onChange={handleChange("full_name")}
          required
        />
      </div>
      <div className="form-group">
        <label>Badge Number *</label>
        <input
          className="form-control"
          value={form.badge_number || ""}
          onChange={handleChange("badge_number")}
          required
        />
      </div>
      <div className="form-group">
        <label>Department Name *</label>
        <input
          className="form-control"
          value={form.department_name || ""}
          onChange={handleChange("department_name")}
          required
        />
      </div>
      <div className="form-group">
        <label>Official Email *</label>
        <input
          className="form-control"
          type="email"
          value={form.email || ""}
          onChange={handleChange("email")}
          required
        />
      </div>
      <div className="form-group">
        <label>ID Proof Document</label>
        <input className="form-control" type="file" accept=".pdf,.jpg,.png" onChange={(e) => onFileChange("police", e)} />
        <p className="form-hint">{form.police_file ? `Selected: ${form.police_file.name}` : "Upload your ID proof document"}</p>
      </div>
      <div className="form-group">
        <label>Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.password || ""}
          onChange={handleChange("password")}
          required
          minLength={8}
        />
      </div>
      <div className="form-group">
        <label>Confirm Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.confirm_password || ""}
          onChange={handleChange("confirm_password")}
          required
        />
      </div>
    </>
  );
}

function StudentForm({ form, handleChange }) {
  return (
    <>
      <div className="form-group">
        <label>Full Name *</label>
        <input
          className="form-control"
          value={form.full_name || ""}
          onChange={handleChange("full_name")}
          required
        />
      </div>
      <div className="form-group">
        <label>College Name *</label>
        <input
          className="form-control"
          value={form.college_name || ""}
          onChange={handleChange("college_name")}
          required
        />
      </div>
      <div className="form-group">
        <label>Student ID *</label>
        <input
          className="form-control"
          value={form.student_id || ""}
          onChange={handleChange("student_id")}
          required
        />
      </div>
      <div className="form-group">
        <label>
          College Email *{" "}
          <span className="form-hint">(must be a .edu or .ac. address)</span>
        </label>
        <input
          className="form-control"
          type="email"
          value={form.email || ""}
          onChange={handleChange("email")}
          required
        />
      </div>
      <div className="form-group">
        <label>Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.password || ""}
          onChange={handleChange("password")}
          required
          minLength={8}
        />
      </div>
      <div className="form-group">
        <label>Confirm Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.confirm_password || ""}
          onChange={handleChange("confirm_password")}
          required
        />
      </div>
    </>
  );
}

function PublicForm({ form, handleChange }) {
  return (
    <>
      <div className="form-group">
        <label>Full Name *</label>
        <input
          className="form-control"
          value={form.full_name || ""}
          onChange={handleChange("full_name")}   // fixed: was set() which doesn't exist
          required
        />
      </div>
      <div className="form-group">
        <label>Email *</label>
        <input
          className="form-control"
          type="email"
          value={form.email || ""}
          onChange={handleChange("email")}        // fixed: was set() which doesn't exist
          required
        />
      </div>
      <div className="form-group">
        <label>Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.password || ""}
          onChange={handleChange("password")}     // fixed: was set() which doesn't exist
          required
          minLength={8}
        />
      </div>
      <div className="form-group">
        <label>Confirm Password *</label>
        <input
          className="form-control"
          type="password"
          value={form.confirm_password || ""}
          onChange={handleChange("confirm_password")} // fixed: was set() which doesn't exist
          required
        />
      </div>
    </>
  );
}

// ── Main RegisterPage component ───────────────────────────────────

export default function RegisterPage() {
  const { role }    = useParams();
  const navigate    = useNavigate();

  const [form, setForm]       = useState({});
  const [wallet, setWallet]   = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Single handleChange used by all sub-forms
  function handleChange(field) {
    return (e) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  // File change handler
  function handleFileChange(fileType, e) {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, [`${fileType}_file`]: file }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "student") {
      const eduDomains = [".edu", ".ac.", ".edu.in", ".ac.uk", ".edu.au"];
      const isEdu = eduDomains.some((d) => form.email?.includes(d));
      if (!isEdu) {
        setError("Students must register with a college/university email address.");
        return;
      }
    }

    setLoading(true);
    try {
      await registerUser({
        email:           form.email,
        password:        form.password,
        full_name:       form.full_name,
        role,
        organization:    form.organization    || null,
        badge_number:    form.badge_number    || null,
        department_name: form.department_name || null,
        college_name:    form.college_name    || null,
        student_id:      form.student_id      || null,
        wallet_address:  wallet               || null,
      });

      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ROLE_LABELS[role]) {
    return (
      <div className="auth-page">
        <div className="auth-box">
          <h2>Invalid role</h2>
          <Link to="/">← Back to home</Link>
        </div>
      </div>
    );
  }

  // Render the correct sub-form based on role
  function renderForm() {
    switch (role) {
      case "forensic_official":
        return (
          <ForensicForm
            form={form}
            handleChange={handleChange}
            wallet={wallet}
            setWallet={setWallet}
            onFileChange={handleFileChange}
          />
        );
      case "police_official":
        return <PoliceForm form={form} handleChange={handleChange} onFileChange={handleFileChange} />;
      case "student":
        return <StudentForm form={form} handleChange={handleChange} />;
      case "public":
        return <PublicForm form={form} handleChange={handleChange} />;
      default:
        return null;
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">🔐</div>
        <h2>Register as {ROLE_LABELS[role]}</h2>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {renderForm()}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Registering…" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Login here</Link>
        </p>
        <p className="auth-switch mt-1">
          <Link to="/">← Choose different role</Link>
        </p>
      </div>
    </div>
  );
}
