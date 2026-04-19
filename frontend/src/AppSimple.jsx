import React from "react";

console.log("🚀 App component imported and rendering...");

export default function App() {
  console.log("✅ App component executed");
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a3a5c',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️ ForensicChain</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>App is running!</p>
      
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '8px', maxWidth: '600px' }}>
        <p style={{ marginBottom: '1rem' }}>✓ React is working</p>
        <p style={{ marginBottom: '1rem' }}>✓ Server is responding</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </div>
      
      <div style={{ marginTop: '3rem' }}>
        <a href="/health.html" style={{ color: '#e8a020', textDecoration: 'none', marginRight: '1rem' }}>← Health Check</a>
        <a href="/test.html" style={{ color: '#e8a020', textDecoration: 'none' }}>← Static Test</a>
      </div>
    </div>
  );
}
