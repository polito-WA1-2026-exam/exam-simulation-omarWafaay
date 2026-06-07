import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    setSubmitting(true);

    const result = await login(username.trim(), password);
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
        <p className="lead">Log in to start playing.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="seed-hint">
          Seed users: <code>player1</code>, <code>player2</code>, <code>player3</code>{' '}
          — password <code>password</code>
        </p>
      </div>
    </div>
  );
}
