import { useState } from "react";
import { login, signup, saveToken } from "./api";
import "./Login.css";

function EyeIcon({ off }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  if (off) {
    return (
      <svg {...common}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isSignup) {
        await signup(email, password, fullName);
        // Account created: go back to the login form and ask the user to log in
        setMode("login");
        setPassword("");
        setFullName("");
        setShowPassword(false);
        setSuccess("Account created successfully. Please log in.");
        setLoading(false);
        return;
      }
      const result = await login(email, password);
      saveToken(result.access_token);
      onLoggedIn(result.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError(null);
    setSuccess(null);
    setPassword("");
    setShowPassword(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Complaints Desk</h1>
        <p className="auth-tagline">AI powered complaint handling for banks</p>
        <p className="auth-subtitle">
          {isSignup ? "Create your account" : "Log in to continue"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="auth-field">
              <label htmlFor="full-name">Full name (optional)</label>
              <input
                id="full-name"
                className="auth-input"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-password">
              <input
                id="password"
                className="auth-input"
                type={showPassword ? "text" : "password"}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {success && <div className="auth-message auth-success">{success}</div>}
          {error && <div className="auth-message auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account? " : "New here? "}
          <button type="button" className="auth-link" onClick={switchMode}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;