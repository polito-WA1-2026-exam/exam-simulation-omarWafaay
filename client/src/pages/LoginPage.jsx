import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

const DEMO_USERS = ['Omar', 'Paolo', 'Francesca', 'Alice', 'Marco', 'Giulia'];

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

  function fillDemo(name) {
    setUsername(name);
    setPassword('password');
    setError('');
  }

  return (
    <div className="page login-page">
      <div className="panel login-card">
        <h1>Last Race</h1>
        <p className="lead">Plan your route. Beat the clock. Beat your best score.</p>

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

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <div className="panel demo-box">
          <p className="demo-box-title">Demo accounts</p>
          <p className="demo-box-hint">Password for all: <code>password</code></p>
          <div className="demo-box-users">
            {DEMO_USERS.map((name) => (
              <button
                key={name}
                type="button"
                className="btn-demo"
                onClick={() => fillDemo(name)}
                disabled={submitting}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <p className="login-back">
          <Link to="/">Back to instructions</Link>
        </p>
      </div>
    </div>
  );
}
