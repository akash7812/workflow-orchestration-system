
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function WorkspaceSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOverview = location.pathname === "/dashboard";

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  return (
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
        <Link
          to="/dashboard"
          className={`dashboard-nav-item ${isOverview ? "active" : ""}`}
        >
          <span>▦</span> Overview
        </Link>

        <Link
          to="/dashboard#workflows"
          className={`dashboard-nav-item ${!isOverview ? "active" : ""}`}
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
  );
}
