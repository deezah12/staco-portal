package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "performance_reviews")
public class PerformanceReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","leaveRequests","leaveBalance"})
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","leaveRequests","leaveBalance"})
    private User manager;

    @Column(nullable = false)
    private String reviewPeriod; // e.g. "H1 2025"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status = ReviewStatus.ELIGIBLE;

    private String appraisalSummary;

    /** Raw manager competency average (before deductions) */
    private Double managerScore;

    /** Total disciplinary deductions for this period */
    private Double disciplinaryDeductions = 0.0;

    /** Final score = managerScore - disciplinaryDeductions. Can go below zero. */
    private Double finalScore;

    private LocalDateTime appraisedAt;

    @Enumerated(EnumType.STRING)
    private EmployeeResponse employeeResponse;
    private String employeeComment;
    private LocalDateTime respondedAt;

    @Enumerated(EnumType.STRING)
    private Recommendation recommendation;

    /** If TRAINING_AND_DEVELOPMENT, the specific training type picked by manager */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private TrainingType trainingType;

    private String recommendationNote;
    private LocalDateTime recommendedAt;

    /** Whether employee has submitted feedback after CLOSED */
    private boolean feedbackSubmitted = false;
    private LocalDateTime feedbackSubmittedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CompetencyScore> competencyScores;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // -------------------------------------------------------
    // Enums
    // -------------------------------------------------------

    public enum ReviewStatus {
        ELIGIBLE,
        APPRAISED,
        ACKNOWLEDGED,
        DISPUTED,
        RECOMMENDATION_GIVEN,
        CLOSED,
        FEEDBACK_PENDING  // CLOSED but employee hasn't submitted feedback yet
    }

    public enum EmployeeResponse {
        ACCEPTED, REJECTED
    }

    public enum Recommendation {
        PROMOTION,
        SALARY_INCREMENT,
        TRAINING_AND_DEVELOPMENT,
        PERFORMANCE_IMPROVEMENT_PLAN,
        COMMENDATION
    }
}
