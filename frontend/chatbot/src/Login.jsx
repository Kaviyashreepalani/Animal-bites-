import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in: ' + err.message);
    }

    setLoading(false);
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with Google: ' + err.message);
    }
    setLoading(false);
  }

  async function handleGithubSignIn() {
    try {
      setError('');
      setLoading(true);
      await signInWithGithub();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with GitHub: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Welcome Back
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Sign in to your Bite Line account
          </p>
        </div>

        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              color: '#374151',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              color: '#374151',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s',
              marginBottom: '1.5rem'
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          <span style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
            OR CONTINUE WITH
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = 'white';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <button
            onClick={handleGithubSignIn}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = 'white';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1f2937">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Don't have an account?{' '}
          </span>
          <Link 
            to="/signup" 
            style={{ 
              color: '#667eea', 
              fontWeight: '700',
              textDecoration: 'none',
              fontSize: '0.95rem'
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}