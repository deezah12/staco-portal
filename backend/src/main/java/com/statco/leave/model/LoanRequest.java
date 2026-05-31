package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "loan_requests")
public class LoanRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlySalary;

    /** Fixed options: 3, 6, 9, 12 months */
    @Column(nullable = false)
    private int repaymentMonths;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyDeduction;

    @Column(length = 1000)
    private String reason;

    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status = LoanStatus.PENDING_GUARANTORS;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "leaveRequests", "leaveBalance", "password"})
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_head_reviewer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "leaveRequests", "leaveBalance", "password"})
    private User unitHeadReviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "div_head_reviewer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "leaveRequests", "leaveBalance", "password"})
    private User divHeadReviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_processor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "leaveRequests", "leaveBalance", "password"})
    private User hrProcessor;

    private String unitHeadComment;
    private LocalDateTime unitHeadReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus unitHeadStatus = ApprovalStatus.PENDING;

    private String divHeadComment;
    private LocalDateTime divHeadReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus divHeadStatus = ApprovalStatus.PENDING;

    // -------------------------------------------------------
    // Level 3: MD
    // -------------------------------------------------------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "md_id")
    private User mdReviewer;

    private String mdComment;
    private LocalDateTime mdReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus mdStatus = ApprovalStatus.PENDING;

    private String hrComment;
    private LocalDateTime hrProcessedAt;

    // -------------------------------------------------------
    // Accounts Disbursement
    // -------------------------------------------------------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disbursed_by_id")
    private User disbursedBy;

    private LocalDate disbursementDate;
    private LocalDate repaymentStartDate;
    private String disbursementConfirmationPath; // uploaded document from Accounts

    // -------------------------------------------------------
    // Repayment tracking
    // -------------------------------------------------------
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean fullyRepaid = false;

    /** True when at least one installment is OVERDUE */
    @Column(nullable = false)
    private boolean hasOverdueInstallment = false;

    /** Tracks whether the overdue notification has been sent today (reset daily by job) */
    private LocalDate lastOverdueNotificationDate;

    @OneToMany(mappedBy = "loanRequest", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LoanGuarantor> guarantors;

    @OneToMany(mappedBy = "loanRequest", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LoanRepayment> repayments;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // -------------------------------------------------------
    // Enums
    // -------------------------------------------------------

    public enum LoanStatus {
        PENDING_GUARANTORS,  // Waiting for both guarantors to sign in-app
        PENDING_UNIT_HEAD,   // Guarantors signed; awaiting Unit Head
        PENDING_DIV_HEAD,    // Unit Head approved; awaiting Div Head
        PENDING_MD,          // Div Head approved; awaiting MD final approval
        APPROVED,            // MD approved; awaiting HR to initiate processing
        PROCESSING,          // HR initiated; Accounts processing disbursement
        DISBURSED,           // Money disbursed; repayment schedule active
        OVERDUE,             // One or more installments missed past due date
        FULLY_REPAID,        // All installments paid — loan closed
        REJECTED,            // Rejected at any stage
        CANCELLED            // Cancelled by employee before disbursement
    }

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED, SKIPPED
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    public boolean isActive() {
        return status == LoanStatus.DISBURSED || status == LoanStatus.OVERDUE;
    }

    /** Any loan that blocks a new application */
    public boolean blocksNewLoan() {
        return status != LoanStatus.FULLY_REPAID
            && status != LoanStatus.REJECTED
            && status != LoanStatus.CANCELLED;
    }
}
