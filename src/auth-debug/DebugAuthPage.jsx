/**
 * Debug Auth Page - Manual testing interface for auth flow
 * Only renders when URL contains ?debug-auth
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../auth/store';
import { useDebugAuthLogStore } from './debugAuthLogStore';
import { renderCookieState } from './debugCookieUtils';
import { debugLogin, debugMe, debugRefresh, debugLogout } from './debugAuthHarness';
import { test_fullAuthCycle } from './testHooks';
import { api } from '../lib/api/client';

const ADMIN_EMAIL = 'admin@local.test';
const ADMIN_PASSWORD = 'Admin123!';

export default function DebugAuthPage() {
  const location = useLocation();
  const authStore = useAuthStore();
  const { logs, clearLogs } = useDebugAuthLogStore();
  const [cookieState, setCookieState] = useState(renderCookieState());
  const [meResponse, setMeResponse] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [checklist, setChecklist] = useState(() => {
    const stored = localStorage.getItem('tb_auth_checklist');
    return stored ? JSON.parse(stored) : {
      login: false,
      me: false,
      refresh: false,
      logout: false,
      expiredToken: false,
      refreshFailure: false,
    };
  });

  // Only render if ?debug-auth is in URL
  const shouldRender = location.search.includes('debug-auth');
  
  useEffect(() => {
    if (!shouldRender) return;
    
    // Update cookie state periodically
    const interval = setInterval(() => {
      setCookieState(renderCookieState());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    
    // Auto-fetch /me response
    const fetchMe = async () => {
      setMeLoading(true);
      try {
        const result = await api.get('/api/auth/me');
        setMeResponse({ success: true, data: result });
      } catch (err) {
        setMeResponse({ success: false, error: err.message, status: err.status });
      } finally {
        setMeLoading(false);
      }
    };
    
    fetchMe();
    const interval = setInterval(fetchMe, 3000);
    return () => clearInterval(interval);
  }, [shouldRender]);

  const updateChecklist = (key, value) => {
    const newChecklist = { ...checklist, [key]: value };
    setChecklist(newChecklist);
    localStorage.setItem('tb_auth_checklist', JSON.stringify(newChecklist));
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔐 Auth Debug Page</h1>
      <p style={{ color: '#666' }}>
        This page is only visible when <code>?debug-auth</code> is in the URL.
      </p>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Current Auth State</h2>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '3px' }}>
          {JSON.stringify({
            status: authStore.status,
            user: authStore.user ? { id: authStore.user.id, email: authStore.user.email, role: authStore.user.role } : null,
            error: authStore.error,
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Cookie State</h2>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '3px' }}>
          {JSON.stringify(cookieState, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Live /api/auth/me Response</h2>
        {meLoading && <p>Loading...</p>}
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '3px' }}>
          {JSON.stringify(meResponse, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              try {
                await debugLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
                updateChecklist('login', true);
              } catch (err) {
                console.error('Login failed', err);
              }
            }}
            style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Login (Admin Seeder)
          </button>
          <button
            onClick={async () => {
              try {
                await debugMe();
                updateChecklist('me', true);
              } catch (err) {
                console.error('Me failed', err);
              }
            }}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Call /me
          </button>
          <button
            onClick={async () => {
              try {
                await debugRefresh();
                updateChecklist('refresh', true);
              } catch (err) {
                console.error('Refresh failed', err);
              }
            }}
            style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Refresh Token
          </button>
          <button
            onClick={async () => {
              try {
                await debugLogout();
                updateChecklist('logout', true);
              } catch (err) {
                console.error('Logout failed', err);
              }
            }}
            style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Logout
          </button>
          <button
            onClick={async () => {
              try {
                await test_fullAuthCycle();
              } catch (err) {
                console.error('Full cycle test failed', err);
              }
            }}
            style={{ padding: '10px 20px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Test Full Cycle
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Logging Panel</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>{logs.length} log entries</span>
          <button
            onClick={clearLogs}
            style={{ padding: '5px 10px', background: '#666', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Clear Logs
          </button>
        </div>
        <div style={{ background: '#000', color: '#0f0', padding: '10px', borderRadius: '3px', maxHeight: '400px', overflow: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666' }}>No logs yet. Perform actions above to see logs.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '5px' }}>
                <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleTimeString()}</span> {log.line}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h2>Manual Auth Checklist</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Check off items as you test them. State persists in localStorage.
        </p>
        <div style={{ marginTop: '10px' }}>
          {[
            { key: 'login', label: 'Login succeeds, cookies set' },
            { key: 'me', label: '/me returns user when authenticated' },
            { key: 'refresh', label: 'Refresh rotates tokens successfully' },
            { key: 'logout', label: 'Logout clears cookies and state' },
            { key: 'expiredToken', label: 'Expired token triggers automatic refresh' },
            { key: 'refreshFailure', label: 'Refresh failure does not loop infinitely' },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: 'block', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={checklist[key] || false}
                onChange={(e) => updateChecklist(key, e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

