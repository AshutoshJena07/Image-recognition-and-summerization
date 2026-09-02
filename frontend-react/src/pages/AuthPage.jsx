import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeDropdown from '../components/Common/ThemeDropdown';
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from '../components/Common/Icons';

export default function AuthPage({ isSignUpDefault = false, navigate }) {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(isSignUpDefault);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await register(cleanEmail, password);
        setSuccessMsg('Account registered successfully! You can now log in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        await login(cleanEmail, password);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Top Bar Actions: Back to Landing & Theme Selector */}
      <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
        <button 
          onClick={() => navigate('#/')} 
          className="toggle-button"
          style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <ArrowLeftIcon size={13} />
          <span>Back to Home</span>
        </button>
      </div>

      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <ThemeDropdown />
      </div>

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <span className="brand-mark-sm" style={{ margin: '0 auto 8px auto', height: '26px', width: '26px', fontSize: '13px' }}>✦</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {isSignUp ? 'Create Workspace' : 'Unlock Workspace'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '3px' }}>
            {isSignUp ? 'Register to sync your private sessions database.' : 'Sign in to access your dashboard runs.'}
          </p>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <AlertTriangleIcon size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircleIcon size={14} />
            <span>{successMsg}</span>
          </div>
        )}


        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Processing transaction...' : isSignUp ? 'Create Account' : 'Authenticate Credentials'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12.5px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          {isSignUp ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <button 
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }} 
                className="auth-link-btn"
                disabled={loading}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              Need a sync profile?{' '}
              <button 
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }} 
                className="auth-link-btn"
                disabled={loading}
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
