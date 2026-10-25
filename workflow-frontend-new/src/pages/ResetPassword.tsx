
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { WorkflowLogo } from "../components/WorkflowVisual";
import "../index.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }

    if (password.length < 12) {
      setError("Your password must contain at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: password,
      });

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to reset your password. Please request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout reset-layout">
      <section className="auth-main reset-main">
        <header className="auth-header">
          <Link to="/login" className="reset-brand">
            <WorkflowLogo />
            <span>Workflow<span className="reset-brand-accent">Orchestrator</span></span>
          </Link>
        </header>

        <main className="reset-content">
          <div className="reset-card">
            <div className="reset-icon">
              {success ? "✓" : "↻"}
            </div>

            {success ? (
              <div className="reset-success">
                <p className="reset-eyebrow">ALL SET</p>
                <h1>Password updated!</h1>
                <p className="reset-description">
                  Your password has been changed successfully.
                  You can now sign in with your new password.
                </p>
                <Link to="/login" className="reset-submit reset-link-button">
                  Continue to Login <span>→</span>
                </Link>
              </div>
            ) : (
              <>
                <p className="reset-eyebrow">ACCOUNT SECURITY</p>
                <h1>Create a new password</h1>
                <p className="reset-description">
                  Choose a strong password to keep your account secure.
                </p>

                <form className="reset-form" onSubmit={handleSubmit}>
                  <label htmlFor="new-password">New password</label>
                  <div className="reset-input-wrap">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      required
                    />
                    <button
                      type="button"
                      className="reset-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <p className="reset-hint">
                    Use at least 12 characters.
                  </p>

                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="reset-input-wrap">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      required
                    />
                    <button
                      type="button"
                      className="reset-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {error && (
                    <div className="reset-error" role="alert">
                      <span>!</span> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="reset-submit"
                    disabled={loading}
                  >
                    {loading ? "Updating password..." : "Reset Password"}
                    {!loading && <span>→</span>}
                  </button>
                </form>

                <p className="reset-footer">
                  Remember your password? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}
          </div>
          <p className="reset-bottom-note">
            Secure access. Smarter workflows.
          </p>
        </main>
      </section>

      <aside className="reset-visual-panel">
        <div className="reset-visual-copy">
          <span>WORKFLOW ORCHESTRATOR</span>
          <h2>Everything connected.<br />Everything in sync.</h2>
          <p>Manage tasks, streamline dependencies, and keep your workflows moving.</p>
        </div>
      </aside>
    </div>
  );
}
