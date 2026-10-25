
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import "../index.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      await apiClient.post("/auth/forgot-password", { email });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "We couldn't process your request. Please try again."
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
            <span className="forgot-brand-icon">⌘</span>
            <span>
              Workflow<span className="reset-brand-accent">Orchestrator</span>
            </span>
          </Link>
        </header>

        <main className="reset-content">
          <div className="reset-card">
            <div className="reset-icon">
              {success ? "✓" : "✉"}
            </div>

            {success ? (
              <div className="reset-success">
                <p className="reset-eyebrow">CHECK YOUR EMAIL</p>
                <h1>Check your inbox</h1>
                <p className="reset-description">
                  If an account exists for <strong>{email}</strong>, a
                  password reset link will be sent to that address.
                  Check your inbox and spam folder.
                </p>

                <button
                  type="button"
                  className="reset-submit"
                  onClick={() => {
                    setSuccess(false);
                    setError("");
                  }}
                >
                  Try another email <span>→</span>
                </button>

                <p className="reset-footer">
                  Remember your password? <Link to="/login">Sign in</Link>
                </p>
              </div>
            ) : (
              <>
                <p className="reset-eyebrow">ACCOUNT RECOVERY</p>
                <h1>Forgot your password?</h1>
                <p className="reset-description">
                  No worries. Enter the email address associated with your
                  account and we'll send you a secure reset link.
                </p>

                <form className="reset-form" onSubmit={handleSubmit}>
                  <label htmlFor="forgot-email">Email address</label>

                  <div className="reset-input-wrap">
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
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
                    {loading ? "Sending reset link..." : "Send Reset Link"}
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
          <h2>
            Your workflows.
            <br />
            Your control.
          </h2>
          <p>
            Recover access securely and get back to managing tasks,
            dependencies, and workflow execution.
          </p>
        </div>
      </aside>
    </div>
  );
}
