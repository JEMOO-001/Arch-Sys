import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkServer = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiBase}/health`);
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: unknown) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      fontFamily: "'Segoe UI', sans-serif",
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        background: 'rgba(22,27,34,0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '44px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(56,189,248,0.15)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-1px',
          left: '20%',
          right: '20%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)'
        }} />
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(34,211,238,0.1)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            border: '2px solid rgba(34,211,238,0.3)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#22d3ee">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ color: '#f0f9ff', fontSize: '26px', fontWeight: 700, letterSpacing: '2px', margin: 0 }}>SENTINEL</h1>
          <p style={{ color: '#22d3ee', fontSize: '13px', marginTop: '5px', letterSpacing: '1px' }}>Enterprise GIS Archiving</p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          padding: '13px',
          borderRadius: '10px',
          background: serverOnline === false ? 'rgba(248,113,113,0.08)' : 'rgba(34,211,238,0.08)',
          border: `1px solid ${serverOnline === false ? 'rgba(248,113,113,0.15)' : 'rgba(34,211,238,0.15)'}`
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: serverOnline === false ? '#f87171' : '#22d3ee',
            boxShadow: serverOnline === false ? '0 0 12px #f87171' : '0 0 12px #22d3ee'
          }} />
          <span style={{
            color: serverOnline === false ? '#f87171' : '#22d3ee',
            fontSize: '13px'
          }}>
            {serverOnline === null ? 'Checking server status...' : serverOnline ? 'Server is Online' : 'Server is Offline'}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '15px 17px',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: '10px',
                background: 'rgba(13,17,23,0.6)',
                color: '#f0f9ff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '15px 17px',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: '10px',
                background: 'rgba(13,17,23,0.6)',
                color: '#f0f9ff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '17px',
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s',
              marginTop: '12px',
              letterSpacing: '1px'
            }}
          >
            {loading ? 'CONNECTING...' : 'CONNECT'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#484f58' }}>
          Sentinel v1.0 | Cyan Frost
        </div>
      </div>
    </div>
  );
};