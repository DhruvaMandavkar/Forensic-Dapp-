import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Diagnostic from "./Diagnostic";
import RoleSelectorPage from "./pages/RoleSelectorPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LoginPageTest from "./components/LoginPageTest";
import OfficialDashboard from "./pages/OfficialDashboard";
import PoliceDashboard from "./pages/PoliceDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import PublicDashboard from "./pages/PublicDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import InputTest from "./components/InputTest";

import { testSupabaseConnection } from "./services/supabase";

export default function App() {
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [appError, setAppError] = useState(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        const isConnected = await testSupabaseConnection();

        if (isConnected) {
          console.log("✅ Supabase is connected.");
        } else {
          console.warn(
            "⚠️ Supabase connection failed - app will work with limited functionality."
          );
        }
      } catch (err) {
        console.warn("⚠️ Could not connect to Supabase:", err.message);
      } finally {
        setConnectionChecked(true);
      }
    }

    checkConnection().catch((err) => {
      console.error("Error in App setup:", err);
      setAppError(err.message);
      setConnectionChecked(true);
    });
  }, []);

  if (!connectionChecked) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)",
          color: "#fff",
          fontSize: "1.2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚖️</div>
          <p>Loading ForensicChain...</p>
        </div>
      </div>
    );
  }

  if (appError) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)",
          color: "#fff",
          flexDirection: "column",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h2>Application Error</h2>
        <p
          style={{
            marginTop: "1rem",
            color: "#ffd9b3",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          {appError}
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "2rem",
            padding: "0.5rem 1.5rem",
            background: "#e8a020",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Diagnostic */}
        <Route path="/diagnostic" element={<Diagnostic />} />

        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/role-selector" replace />} />
        <Route path="/role-selector" element={<RoleSelectorPage />} />
        <Route path="/register/:role" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-test" element={<LoginPageTest />} />

        {/* Protected Dashboards */}
        <Route
          path="/dashboard/official"
          element={
            <ProtectedRoute allowedRoles={["forensic_official"]} requireWallet>
              <OfficialDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/police"
          element={
            <ProtectedRoute allowedRoles={["police_official"]}>
              <PoliceDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/public"
          element={
            <ProtectedRoute allowedRoles={["public"]}>
              <PublicDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/input-test" element={<InputTest />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}