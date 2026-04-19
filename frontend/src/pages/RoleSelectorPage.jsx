import { useNavigate } from "react-router-dom";
import "../styles/role-selector.css";

const roles = [
  {
    key: "forensic_official",
    icon: "🔬",
    label: "Forensic Official",
    description: "Full access — evidence, analysis, blockchain verification",
    badge: "Full Access",
    badgeClass: "",
    cardClass: "role-forensic",
  },
  {
    key: "police_official",
    icon: "🚔",
    label: "Police Official",
    description: "Read-only access to cases, evidence and custody chain",
    badge: "Restricted",
    badgeClass: "badge-restricted",
    cardClass: "",
  },
  {
    key: "student",
    icon: "🎓",
    label: "Forensic Student",
    description: "Limited academic access to non-confidential data",
    badge: "Limited",
    badgeClass: "badge-limited",
    cardClass: "",
  },
];

export default function RoleSelectorPage() {
  const navigate = useNavigate();

  return (
    <div className="role-selector-page">
      {/* Header */}
      <div className="role-selector-header">
        <div className="role-selector-emblem">
          <span className="role-selector-emblem-line" />
          <span className="role-selector-emblem-icon">⚖️</span>
          <span className="role-selector-emblem-line" />
        </div>

        <h1 className="role-selector-title">
          Forensic<span>Chain</span>
        </h1>

        <p className="role-selector-sub">
          Blockchain-Based Digital Forensic Evidence Management
        </p>

        <div className="role-selector-divider" />

        <p className="role-selector-instruction">
          Select your role to create an account
        </p>
      </div>

      {/* Role Cards */}
      <div className="role-grid">
        {roles.map((role) => (
          <div
            key={role.key}
            className={`role-card ${role.cardClass}`}
            onClick={() => navigate(`/register/${role.key}`)}
          >
            <div className="role-icon-wrap">
              <span className="role-icon">{role.icon}</span>
            </div>
            <h3>{role.label}</h3>
            <p>{role.description}</p>
            <span className={`role-badge ${role.badgeClass}`}>
              {role.badge}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="role-selector-footer">
        <p>
          Already have an account?{" "}
          <span className="login-link" onClick={() => navigate("/login")}>
            Login here
          </span>
        </p>
      </div>

      <div className="role-selector-notice">
        Secured by Blockchain Technology
      </div>
    </div>
  );
}
