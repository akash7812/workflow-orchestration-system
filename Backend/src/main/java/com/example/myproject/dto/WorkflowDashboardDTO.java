
package com.example.myproject.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WorkflowDashboardDTO(
        Long id,
        String name,
        String description,
        String status,
        LocalDate createdAt,
        LocalDateTime latestExecutionAt,
        String latestExecutionStatus
) {}
