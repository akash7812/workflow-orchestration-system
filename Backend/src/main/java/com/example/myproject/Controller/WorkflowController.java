package com.example.myproject.Controller;

import com.example.myproject.Model.Workflow;
import com.example.myproject.Service.WorkflowService;
import com.example.myproject.Service.WorkflowGraphService;
import com.example.myproject.Service.WorkflowExecutionService;
import com.example.myproject.dto.*;
import org.springframework.web.bind.annotation.*;
import com.example.myproject.Model.WorkflowRun;
import java.util.Comparator;
import com.example.myproject.dto.WorkflowDashboardDTO;
import java.util.List;
import com.example.myproject.dto.TaskRunResponseDTO;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final WorkflowGraphService workflowGraphService;
    private final WorkflowExecutionService workflowExecutionService;
    public WorkflowController(WorkflowService workflowService,WorkflowGraphService workflowGraphService,WorkflowExecutionService workflowExecutionService) {
        this.workflowService = workflowService;
        this.workflowGraphService=workflowGraphService;
        this.workflowExecutionService=workflowExecutionService;
    }

    @PostMapping
    public Workflow createWorkflow(@RequestBody Workflow workflow) {
        return workflowService.createWorkflow(workflow);
    }



    @GetMapping
    public List<WorkflowDashboardDTO> getAllWorkflows() {
        System.out.println(
                "DEBUG: Updated WorkflowDashboardDTO controller is running"
        );
        return workflowService.getAllWorkflows()
                .stream()
                .map(workflow -> {
                    List<WorkflowRun> runs =
                            workflowExecutionService.getWorkflowRuns(
                                    workflow.getId()
                            );

                    WorkflowRun latestRun = runs.stream()
                            .filter(run -> run.getStartedAt() != null)
                            .max(Comparator.comparing(WorkflowRun::getStartedAt))
                            .orElse(null);

                    return new WorkflowDashboardDTO(
                            workflow.getId(),
                            workflow.getName(),
                            workflow.getDescription(),
                            workflow.getStatus() == null
                                    ? "DRAFT"
                                    : workflow.getStatus().name(),
                            workflow.getCreatedAt(),
                            latestRun == null ? null : latestRun.getStartedAt(),
                            latestRun == null ? null : latestRun.getStatus().name()
                    );
                })
                .toList();
    }


    @GetMapping("/{workflowId}")
    public Workflow getByIdWorkflows(@PathVariable Long workflowId) {
        return workflowService.getByIdWorkflows(workflowId);
    }

    @DeleteMapping("/{workflowId}")
    public void deleteWorkflows(@PathVariable Long workflowId) {
        workflowService.deleteWorkflows(workflowId);
    }

    @PutMapping("/{workflowId}")
    public Workflow updateWorkflowsPut(@PathVariable Long workflowId, @RequestBody WorkflowUpdateDTO dto){
        return workflowService.updateWorkflows(workflowId, dto);
    }

    @PatchMapping("/{workflowId}")
    public Workflow updateWorkflowsPatch(@PathVariable Long workflowId, @RequestBody WorkflowUpdateDTO dto){
        return workflowService.updateWorkflows(workflowId, dto);
    }
    @GetMapping("/{workflowId}/execution-order")
    public ExecutionOrderDTO getExecutionOrder(@PathVariable Long workflowId) {
        return workflowGraphService.getExecutionOrder(workflowId);
    }
    @GetMapping("/{workflowId}/validate")
    public WorkflowValidationDTO validateWorkflow(@PathVariable Long workflowId) {
        return workflowGraphService.validateWorkflow(workflowId);
    }

    @PostMapping("/task-runs/{taskRunId}/complete")
    public TaskRunResponseDTO completeManualTask(
            @PathVariable Long taskRunId
    ) {
        var taskRun =
                workflowExecutionService.completeManualTask(taskRunId);

        return new TaskRunResponseDTO(
                taskRun.getId(),
                taskRun.getWorkflowRun().getId(),
                taskRun.getTask().getId(),
                taskRun.getTask().getName(),
                taskRun.getTask().getTaskType().name(),
                taskRun.getStatus().name(),
                taskRun.getStartedAt(),
                taskRun.getEndedAt(),
                taskRun.getErrorMessage()
        );
    }



}