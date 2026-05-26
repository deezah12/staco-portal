package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Tracks training recommended via appraisal and whether staff attended */
@Data
@NoArgsConstructor
@Entity
@Table(name = "training_records")
public class TrainingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_type_id", nullable = false)
    private TrainingType trainingType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    private PerformanceReview review; // linked appraisal

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TrainingStatus status = TrainingStatus.RECOMMENDED;

    private LocalDate scheduledDate;
    private LocalDate completedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheduled_by_id")
    private User scheduledBy;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum TrainingStatus {
        RECOMMENDED,  // Came from appraisal recommendation
        SCHEDULED,    // HR scheduled it
        ATTENDED,     // Employee attended
        MISSED        // Employee missed it
    }
}
