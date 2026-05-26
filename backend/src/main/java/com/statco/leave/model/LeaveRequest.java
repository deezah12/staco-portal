package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "leave_requests")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private int totalDays;

    @Column(length = 500)
    private String reason;

    /**
     * Name of the staff member covering during the leave period.
     */
    private String reliefStaffName;

    /**
     * Path to the uploaded handover note file.
     * Mandatory — submission blocked without it.
     */
    @Column(nullable = false)
    private String handoverNotePath;

    /**
     * Original filename of the handover note for display purposes.
     */
    private String handoverNoteFileName;

    // -------------------------------------------------------
    // Overall request lifecycle status
    // -------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING_UNIT_HEAD;

    // -------------------------------------------------------
    // Level 1: Unit Head
    // -------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus unitHeadStatus = ApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_head_reviewer_id")
    private User unitHeadReviewer;

    private String unitHeadComment;
    private LocalDateTime unitHeadReviewedAt;

    // -------------------------------------------------------
    // Level 2: Divisional Head
    // -------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus divHeadStatus = ApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "div_head_reviewer_id")
    private User divHeadReviewer;

    private String divHeadComment;
    private LocalDateTime divHeadReviewedAt;

    // -------------------------------------------------------
    // Level 3: HR Processing
    // -------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus hrStatus = ApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_processor_id")
    private User hrProcessor;

    private String hrComment;
    private LocalDateTime hrProcessedAt;

    // -------------------------------------------------------
    // Payment (Annual leave >= 10 days only)
    // -------------------------------------------------------
    private boolean paymentApplicable = false;
    private boolean paymentRequestSent = false;

    // -------------------------------------------------------
    // Resumption tracking
    // -------------------------------------------------------
    /**
     * HR marks this when employee resumes.
     * Anyone past endDate without this = overstayed.
     */
    private boolean resumedConfirmedByHr = false;
    private boolean resumedConfirmedByHod = false;
    private LocalDateTime resumedAt;

    // -------------------------------------------------------
    // Reminder tracking (prevent duplicate sends)
    // -------------------------------------------------------
    private boolean twoDayReminderSent = false;
    private boolean resumptionDayReminderSent = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // -------------------------------------------------------
    // Enums
    // -------------------------------------------------------

    public enum LeaveType {
        ANNUAL,
        SICK,
        CASUAL,
        EXAM,
        MATERNITY,
        PATERNITY,  // Displayed under "Others" in UI
        UNPAID,
        OTHER
    }

    public enum Status {
        PENDING_UNIT_HEAD,  // Awaiting Unit Head
        PENDING_DIV_HEAD,   // Unit Head approved, awaiting Div Head
        PENDING_HR,         // Div Head approved, awaiting HR processing
        ACTIVE,             // HR processed — employee is currently on leave
        RESUMED,            // Both HR and HOD confirmed return
        REJECTED,           // Rejected at any level
        CANCELLED           // Cancelled by employee before approval
    }

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED, SKIPPED
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    /**
     * True when both HR and HOD have confirmed resumption.
     */
    public boolean isFullyResumed() {
        return resumedConfirmedByHr && resumedConfirmedByHod;
    }

    /**
     * True when employee is past their end date but not yet marked RESUMED.
     */
    public boolean isOverstayed() {
        return status == Status.ACTIVE
                && endDate != null
                && LocalDate.now().isAfter(endDate)
                && !isFullyResumed();
    }
}
