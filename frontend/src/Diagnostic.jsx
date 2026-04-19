import React from "react";

export default function Diagnostic() {
  console.log("✅ Diagnostic component loaded");
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>⚖️ ForensicChain</h1>
        
        <div style={{ background: 'rgba(255,255,255,0.9)', color: '#1a3a5c', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>System Status</h2>
          
          <p style={{ marginBottom: '0.8rem' }}>
            <strong>✅ Frontend:</strong> React + Vite loaded successfully
          </p>
          
          <p style={{ marginBottom: '0.8rem' }}>
            <strong>📍 Current URL:</strong> {typeof window !== 'undefined' && window.location.href}
          </p>
          
          <p style={{ marginBottom: '0.8rem' }}>
            <strong>🔌 Data Services:</strong> Supabase + Blockchain configured
          </p>
          
          <hr style={{ margin: '1rem 0', borderColor: '#ddd' }} />
          
          <h3 style={{ marginBottom: '1rem', marginTop: '1rem' }}>Quick Navigation</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/role-selector" style={{ padding: '0.5rem 1rem', background: '#1a3a5c', color: 'white', textDecoration: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              → Role Selector
            </a>
            <a href="/login" style={{ padding: '0.5rem 1rem', background: '#1a3a5c', color: 'white', textDecoration: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              → Login
            </a>
            <a href="/input-test" style={{ padding: '0.5rem 1rem', background: '#1a3a5c', color: 'white', textDecoration: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              → Input Test
            </a>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '1.5rem', marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>🔍 Debug Info</h3>
          <code style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            <pre>{JSON.stringify({
              nodeEnv: typeof process !== 'undefined' && process.env.NODE_ENV,
              platform: typeof navigator !== 'undefined' && navigator.platform,
              userAgent: typeof navigator !== 'undefined' && navigator.userAgent.substring(0, 50),
              timestamp: new Date().toISOString()
            }, null, 2)}</pre>
          </code>
        </div>
      </div>
    </div>
  );
}
