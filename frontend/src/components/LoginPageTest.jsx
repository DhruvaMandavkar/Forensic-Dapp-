import { useState } from "react";

export default function LoginPageTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Email:", email, "Password:", password);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Login Page Test</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        <button type="submit" style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Login
        </button>
      </form>
    </div>
  );
}