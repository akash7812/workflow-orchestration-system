
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
// import WorkflowVisual from "../components/WorkflowVisual";
import WorkflowVisual, { WorkflowLogo } from "../components/WorkflowVisual";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", {
        username,
        password,
      });

      const token = response.data.token;

      if (!token) {
        throw new Error("The server did not return an authentication token.");
      }

      // Keep the existing token key expected by the app.
      // This preserves compatibility with the current API client.
      localStorage.setItem("token", token);

      // The current application uses localStorage for its token.
      // The remember option is visual until session-based auth is implemented.
      void remember;

      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;

      setError(
        message || "Unable to log in. Check your username and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <header className="auth-header">
        <Link to="/login" className="auth-brand">
          <WorkflowLogo />
          <span>Workflow Orchestrator</span>
        </Link>

        <nav className="header-links" aria-label="Main navigation">
          <a href="#workflow-features">Features⌄</a>
          <a href="#workflow-features">Benefits</a>
          <a href="#workflow-metrics">Pricing</a>
          <a href="#workflow-features">Docs</a>
        </nav>

        <div className="header-actions">
          <span className="theme-symbol" aria-hidden="true">☼</span>
          <span className="current-page-label">Login</span>
          <Link className="header-cta" to="/register">
            Get started <span>→</span>
          </Link>
        </div>
      </header>

      <div className="auth-main">
        <WorkflowVisual />

        <section className="login-panel">
          <div className="login-card">
            <Link to="/login" className="card-brand">
              <WorkflowLogo />
              <span>Workflow Orchestrator</span>
            </Link>

            <p className="auth-eyebrow">WELCOME BACK</p>
            <h2>Log in to your account</h2>
            <p className="card-description">
              Continue building and managing your workflows.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="username">Username</label>
              <div className="input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="login-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
                {!loading && <span>→</span>}
              </button>
            </form>

            <div className="auth-divider">
              <span />
              <small>OR</small>
              <span />
            </div>

            <p className="social-login-note">
              Sign in using your Workflow Orchestrator account.
            </p>

            <p className="signup-prompt">
              Don't have an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
