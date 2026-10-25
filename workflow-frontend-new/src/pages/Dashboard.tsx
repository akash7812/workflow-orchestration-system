
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import "../index.css";

type Workflow = {
  id?: number | string;
  workflowId?: number | string;
  name?: string;
  workflowName?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  latestExecutionAt?: string | null;
  latestExecutionStatus?: string | null;
  [key: string]: unknown;
};

function extractWorkflows(data: unknown): Workflow[] {
  if (Array.isArray(data)) return data as Workflow[];

  if (data && typeof data === "object") {
    const result = data as Record<string, unknown>;

    if (Array.isArray(result.workflows)) {
      return result.workflows as Workflow[];
    }

    if (Array.isArray(result.content)) {
      return result.content as Workflow[];
    }
  }

  return [];
}

function getWorkflowName(workflow: Workflow): string {
  return (
    workflow.name ||
    workflow.workflowName ||
    workflow.title ||
    "Untitled workflow"
  );
}

function getWorkflowId(workflow: Workflow, index: number): number | string {
  return workflow.id ?? workflow.workflowId ?? index;
}

function getWorkflowExecutionStatus(workflow: Workflow): string {
  return String(workflow.latestExecutionStatus ?? "").toUpperCase();
}

function getWorkflowDisplayStatus(workflow: Workflow): string {
  const executionStatus = getWorkflowExecutionStatus(workflow);

  // Show the latest execution status when an execution exists.
  if (executionStatus) return executionStatus;

  // Otherwise show the workflow lifecycle status.
  return String(workflow.status || "DRAFT").toUpperCase();
}

function formatCreatedDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/workflows");
      setWorkflows(extractWorkflows(response.data));
    } catch (err: any) {
      console.error("Failed to load workflows:", err);

      if (
        err?.response?.status === 401 ||
        err?.response?.status === 403
      ) {
        setError("Your session may have expired. Please sign in again.");
      } else {
        setError(
          "Couldn't load workflows. Check that the backend is running and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { replace: true });
      return;
    }

    void loadWorkflows();
  }, [navigate, loadWorkflows]);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  // Count workflows by their LATEST execution status, not lifecycle status.

const statusCounts = workflows.reduce<{
  completed: number;
  failed: number;
}>(
  (counts, workflow) => {
    const status = String(
      workflow.latestExecutionStatus ?? ""
    ).toUpperCase();

    if (status === "COMPLETED") {
      counts.completed += 1;
    } else if (status === "FAILED") {
      counts.failed += 1;
    }

    return counts;
  },
  {
    completed: 0,
    failed: 0,
  }
);


  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/dashboard" className="dashboard-brand">
          <span className="dashboard-brand-icon">⌘</span>
          <span>
            Workflow
            <span className="dashboard-brand-accent">Orchestrator</span>
          </span>
        </Link>

        <p className="dashboard-nav-label">WORKSPACE</p>

        <nav className="dashboard-nav">
          <Link to="/dashboard" className="dashboard-nav-item active">
            <span>▦</span> Overview
          </Link>

          <Link
            to="/dashboard#workflows"
            className="dashboard-nav-item"
          >
            <span>⑂</span> Workflows
          </Link>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-user">
            <div className="dashboard-avatar">U</div>
            <div>
              <strong>My workspace</strong>
              <span>Workflow manager</span>
            </div>
          </div>

          <button className="dashboard-logout" onClick={handleLogout}>
            <span>↪</span> Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">Workspace /</span>
            <strong> Overview</strong>
          </div>

          <button
            className="dashboard-refresh"
            onClick={() => void loadWorkflows()}
            disabled={loading}
          >
            <span>↻</span> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
              <h1>Workflow overview</h1>

              <button
                onClick={() => navigate("/workflows/create")}
                className="create-workflow-button"
              >
                + Create Workflow
              </button>

              <p>Monitor your workflows and keep every task moving.</p>
            </div>

            <div className="dashboard-welcome-icon">⑂</div>
          </div>

          <section
            className="dashboard-stats"
            aria-label="Workflow statistics"
          >
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span>Total workflows</span>
                <span className="dashboard-stat-icon purple">⑂</span>
              </div>

              <strong>{loading ? "—" : workflows.length}</strong>
              <p>Workflows in your workspace</p>
            </article>

            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span>Completed</span>
                <span className="dashboard-stat-icon green">✓</span>
              </div>

              <strong>{loading ? "—" : statusCounts.completed}</strong>
              <p>Workflows whose latest execution completed</p>
            </article>

            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span>Failed</span>
                <span className="dashboard-stat-icon red">!</span>
              </div>

              <strong>{loading ? "—" : statusCounts.failed}</strong>
              <p>Workflows whose latest execution failed</p>
            </article>
          </section>

          <section className="dashboard-workflows" id="workflows">
            <div className="dashboard-section-header">
              <div>
                <h2>Your workflows</h2>
                <p>Workflows returned by your backend.</p>
              </div>

              <span className="dashboard-count">
                {loading ? "Loading..." : `${workflows.length} total`}
              </span>
            </div>

            {error && (
              <div className="dashboard-error" role="alert">
                <span>{error}</span>
                <button onClick={() => void loadWorkflows()}>
                  Try again
                </button>
              </div>
            )}

            {!error && loading && (
              <div className="dashboard-empty">
                <div className="dashboard-loading-icon">↻</div>
                <strong>Loading workflows</strong>
                <p>Connecting to your workspace...</p>
              </div>
            )}

            {!loading && !error && workflows.length === 0 && (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">⑂</div>
                <h3>No workflows yet</h3>
                <p>
                  Your workflows will appear here when they're available.
                </p>

                <button
                  className="dashboard-primary-button"
                  onClick={() => void loadWorkflows()}
                >
                  Refresh workflows
                </button>
              </div>
            )}

            {!loading && !error && workflows.length > 0 && (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workflows.map((workflow, index) => {
                      const workflowId = getWorkflowId(workflow, index);
                      const status = getWorkflowDisplayStatus(workflow);
                      const normalizedStatus = status.toLowerCase();

                      const statusClass =
                        normalizedStatus === "completed" ||
                        normalizedStatus === "success" ||
                        normalizedStatus === "succeeded"
                          ? "completed"
                          : normalizedStatus === "failed" ||
                              normalizedStatus === "error"
                            ? "failed"
                            : "saved";

                      return (
                        <tr key={String(workflowId)}>
                          <td>
                            <div className="workflow-cell">
                              <Link
                                to={`/workflows/${workflowId}`}
                                className="workflow-name-link"
                              >
                                {getWorkflowName(workflow)}
                              </Link>

                              <span className="workflow-id-label">
                                ID: {workflowId}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`dashboard-status ${statusClass}`}
                            >
                              <span className="dashboard-status-dot" />
                              {status}
                            </span>
                          </td>

                          <td>{formatCreatedDate(workflow.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="dashboard-footer">
            <span>Workflow Orchestrator</span>
            <span>Manage dependencies. Simplify execution.</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
