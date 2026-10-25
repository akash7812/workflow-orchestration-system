import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import WorkflowGraph from "../components/WorkflowGraph";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import "../index.css";

type Workflow = {
  id?: number;
  name?: string;
  description?: string;
};

type Task = {
  id: number;
  name: string;
  description: string;
  estimatedDuration: number | null;
  taskType: "MANUAL" | "AUTOMATED";
  incomingDependencyIds?: number[];
  outgoingDependencyIds?: number[];
};

type TaskRun = {
  taskRunId: number;
  workflowRunId: number;
  taskId: number;
  taskName: string;
  taskType: "MANUAL" | "AUTOMATED";
  status:
    | "PENDING"
    | "READY"
    | "RUNNING"
    | "WAITING_FOR_USER"
    | "COMPLETED"
    | "FAILED";
  startedAt: string | null;
  endedAt: string | null;
  errorMessage: string | null;
};

type WorkflowRun = {
  workflowRunId: number;
  workflowId: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

type Dependency = {
  id: number;
  sourceTask: number;
  targetTask: number;
};

type WorkflowValidation = {
  valid: boolean;
  message: string;
};

type ExecutionOrder = {
  workflowId: number;
  message: string;
  orderedTaskIds: number[];
};

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreateMode = !id || id === "create";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflowId, setWorkflowId] = useState<number | null>(
    isCreateMode ? null : Number(id)
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [duration, setDuration] = useState("10");
  const [taskType, setTaskType] =
    useState<"MANUAL" | "AUTOMATED">("MANUAL");

  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [sourceTaskId, setSourceTaskId] = useState("");
  const [targetTaskId, setTargetTaskId] = useState("");

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [addingDependency, setAddingDependency] = useState(false);
  const [checkingWorkflow, setCheckingWorkflow] = useState(false);
  const [executing, setExecuting] = useState(false);

  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [currentWorkflowRunId, setCurrentWorkflowRunId] =
    useState<number | null>(null);
  const [loadingTaskRuns, setLoadingTaskRuns] = useState(false);
  const [completingTaskRunId, setCompletingTaskRunId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [validation, setValidation] =
    useState<WorkflowValidation | null>(null);
  const [executionOrder, setExecutionOrder] =
    useState<ExecutionOrder | null>(null);

  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showDependencyManager, setShowDependencyManager] =
    useState(false);

  function clearValidation() {
    setValidation(null);
    setExecutionOrder(null);
  }

  const loadTasks = useCallback(async (currentId: number) => {
    const response = await apiClient.get<Task[]>(
      `/workflows/${currentId}/tasks`
    );
    setTasks(response.data);
  }, []);

  const loadDependencies = useCallback(async (currentId: number) => {
    const response = await apiClient.get<Dependency[]>(
      `/workflows/${currentId}/dependencies`
    );
    setDependencies(response.data);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { replace: true });
      return;
    }

    if (isCreateMode) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWorkflow() {
      setLoading(true);
      setError("");

      try {
        const response = await apiClient.get<Workflow>(
          `/workflows/${id}`
        );

        if (cancelled) return;

        const currentId = response.data.id ?? Number(id);

        setName(response.data.name ?? "");
        setDescription(response.data.description ?? "");
        setWorkflowId(currentId);

        const [taskResponse, dependencyResponse] = await Promise.all([
          apiClient.get<Task[]>(`/workflows/${currentId}/tasks`),
          apiClient.get<Dependency[]>(
            `/workflows/${currentId}/dependencies`
          ),
        ]);

        if (cancelled) return;

        setTasks(taskResponse.data);
        setDependencies(dependencyResponse.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ??
              "Could not load the workflow."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWorkflow();

    return () => {
      cancelled = true;
    };
  }, [id, isCreateMode, navigate]);

  async function saveWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim()) {
      setError("Enter a workflow name.");
      return;
    }

    setSaving(true);

    try {
      if (workflowId === null) {
        const response = await apiClient.post<Workflow>("/workflows", {
          name: name.trim(),
          description: description.trim(),
        });

        const createdId = response.data.id;

        if (createdId == null) {
          setError("The saved workflow did not return an ID.");
          return;
        }

        setWorkflowId(createdId);
        navigate(`/workflows/${createdId}`, { replace: true });
      } else {
        await apiClient.put(`/workflows/${workflowId}`, {
          name: name.trim(),
          description: description.trim(),
        });

        setNotice("Workflow saved successfully.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Could not save the workflow."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (workflowId === null) {
      setError("Save the workflow before adding tasks.");
      return;
    }

    if (!taskName.trim() || !taskDescription.trim()) {
      setError("Enter both the task name and description.");
      return;
    }

    const estimatedDuration = Number(duration);

    if (!Number.isFinite(estimatedDuration) || estimatedDuration < 0) {
      setError("Duration must be zero or greater.");
      return;
    }

    setAddingTask(true);

    try {
      await apiClient.post(`/workflows/${workflowId}/tasks`, {
        name: taskName.trim(),
        description: taskDescription.trim(),
        estimatedDuration,
        taskType,
      });

      await loadTasks(workflowId);
      await loadDependencies(workflowId);
      clearValidation();

      setTaskName("");
      setTaskDescription("");
      setDuration("10");
      setTaskType("MANUAL");
      setNotice("Task added successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Could not add the task."
      );
    } finally {
      setAddingTask(false);
    }
  }

  async function deleteTask(taskId: number) {
    if (workflowId === null) return;
    if (!window.confirm("Delete this task?")) return;

    setError("");
    setNotice("");

    try {
      await apiClient.delete(
        `/workflows/${workflowId}/tasks/${taskId}`
      );

      await loadTasks(workflowId);
      await loadDependencies(workflowId);
      clearValidation();

      setNotice("Task deleted successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not delete the task. Check its dependencies."
      );
    }
  }

  async function addDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (workflowId === null) {
      setError("Save the workflow before adding dependencies.");
      return;
    }

    if (!sourceTaskId || !targetTaskId) {
      setError("Select both tasks.");
      return;
    }

    if (sourceTaskId === targetTaskId) {
      setError("A task cannot depend on itself.");
      return;
    }

    const sourceId = Number(sourceTaskId);
    const targetId = Number(targetTaskId);

    if (
      dependencies.some(
        (dependency) =>
          dependency.sourceTask === sourceId &&
          dependency.targetTask === targetId
      )
    ) {
      setError("This dependency already exists.");
      return;
    }

    setAddingDependency(true);

    try {
      await apiClient.post(`/workflows/${workflowId}/dependencies`, {
        sourceTaskId: sourceId,
        targetTaskId: targetId,
      });

      await loadDependencies(workflowId);
      await loadTasks(workflowId);
      clearValidation();

      setSourceTaskId("");
      setTargetTaskId("");
      setNotice("Dependency added successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not add the dependency."
      );
    } finally {
      setAddingDependency(false);
    }
  }

  async function deleteDependency(dependencyId: number) {
    if (workflowId === null) return;

    setError("");
    setNotice("");

    try {
      await apiClient.delete(
        `/workflows/${workflowId}/dependencies/${dependencyId}`
      );

      await loadDependencies(workflowId);
      await loadTasks(workflowId);
      clearValidation();

      setNotice("Dependency removed successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not remove the dependency."
      );
    }
  }

  async function validateWorkflow() {
    if (workflowId === null) return;

    setError("");
    setNotice("");
    setCheckingWorkflow(true);
    clearValidation();

    try {
      if (tasks.length === 0) {
        setValidation({
          valid: false,
          message: "Add at least one task before validating.",
        });
        return;
      }

      const response = await apiClient.get<WorkflowValidation>(
        `/workflows/${workflowId}/validate`
      );

      setValidation(response.data);

      if (!response.data.valid) return;

      const orderResponse = await apiClient.get<ExecutionOrder>(
        `/workflows/${workflowId}/execution-order`
      );

      const order = orderResponse.data;

      if (
        !Array.isArray(order.orderedTaskIds) ||
        order.orderedTaskIds.length !== tasks.length ||
        !tasks.every((task) => order.orderedTaskIds.includes(task.id))
      ) {
        setValidation({
          valid: false,
          message:
            order.message || "A complete execution order was not returned.",
        });
        return;
      }

      setExecutionOrder(order);
      setNotice("Workflow validated successfully.");
    } catch (err: any) {
      setValidation({
        valid: false,
        message:
          err?.response?.data?.message ??
          "Could not validate the workflow.",
      });
    } finally {
      setCheckingWorkflow(false);
    }
  }

  async function loadTaskRuns(runId: number) {
    setLoadingTaskRuns(true);

    try {
      const response = await apiClient.get<TaskRun[]>(
        `/workflow-runs/${runId}/task-runs`
      );

      setTaskRuns(response.data);
      setError("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not load execution progress."
      );
    } finally {
      setLoadingTaskRuns(false);
    }
  }

  async function completeManualTask(taskRunId: number) {
    setError("");
    setNotice("");
    setCompletingTaskRunId(taskRunId);

    try {
      await apiClient.post(
        `/workflows/task-runs/${taskRunId}/complete`
      );

      if (currentWorkflowRunId !== null) {
        await loadTaskRuns(currentWorkflowRunId);
      }

      setNotice("Manual task completed successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not complete the manual task."
      );
    } finally {
      setCompletingTaskRunId(null);
    }
  }

  async function executeWorkflow() {
    if (workflowId === null) return;

    if (tasks.length === 0) {
      setError("Add at least one task before executing.");
      return;
    }

    setError("");
    setNotice("");
    setExecuting(true);

    try {
      const response = await apiClient.get<WorkflowValidation>(
        `/workflows/${workflowId}/validate`
      );

      setValidation(response.data);

      if (!response.data.valid) {
        setExecutionOrder(null);
        setError(response.data.message || "Workflow validation failed.");
        return;
      }

      const orderResponse = await apiClient.get<ExecutionOrder>(
        `/workflows/${workflowId}/execution-order`
      );

      const order = orderResponse.data;

      if (
        !Array.isArray(order.orderedTaskIds) ||
        order.orderedTaskIds.length !== tasks.length ||
        !tasks.every((task) => order.orderedTaskIds.includes(task.id))
      ) {
        setExecutionOrder(null);
        setError("Could not generate a complete execution order.");
        return;
      }

      setExecutionOrder(order);

      await apiClient.post(`/workflows/${workflowId}/execute`);

      const runsResponse = await apiClient.get<WorkflowRun[]>(
        `/workflow-runs/${workflowId}/runs`
      );

      if (runsResponse.data.length === 0) {
        setCurrentWorkflowRunId(null);
        setTaskRuns([]);
        setError("Execution started, but no workflow run was returned.");
        return;
      }

      // The backend response uses workflowRunId, not id.
      const latestRun = runsResponse.data[0];
      const runId = latestRun.workflowRunId;

      setCurrentWorkflowRunId(runId);
      await loadTaskRuns(runId);

      setNotice("Workflow execution started successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not execute the workflow."
      );
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-shell">
        <WorkspaceSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content">
            <p>Loading workflow...</p>
          </div>
        </main>
      </div>
    );
  }

  const orderedTasks = executionOrder
    ? executionOrder.orderedTaskIds
        .map((taskId) => tasks.find((task) => task.id === taskId))
        .filter((task): task is Task => task !== undefined)
    : [];

  return (
    <div className="dashboard-shell">
      <WorkspaceSidebar />

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">Workspace /</span>
            <strong> Workflow editor</strong>
          </div>

          <Link to="/dashboard" className="editor-back">
            ← Back to overview
          </Link>
        </header>

        <section className="dashboard-content canvas-editor">
          <header className="editor-header canvas-editor-header">
            <p className="editor-eyebrow">WORKFLOW WORKSPACE</p>

            <form onSubmit={saveWorkflow} className="canvas-title-form">
              <input
                aria-label="Workflow name"
                className="canvas-workflow-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Untitled workflow"
                maxLength={150}
                required
              />

              <button
                type="submit"
                className="editor-secondary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </form>

            <p className="editor-subtitle">
              Build, validate, and execute your task dependencies.
            </p>

            <div className="canvas-toolbar">
              <span className="canvas-stat">{tasks.length} tasks</span>
              <span className="canvas-stat">
                {dependencies.length} dependencies
              </span>

              <button
                type="button"
                className="editor-secondary-button"
                onClick={() => void validateWorkflow()}
                disabled={
                  checkingWorkflow || executing || workflowId === null
                }
              >
                {checkingWorkflow ? "Validating..." : "Validate"}
              </button>

              <button
                type="button"
                className="editor-primary-button"
                onClick={() => void executeWorkflow()}
                disabled={
                  executing ||
                  checkingWorkflow ||
                  workflowId === null ||
                  tasks.length === 0
                }
              >
                {executing ? "Executing..." : "▶ Execute"}
              </button>
            </div>
          </header>

          {error && (
            <p className="editor-alert error" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="editor-alert success" role="status">
              {notice}
            </p>
          )}

          {validation && (
            <section
              className={`editor-alert ${
                validation.valid ? "success" : "error"
              }`}
              role="status"
            >
              <strong>
                {validation.valid ? "Workflow is valid" : "Validation failed"}
              </strong>
              <p>{validation.message}</p>

              {validation.valid && orderedTasks.length > 0 && (
                <p className="canvas-order-text">
                  <strong>Execution order:</strong>{" "}
                  {orderedTasks.map((task) => task.name).join(" → ")}
                </p>
              )}
            </section>
          )}

          {workflowId !== null && (
            <>
              <section className="editor-card">
                <h2>Execution Progress</h2>

                <p>
                  View task statuses and complete manual tasks when they are
                  waiting for your input.
                </p>

                {currentWorkflowRunId === null ? (
                  <p className="editor-empty">
                    Execute the workflow to view its task progress.
                  </p>
                ) : loadingTaskRuns ? (
                  <p>Loading task progress...</p>
                ) : taskRuns.length === 0 ? (
                  <p className="editor-empty">
                    No task runs found for this execution.
                  </p>
                ) : (
                  <div className="editor-task-list">
                    {taskRuns.map((taskRun) => (
                      <article
                        className="editor-task"
                        key={taskRun.taskRunId}
                      >
                        <div className="editor-task-info">
                          <h3>{taskRun.taskName}</h3>

                          <div className="editor-task-meta">
                            <span>{taskRun.taskType}</span>
                            <span>Status: {taskRun.status}</span>
                            <span>Task run ID: {taskRun.taskRunId}</span>
                          </div>

                          {taskRun.errorMessage && (
                            <p role="alert">{taskRun.errorMessage}</p>
                          )}
                        </div>

                        {taskRun.taskType === "MANUAL" &&
                          taskRun.status === "WAITING_FOR_USER" && (
                            <button
                              type="button"
                              className="editor-primary-button"
                              disabled={completingTaskRunId !== null}
                              onClick={() =>
                                void completeManualTask(taskRun.taskRunId)
                              }
                            >
                              {completingTaskRunId === taskRun.taskRunId
                                ? "Completing..."
                                : "Complete task"}
                            </button>
                          )}
                      </article>
                    ))}
                  </div>
                )}

                {currentWorkflowRunId !== null && (
                  <button
                    type="button"
                    className="editor-secondary-button"
                    disabled={loadingTaskRuns}
                    onClick={() => void loadTaskRuns(currentWorkflowRunId)}
                  >
                    Refresh progress
                  </button>
                )}
              </section>

              <section className="canvas-main-card">
                <div className="canvas-section-heading">
                  <div>
                    <h2>Workflow Canvas</h2>
                    <p>
                      Follow the arrows to understand task prerequisites.
                      Validate to display execution order.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={() =>
                      setShowTaskManager((current) => !current)
                    }
                  >
                    {showTaskManager ? "Hide tasks" : "Manage tasks"}
                  </button>
                </div>

                <div className="canvas-graph">
                  <WorkflowGraph
                    tasks={tasks}
                    dependencies={dependencies}
                    executionOrder={
                      validation?.valid ? executionOrder : null
                    }
                  />
                </div>

                {tasks.length > 0 && (
                  <div className="canvas-legend">
                    <span>
                      <i className="legend-dot purple" /> Task
                    </span>
                    <span>
                      <i className="legend-dot green" /> Validated order
                    </span>
                    <span>Arrows represent dependencies</span>
                  </div>
                )}
              </section>

              {showTaskManager && (
                <section className="editor-card">
                  <h2>Manage Tasks</h2>

                  <form onSubmit={addTask} className="editor-form">
                    <label htmlFor="task-name">Task name</label>
                    <input
                      id="task-name"
                      value={taskName}
                      onChange={(event) => setTaskName(event.target.value)}
                      maxLength={50}
                      placeholder="e.g. Fetch Dataset"
                      required
                    />

                    <label htmlFor="task-description">Description</label>
                    <textarea
                      id="task-description"
                      value={taskDescription}
                      onChange={(event) =>
                        setTaskDescription(event.target.value)
                      }
                      maxLength={500}
                      rows={2}
                      placeholder="Describe the task"
                      required
                    />

                    <label htmlFor="task-duration">Duration (minutes)</label>
                    <input
                      id="task-duration"
                      type="number"
                      min="0"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      required
                    />

                    <label htmlFor="task-type">Task type</label>
                    <select
                      id="task-type"
                      value={taskType}
                      onChange={(event) =>
                        setTaskType(
                          event.target.value as "MANUAL" | "AUTOMATED"
                        )
                      }
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="AUTOMATED">Automated</option>
                    </select>

                    <button
                      type="submit"
                      className="editor-primary-button"
                      disabled={addingTask}
                    >
                      {addingTask ? "Adding..." : "+ Add Task"}
                    </button>
                  </form>

                  <h3 className="canvas-subheading">Existing Tasks</h3>

                  {tasks.length === 0 ? (
                    <p className="editor-empty">
                      No tasks have been added yet.
                    </p>
                  ) : (
                    <div className="editor-task-list">
                      {tasks.map((task) => (
                        <article className="editor-task" key={task.id}>
                          <div className="editor-task-icon">
                            {task.taskType === "AUTOMATED" ? "⚙" : "✓"}
                          </div>

                          <div className="editor-task-info">
                            <h3>{task.name}</h3>
                            <p>{task.description}</p>
                            <div className="editor-task-meta">
                              <span>{task.taskType}</span>
                              <span>{task.estimatedDuration ?? 0} min</span>
                              <span>ID: {task.id}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="editor-delete-button"
                            onClick={() => void deleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="editor-card">
                <div className="canvas-section-heading">
                  <div>
                    <h2>Dependencies</h2>
                    <p>
                      Choose which task must finish before another task starts.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={() =>
                      setShowDependencyManager((current) => !current)
                    }
                  >
                    {showDependencyManager
                      ? "Hide dependencies"
                      : "Manage dependencies"}
                  </button>
                </div>

                {showDependencyManager && (
                  <>
                    {tasks.length < 2 ? (
                      <p className="editor-empty">
                        Add at least two tasks before creating a dependency.
                      </p>
                    ) : (
                      <form
                        onSubmit={addDependency}
                        className="editor-form"
                      >
                        <label htmlFor="source-task">
                          Prerequisite task
                        </label>
                        <select
                          id="source-task"
                          value={sourceTaskId}
                          onChange={(event) =>
                            setSourceTaskId(event.target.value)
                          }
                          required
                        >
                          <option value="">
                            Select prerequisite task
                          </option>
                          {tasks.map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.name} (ID: {task.id})
                            </option>
                          ))}
                        </select>

                        <label htmlFor="target-task">
                          Dependent task
                        </label>
                        <select
                          id="target-task"
                          value={targetTaskId}
                          onChange={(event) =>
                            setTargetTaskId(event.target.value)
                          }
                          required
                        >
                          <option value="">
                            Select dependent task
                          </option>
                          {tasks.map((task) => (
                            <option
                              key={task.id}
                              value={task.id}
                              disabled={sourceTaskId === String(task.id)}
                            >
                              {task.name} (ID: {task.id})
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="editor-primary-button"
                          disabled={
                            addingDependency ||
                            !sourceTaskId ||
                            !targetTaskId ||
                            sourceTaskId === targetTaskId
                          }
                        >
                          {addingDependency
                            ? "Adding..."
                            : "+ Add Dependency"}
                        </button>
                      </form>
                    )}

                    <h3 className="canvas-subheading">
                      Existing Dependencies
                    </h3>

                    {dependencies.length === 0 ? (
                      <p className="editor-empty">
                        No dependencies configured.
                      </p>
                    ) : (
                      <div className="editor-task-list">
                        {dependencies.map((dependency) => {
                          const source = tasks.find(
                            (task) => task.id === dependency.sourceTask
                          );
                          const target = tasks.find(
                            (task) => task.id === dependency.targetTask
                          );

                          return (
                            <article
                              className="editor-task"
                              key={dependency.id}
                            >
                              <div className="editor-task-icon">↳</div>

                              <div className="editor-task-info">
                                <strong>
                                  {source?.name ??
                                    `Task ${dependency.sourceTask}`}
                                </strong>
                                {" → "}
                                <strong>
                                  {target?.name ??
                                    `Task ${dependency.targetTask}`}
                                </strong>
                              </div>

                              <button
                                type="button"
                                className="editor-delete-button"
                                onClick={() =>
                                  void deleteDependency(dependency.id)
                                }
                              >
                                Remove
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}