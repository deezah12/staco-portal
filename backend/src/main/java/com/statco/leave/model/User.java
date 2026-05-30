package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE;

    /**
     * Approval authority level.
     * Drives both leave and loan approval routing.
     * NONE      = regular staff
     * UNIT_HEAD = Level 1 approver (per dept)
     * DIV_HEAD  = Level 2 approver (per dept)
     * MD        = Managing Director — company-wide final approver for loans
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalLevel approvalLevel = ApprovalLevel.NONE;


    /**
     * Employee grade — used for guarantor eligibility.
     * Guarantor must have a higher grade.level than the loan applicant.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id")
    private Grade grade;

    private String department;
    private String position;
    private String phone;

    /** Annual leave allowance amount — set by HR on bio data */
    @Column(precision = 15, scale = 2)
    private BigDecimal leaveAllowanceAmount = BigDecimal.ZERO;

    /** Sick leave days — confirmed by HR on bio data */
    @Column(nullable = false)
    private int sickLeaveTotal = 10;

    @Column(nullable = false)
    private boolean mustChangePassword = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @JsonIgnore
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LeaveRequest> leaveRequests;

    @JsonIgnore
    @OneToOne(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private LeaveBalance leaveBalance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "manager", "leaveRequests", "leaveBalance", "password", "grade"})
    private User manager;

    public enum Role {
        EMPLOYEE,
        ACCOUNT,  // Accounts dept — processes leave payments and loan disbursements
        ADMIN     // HR — processes leave and loans, manages staff bio
    }

    public enum ApprovalLevel {
        NONE,       // Regular employee
        UNIT_HEAD,  // Level 1 approver (per dept)
        DIV_HEAD,   // Level 2 approver (per dept)
        MD          // Managing Director — final loan approver (company-wide)
    }
}
