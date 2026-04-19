import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, getCurrentUser } from "../services/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser({ email, password });
      const user = await getCurrentUser();
      if (!user) throw new Error("Could not load user profile.");
      if (!user.role) throw new Error("Your account has no role assigned. Please contact support or re-register.");

      const routes = {
        forensic_official: "/dashboard/official",
        police_official:   "/dashboard/police",
        student:           "/dashboard/student",
        public:            "/dashboard/public",
      };
      navigate(routes[user.role] || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">⚖️</div>
        <h2>Welcome Back</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.5rem", textAlign: "center" }}>
          Sign in to ForensicChain
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input
              className="form-control"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="auth-switch mt-2">
          Don't have an account?{" "}
          <Link to="/role-selector">Register here</Link>
        </p>
      </div>
    </div>
  );
}
