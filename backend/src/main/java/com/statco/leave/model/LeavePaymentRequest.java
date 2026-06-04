package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Created by HR when processing an annual leave of 10+ days.
 * Accounts picks this up, processes payment, and uploads the EOP document.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "leave_payment_requests")
public class LeavePaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_request_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "employee", "unitHeadReviewer", "divHeadReviewer", "hrProcessor"})
    private LeaveRequest leaveRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "manager", "grade", "leaveRequests", "leaveBalance", "password"})
    private User employee;

    /**
     * Amount pulled from employee bio at the time HR processes the leave.
     * Stored here so it's locked even if bio changes later.
     */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    // HR fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_hr_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "manager", "grade", "leaveRequests", "leaveBalance", "password"})
    private User createdByHr;

    private LocalDateTime createdAt = LocalDateTime.now();

    private String hrNote;

    // Accounts fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_account_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "manager", "grade", "leaveRequests", "leaveBalance", "password"})
    private User processedByAccount;

    private LocalDateTime processedAt;

    private String accountNote;

    /**
     * Path to the uploaded EOP (End of Period) document from Accounts.
     */
    @JsonIgnore
    private String eopDocumentPath;
    private String eopDocumentFileName;

    public enum PaymentStatus {
        PENDING,    // Created by HR, waiting for Accounts
        PROCESSED,  // Accounts has processed and uploaded EOP
        CANCELLED   // Cancelled (e.g. leave was cancelled before payment)
    }
}
