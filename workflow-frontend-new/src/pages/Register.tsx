
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import WorkflowVisual, {
  WorkflowLogo,
} from "../components/WorkflowVisual";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState("DESIGNER");
  const [email, setEmail] = useState("");




  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (username.trim().length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/register", {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        });


      setSuccess("Account created successfully. You can now log in.");
    } catch (err: unknown) {
      const responseData =
        typeof err === "object" && err !== null && "response" in err
          ? (
              err as {
                response?: {
                  data?: { message?: string } | string;
                };
              }
            ).response?.data
          : undefined;

      const message =
        typeof responseData === "object" && responseData !== null
          ? responseData.message
          : undefined;

      if (typeof responseData === "string") {
        setError(responseData);
      } else {
        setError(
          message ||
            "Unable to create your account. The username may already exist."
        );
      }
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
          <span className="theme-symbol" aria-hidden="true">
            ☼
          </span>

          <Link to="/login" className="current-page-label">
            Login
          </Link>

          <span className="header-cta">
            Create account
          </span>
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

            <p className="auth-eyebrow">GET STARTED</p>

            <h2>Create your account</h2>

            <p className="card-description">
              Start building, optimizing, and managing your workflows.
            </p>
<label htmlFor="register-role">Select your role</label>

<div className="input-wrap role-select-wrap">
  <span aria-hidden="true">♙</span>
  <select
    id="register-role"
    value={role}
    onChange={(e) => setRole(e.target.value)}
    required
  >
    <option value="ADMIN">Admin</option>
    <option value="DESIGNER">Designer</option>
    <option value="OPERATOR">Operator</option>
    <option value="VIEWER">Viewer</option>
  </select>
</div>

            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="register-username">Username</label>

              <div className="input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="register-username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  minLength={3}
                  required
                />
              </div>




              <label htmlFor="register-password">Password</label>

              <div className="input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <div className="input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

<div className="form-field">
  <label htmlFor="email">Email address</label>

  <div className="input-wrap">
    <span className="input-icon">✉</span>
    <input
      id="email"
      name="email"
      type="email"
      autoComplete="email"
      placeholder="Enter your email address"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />
  </div>
</div>


              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p className="auth-success" role="status">
                  {success}
                </p>
              )}

              {success ? (
                <button
                  className="login-submit"
                  type="button"
                  onClick={() => navigate("/login")}
                >
                  Continue to login <span>→</span>
                </button>
              ) : (
                <button
                  className="login-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                  {!loading && <span>→</span>}
                </button>
              )}
            </form>

            <div className="auth-divider">
              <span />
              <small>OR</small>
              <span />
            </div>

            <p className="signup-prompt">
              Already have an account?
              <Link to="/login">Log in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
