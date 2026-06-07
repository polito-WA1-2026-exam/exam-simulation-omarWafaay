import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!trimmed || !password) {
      setError('Please enter username and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(trimmed, password);
    setSubmitting(false);

    if (!result.ok) {
      setError('Invalid username or password.');
      return;
    }
    navigate('/game');
  }

  return (
    <div className="page login-page">
      <div className="login-card">
        <h1>Welcome to Last Race!</h1>
        <p className="lead">Plan your route. Beat the clock. Beat your best score.</p>
        <p className="login-sub">Log in with your account to play.</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="seed-hint">
          Demo accounts: <code>player1</code>, <code>player2</code>, <code>player3</code>{' '}
          — password <code>password</code>
        </p>

        <p className="login-back">
          <Link to="/">Back to instructions</Link>
        </p>
      </div>
    </div>
  );
}
