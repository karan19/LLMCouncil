import { useState } from 'react';
import './LoginPage.css';
import { buildLoginUrl, passwordSignIn } from '../auth';

const LoginPage = ({ onLogin }) => {
  const loginUrl = buildLoginUrl();
  const hasHostedUi = Boolean(loginUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!loginUrl) return;
    window.location.href = loginUrl;
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const tokens = await passwordSignIn(username, password);
      onLogin(tokens);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>LLM Council</h1>
        <p>Sign in with your Cognito account to continue.</p>

        {error ? <div className="login-warning">{error}</div> : null}

        {hasHostedUi ? (
          <button className="login-button" onClick={handleLogin}>
            Sign in with Cognito
          </button>
        ) : (
          <form className="login-form" onSubmit={handlePasswordLogin}>
            <label className="login-label">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="login-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
