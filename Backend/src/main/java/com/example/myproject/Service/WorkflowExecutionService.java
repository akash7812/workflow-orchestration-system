
package com.example.myproject.Service;

import com.example.myproject.Model.*;
import com.example.myproject.Repostiory.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class WorkflowExecutionService {

    private static final int MAX_PARALLEL_TASKS = 4;

    private final WorkflowRepository workflowRepo;
    private final TaskRepository taskRepo;
    private final WorkflowRunRepository workflowRunRepo;
    private final TaskRunRepository taskRunRepo;
    private final TaskDependencyRepository dependencyRepo;
    private final WorkflowGraphService graphService;

    public WorkflowExecutionService(
            WorkflowRepository workflowRepo,
            TaskRepository taskRepo,
            WorkflowRunRepository workflowRunRepo,
            TaskRunRepository taskRunRepo,
            TaskDependencyRepository dependencyRepo,
            WorkflowGraphService graphService
    ) {
        this.workflowRepo = workflowRepo;
        this.taskRepo = taskRepo;
        this.workflowRunRepo = workflowRunRepo;
        this.taskRunRepo = taskRunRepo;
        this.dependencyRepo = dependencyRepo;
        this.graphService = graphService;
    }

    @Transactional
    public WorkflowRun executeWorkflow(Long workflowId) {

        Workflow workflow = workflowRepo.findById(workflowId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Workflow not found"));

        List<Long> executionOrder =
                graphService.getExecutionOrderOrThrow(workflowId);

        if (executionOrder.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot execute an empty workflow");
        }

        WorkflowRun workflowRun = new WorkflowRun();
        workflowRun.setWorkflow(workflow);
        workflowRun.setStatus(WorkflowRun.WorkflowRunStatus.RUNNING);
        workflowRun.setStartedAt(LocalDateTime.now());
        workflowRun.setExecutionOrder(
                executionOrder.stream()
                        .map(String::valueOf)
                        .reduce((a, b) -> a + "," + b)
                        .orElse("")
        );

        workflowRunRepo.saveAndFlush(workflowRun);

        for (Long taskId : executionOrder) {
            Task task = taskRepo.findById(taskId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Task not found: " + taskId));

            TaskRun taskRun = new TaskRun();
            taskRun.setTask(task);
            taskRun.setWorkflowRun(workflowRun);
            taskRun.setStatus(TaskRun.TaskRunStatus.PENDING);
            taskRunRepo.save(taskRun);
        }

        taskRunRepo.flush();

        try {
            runExecutionLoop(workflowRun);
        } catch (Exception e) {
            markWorkflowFailed(workflowRun, e);
        }

        return workflowRunRepo.saveAndFlush(workflowRun);
    }

    /**
     * Dependency-aware scheduler.
     *
     * In each iteration:
     * 1. Find pending tasks whose prerequisites are completed.
     * 2. Mark ready manual tasks as waiting for the user.
     * 3. Run independent automated tasks concurrently.
     * 4. Repeat until completed, waiting for manual input, or failed.
     */
    private void runExecutionLoop(WorkflowRun workflowRun) {

        Long workflowId = workflowRun.getWorkflow().getId();

        List<TaskDependency> dependencies =
                dependencyRepo.findByWorkflowId(workflowId);

        ExecutorService executor = Executors.newFixedThreadPool(
                MAX_PARALLEL_TASKS
        );

        try {
            while (true) {

                List<TaskRun> taskRuns =
                        taskRunRepo.findByWorkflowRunId(workflowRun.getId());

                boolean anyFailed = taskRuns.stream().anyMatch(
                        tr -> tr.getStatus() == TaskRun.TaskRunStatus.FAILED
                );

                if (anyFailed) {
                    throw new IllegalStateException(
                            "Workflow contains a failed task");
                }

                boolean allCompleted = taskRuns.stream().allMatch(
                        tr -> tr.getStatus() == TaskRun.TaskRunStatus.COMPLETED
                );

                if (allCompleted) {
                    workflowRun.setStatus(
                            WorkflowRun.WorkflowRunStatus.COMPLETED);
                    workflowRun.setEndedAt(LocalDateTime.now());
                    workflowRunRepo.saveAndFlush(workflowRun);
                    return;
                }

                Map<Long, TaskRun> runsByTaskId = new HashMap<>();

                for (TaskRun taskRun : taskRuns) {
                    runsByTaskId.put(
                            taskRun.getTask().getId(), taskRun);
                }

                List<TaskRun> readyAutomated = new ArrayList<>();

                // Identify tasks whose dependencies have all completed.
                for (TaskRun taskRun : taskRuns) {

                    TaskRun.TaskRunStatus status = taskRun.getStatus();

                    if (status != TaskRun.TaskRunStatus.PENDING
                            && status != TaskRun.TaskRunStatus.READY) {
                        continue;
                    }

                    Long taskId = taskRun.getTask().getId();

                    boolean dependenciesCompleted = true;

                    for (TaskDependency dependency : dependencies) {

                        if (dependency.getTargetTask().getId()
                                .equals(taskId)) {

                            Long prerequisiteId =
                                    dependency.getSourceTask().getId();

                            TaskRun prerequisite =
                                    runsByTaskId.get(prerequisiteId);

                            if (prerequisite == null
                                    || prerequisite.getStatus()
                                    != TaskRun.TaskRunStatus.COMPLETED) {
                                dependenciesCompleted = false;
                                break;
                            }
                        }
                    }

                    if (!dependenciesCompleted) {
                        continue;
                    }

                    Task task = taskRun.getTask();

                    if (task.getTaskType() == Task.TaskType.MANUAL) {

                        taskRun.setStatus(
                                TaskRun.TaskRunStatus.WAITING_FOR_USER);
                        taskRun.setStartedAt(LocalDateTime.now());
                        taskRun.setEndedAt(null);
                        taskRunRepo.saveAndFlush(taskRun);

                    } else {
                        taskRun.setStatus(TaskRun.TaskRunStatus.READY);
                        taskRunRepo.saveAndFlush(taskRun);
                        readyAutomated.add(taskRun);
                    }
                }

                // Independent automated tasks run concurrently.
                if (!readyAutomated.isEmpty()) {

                    List<Future<TaskRun>> futures = new ArrayList<>();

                    for (TaskRun taskRun : readyAutomated) {

                        taskRun.setStatus(TaskRun.TaskRunStatus.RUNNING);
                        taskRun.setStartedAt(LocalDateTime.now());
                        taskRun.setEndedAt(null);
                        taskRun.setErrorMessage(null);
                        taskRunRepo.saveAndFlush(taskRun);

                        futures.add(executor.submit(() -> {
                            simulateExecution(taskRun.getTask());
                            return taskRun;
                        }));
                    }

                    Exception firstFailure = null;

                    for (int i = 0; i < futures.size(); i++) {

                        TaskRun taskRun = readyAutomated.get(i);

                        try {
                            futures.get(i).get();

                            taskRun.setStatus(
                                    TaskRun.TaskRunStatus.COMPLETED);
                            taskRun.setEndedAt(LocalDateTime.now());
                            taskRunRepo.saveAndFlush(taskRun);

                        } catch (InterruptedException e) {

                            Thread.currentThread().interrupt();

                            taskRun.setStatus(
                                    TaskRun.TaskRunStatus.FAILED);
                            taskRun.setEndedAt(LocalDateTime.now());
                            taskRun.setErrorMessage("Execution interrupted");
                            taskRunRepo.saveAndFlush(taskRun);

                            if (firstFailure == null) {
                                firstFailure = e;
                            }

                        } catch (ExecutionException e) {

                            Throwable cause = e.getCause();

                            taskRun.setStatus(
                                    TaskRun.TaskRunStatus.FAILED);
                            taskRun.setEndedAt(LocalDateTime.now());
                            taskRun.setErrorMessage(
                                    cause != null && cause.getMessage() != null
                                            ? cause.getMessage()
                                            : "Task execution failed"
                            );
                            taskRunRepo.saveAndFlush(taskRun);

                            if (firstFailure == null) {
                                firstFailure = new IllegalStateException(
                                        "Task failed: "
                                                + taskRun.getTask().getName(),
                                        cause
                                );
                            }
                        }
                    }

                    if (firstFailure != null) {
                        throw new IllegalStateException(
                                "One or more parallel tasks failed",
                                firstFailure
                        );
                    }

                    // Recalculate dependency readiness after this batch.
                    continue;
                }

                // No automated tasks can currently start.
                List<TaskRun> refreshedRuns =
                        taskRunRepo.findByWorkflowRunId(workflowRun.getId());

                boolean waitingForUser = refreshedRuns.stream().anyMatch(
                        tr -> tr.getStatus()
                                == TaskRun.TaskRunStatus.WAITING_FOR_USER
                );

                if (waitingForUser) {
                    workflowRun.setStatus(
                            WorkflowRun.WorkflowRunStatus.WAITING);
                    workflowRun.setEndedAt(null);
                    workflowRunRepo.saveAndFlush(workflowRun);
                    return;
                }

                throw new IllegalStateException(
                        "Workflow cannot make progress. "
                                + "Check task dependencies and statuses."
                );
            }

        } finally {
            executor.shutdownNow();
        }
    }

    private void simulateExecution(Task task) {

        try {
            if (task.getEstimatedDuration() != null) {
                Thread.sleep(
                        Math.max(
                                0L,
                                task.getEstimatedDuration() * 100L
                        )
                );
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Execution interrupted for task: " + task.getName(),
                    e
            );
        }
    }

    private void markWorkflowFailed(
            WorkflowRun workflowRun,
            Exception exception
    ) {
        workflowRun.setStatus(WorkflowRun.WorkflowRunStatus.FAILED);
        workflowRun.setEndedAt(LocalDateTime.now());
        workflowRunRepo.saveAndFlush(workflowRun);

        System.err.println(
                "Workflow run " + workflowRun.getId()
                        + " failed: " + exception.getMessage()
        );
    }

    @Transactional
    public TaskRun completeManualTask(Long taskRunId) {

        TaskRun taskRun = taskRunRepo.findById(taskRunId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task run not found"));

        if (taskRun.getTask().getTaskType() != Task.TaskType.MANUAL) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "This is not a manual task");
        }

        if (taskRun.getStatus()
                != TaskRun.TaskRunStatus.WAITING_FOR_USER) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Task is not waiting for user completion");
        }

        WorkflowRun workflowRun = taskRun.getWorkflowRun();

        if (workflowRun.getStatus()
                != WorkflowRun.WorkflowRunStatus.WAITING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Workflow is not waiting for manual completion");
        }

        taskRun.setStatus(TaskRun.TaskRunStatus.COMPLETED);
        taskRun.setEndedAt(LocalDateTime.now());
        taskRunRepo.saveAndFlush(taskRun);

        workflowRun.setStatus(WorkflowRun.WorkflowRunStatus.RUNNING);
        workflowRun.setEndedAt(null);
        workflowRunRepo.saveAndFlush(workflowRun);

        try {
            runExecutionLoop(workflowRun);
        } catch (Exception e) {
            markWorkflowFailed(workflowRun, e);
        }

        workflowRunRepo.saveAndFlush(workflowRun);
        return taskRun;
    }

    @Transactional(readOnly = true)
    public List<TaskRun> getWaitingManualTasks(Long workflowRunId) {
        return taskRunRepo.findByWorkflowRunIdAndStatus(
                workflowRunId,
                TaskRun.TaskRunStatus.WAITING_FOR_USER
        );
    }

    @Transactional(readOnly = true)
    public List<WorkflowRun> getWorkflowRuns(Long workflowId) {
        return workflowRunRepo.findByWorkflowIdOrderByStartedAtDesc(
                workflowId);
    }
}
