
export function WorkflowLogo() {
  return (
    <svg
      viewBox="0 0 40 40"
      width="40"
      height="40"
      fill="none"
      aria-label="Workflow Orchestrator logo"
      role="img"
    >
      <rect width="40" height="40" rx="12" fill="#111114" />
      <path
        d="M12 12H20V20H28M20 20V28H28"
        stroke="#A99AFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
      <circle cx="28" cy="20" r="3" fill="#FFFFFF" />
      <circle cx="28" cy="28" r="3" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="3" fill="#A99AFF" />
    </svg>
  );
}

export default function WorkflowVisual() {
  return (
    <section className="workflow-visual">
      <div className="workflow-glow" />

      <div className="workflow-heading">
        <span className="workflow-badge">
          <span className="badge-dot" />
          WORKFLOW ORCHESTRATOR
        </span>

        <h1>
          Build Smarter
          <br />
          <span>Workflows</span>
        </h1>

        <p className="workflow-intro">
          Design, optimize and execute complex workflows
          with intelligent dependency management.
          Turn ideas into efficient execution.
        </p>
      </div>

      <div className="workflow-graph">
        <div className="workflow-node node-start">
          <span className="node-icon purple-icon">▶</span>
          <div>
            <strong>Start</strong>
            <small>Initialize workflow</small>
          </div>
          <span className="node-status">✓</span>
        </div>

        <div className="graph-connector">↓</div>

        <div className="workflow-node node-data">
          <span className="node-icon">▤</span>
          <div>
            <strong>Data Processing</strong>
            <small>Process input data</small>
          </div>
          <span className="node-status">✓</span>
        </div>

        <div className="graph-branch">
          <span className="branch-line" />
          <span className="branch-left">↙</span>
          <span className="branch-right">↘</span>
        </div>

        <div className="workflow-branches">
          <div className="workflow-node branch-node">
            <span className="node-icon">⚙</span>
            <div>
              <strong>Model Training</strong>
              <small>Train ML model</small>
            </div>
            <span className="node-running" />
          </div>

          <div className="workflow-node branch-node">
            <span className="node-icon">▥</span>
            <div>
              <strong>Evaluation</strong>
              <small>Evaluate results</small>
            </div>
            <span className="node-pending" />
          </div>
        </div>

        <div className="graph-merge">↓</div>

        <div className="workflow-node node-report">
          <span className="node-icon">▤</span>
          <div>
            <strong>Generate Report</strong>
            <small>Create final report</small>
          </div>
          <span className="node-pending" />
        </div>
      </div>

      <div className="workflow-features">
        <div className="feature-item">
          <span className="feature-icon">ϟ</span>
          <div>
            <strong>Visual Workflow Builder</strong>
            <p>Create and manage tasks with dependencies easily</p>
          </div>
        </div>

        <div className="feature-item">
          <span className="feature-icon">◇</span>
          <div>
            <strong>Smart Dependency Optimization</strong>
            <p>Get the most efficient execution order</p>
          </div>
        </div>

        <div className="feature-item">
          <span className="feature-icon">▥</span>
          <div>
            <strong>Real-time Execution</strong>
            <p>Monitor progress and identify bottlenecks</p>
          </div>
        </div>

        <div className="feature-item">
          <span className="feature-icon">♧</span>
          <div>
            <strong>Collaboration Ready</strong>
            <p>Work together and keep projects on track</p>
          </div>
        </div>
      </div>

      <div className="workflow-metrics">
        <div className="metric-card">
          <span>Execution Time</span>
          <strong>12m 36s <small>↓ 23%</small></strong>
          <div className="metric-chart">
            <svg viewBox="0 0 220 55" preserveAspectRatio="none">
              <path
                d="M0 44 C25 30, 35 50, 60 35 S100 45, 125 25 S165 40, 190 14 S210 17, 220 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <span>Tasks Completed</span>
          <strong>8 / 10</strong>
          <div className="progress-track">
            <div className="progress-value" />
          </div>
        </div>
      </div>
    </section>
  );
}
