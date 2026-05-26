package com.statco.leave.dto;

import com.statco.leave.model.CompetencyScore;
import com.statco.leave.model.FeedbackQuestion;
import com.statco.leave.model.PerformanceReview;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

public class PerformanceDto {

    @Data
    public static class MarkEligibleRequest {
        @NotNull private Long employeeId;
        @NotNull private Long managerId;
        @NotBlank private String reviewPeriod;
    }

    @Data
    public static class CompetencyScoreInput {
        @NotNull private CompetencyScore.Competency competency;
        @Min(1) @Max(5) private int score;
        private String comment;
    }

    @Data
    public static class SubmitAppraisalRequest {
        @NotNull @Size(min = 1) private List<CompetencyScoreInput> scores;
        @NotBlank @Size(max = 2000) private String appraisalSummary;
    }

    @Data
    public static class EmployeeResponseRequest {
        @NotNull private PerformanceReview.EmployeeResponse response;
        @Size(max = 2000) private String comment;
    }

    /** Manager gives recommendation — if TRAINING_AND_DEVELOPMENT, trainingTypeId is required */
    @Data
    public static class RecommendationRequest {
        @NotNull private PerformanceReview.Recommendation recommendation;
        private Long trainingTypeId; // required if recommendation = TRAINING_AND_DEVELOPMENT
        @NotBlank @Size(max = 2000) private String note;
    }

    // -------------------------------------------------------
    // Training Types (HR manages)
    // -------------------------------------------------------

    @Data
    public static class TrainingTypeRequest {
        @NotBlank private String name;
        @Size(max = 500) private String description;
    }

    // -------------------------------------------------------
    // Training Records (HR schedules and tracks attendance)
    // -------------------------------------------------------

    @Data
    public static class ScheduleTrainingRequest {
        @NotNull private Long trainingRecordId;
        @NotNull private LocalDate scheduledDate;
        private String notes;
    }

    @Data
    public static class UpdateTrainingStatusRequest {
        @NotNull private Long trainingRecordId;
        @NotNull private com.statco.leave.model.TrainingRecord.TrainingStatus status;
        private LocalDate completedDate;
        private String notes;
    }

    // -------------------------------------------------------
    // Offence Categories (HR manages)
    // -------------------------------------------------------

    @Data
    public static class OffenceCategoryRequest {
        @NotBlank private String name;
        @NotNull private double deductionMark; // negative value e.g. -5.0
        @Size(max = 500) private String description;
    }

    // -------------------------------------------------------
    // Disciplinary Actions (HR logs against staff)
    // -------------------------------------------------------

    @Data
    public static class LogDisciplinaryActionRequest {
        @NotNull private Long employeeId;
        @NotNull private Long offenceCategoryId;
        @NotBlank private String reviewPeriod;
        @Size(max = 1000) private String description;
    }

    // -------------------------------------------------------
    // Feedback Questions (HR configures)
    // -------------------------------------------------------

    @Data
    public static class FeedbackQuestionRequest {
        @NotBlank private String questionText;
        @NotNull private FeedbackQuestion.QuestionType type;
        private int sortOrder;
    }

    // -------------------------------------------------------
    // Feedback Responses (Employee submits after CLOSED)
    // -------------------------------------------------------

    @Data
    public static class FeedbackAnswerInput {
        @NotNull private Long questionId;
        private Integer rating;   // 1-5 for RATING / BOTH
        private String textAnswer; // for TEXT / BOTH
    }

    @Data
    public static class SubmitFeedbackRequest {
        @NotNull @Size(min = 1) private List<FeedbackAnswerInput> answers;
    }

    // -------------------------------------------------------
    // Bio Data Update (HR updates staff profile)
    // -------------------------------------------------------

    @Data
    public static class UpdateBioDataRequest {
        private String fullName;
        private String department;
        private String position;
        private String phone;
        private com.statco.leave.model.User.ApprovalLevel approvalLevel;
        private Long gradeId;
        private Long branchId;
        private java.math.BigDecimal leaveAllowanceAmount;
        private Integer sickLeaveTotal;
    }
}
