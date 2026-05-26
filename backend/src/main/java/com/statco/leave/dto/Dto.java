package com.statco.leave.dto;

import com.statco.leave.model.LeaveRequest;
import com.statco.leave.model.User;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

public class Dto {

    // -------------------------------------------------------
    // Auth
    // -------------------------------------------------------

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Data
    public static class CreateStaffRequest {
        @NotBlank
        private String fullName;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 6)
        private String temporaryPassword;
        private String department;
        private String position;
        private String phone;
        private User.Role role = User.Role.EMPLOYEE;
        private User.ApprovalLevel approvalLevel = User.ApprovalLevel.NONE;
        private Long gradeId;
    }

    @Data
    public static class RegisterRequest {
        @NotBlank
        private String fullName;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 6)
        private String password;
        private String department;
        private String position;
        private User.Role role;
    }

    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private String department;
        private String position;
        private String phone;
    }

    @Data
    public static class ChangePasswordRequest {
        private String currentPassword;
        @NotBlank @Size(min = 6)
        private String newPassword;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String email;
        private String fullName;
        private String role;
        private String approvalLevel;
        private Long userId;
        private boolean mustChangePassword;

        public AuthResponse(String token, User user) {
            this.token = token;
            this.email = user.getEmail();
            this.fullName = user.getFullName();
            this.role = user.getRole().name();
            this.approvalLevel = user.getApprovalLevel().name();
            this.userId = user.getId();
            this.mustChangePassword = user.isMustChangePassword();
        }
    }

    // -------------------------------------------------------
    // Staff / Bio Data
    // -------------------------------------------------------

    /**
     * HR updates employee bio data — including leave allowance and sick leave total.
     */
    @Data
    public static class UpdateBioDataRequest {
        private String fullName;
        private String department;
        private String position;
        private String phone;
        private User.ApprovalLevel approvalLevel;

        // HR-managed leave fields
        private BigDecimal leaveAllowanceAmount;  // Annual leave payment amount
        private Integer sickLeaveTotal;           // Confirmed sick leave days
    }

    // -------------------------------------------------------
    // Leave Application
    // -------------------------------------------------------

    /**
     * Submitted by employee when applying for leave.
     * handoverNote is handled as MultipartFile in the controller — not in this DTO.
     */
    @Data
    public static class LeaveRequestDto {
        @NotNull
        private LeaveRequest.LeaveType leaveType;
        @NotNull
        private LocalDate startDate;
        @NotNull
        private LocalDate endDate;
        @Size(max = 500)
        private String reason;
        @NotBlank(message = "Relief staff name is required")
        private String reliefStaffName;
        // handoverNote file is sent as MultipartFile alongside this DTO
    }

    // -------------------------------------------------------
    // Approval (Unit Head / Div Head)
    // -------------------------------------------------------

    /**
     * Used by Unit Head and Div Head to approve or reject.
     * Backend determines which level based on the reviewer's approvalLevel.
     */
    @Data
    public static class LeaveApprovalRequest {
        @NotNull
        private boolean approved;
        @Size(max = 500)
        private String comment;
    }

    // -------------------------------------------------------
    // HR Processing
    // -------------------------------------------------------

    /**
     * HR processes a leave that has been approved by both Unit Head and Div Head.
     */
    @Data
    public static class HrProcessRequest {
        @Size(max = 500)
        private String comment;
        // Payment amount is auto-pulled from employee bio — HR just confirms
    }

    // -------------------------------------------------------
    // Resumption Confirmation
    // -------------------------------------------------------

    /**
     * HR or HOD confirms employee has returned from leave.
     */
    @Data
    public static class ResumeConfirmRequest {
        @NotNull
        private Long leaveRequestId;
        @Size(max = 500)
        private String note;
    }

    // -------------------------------------------------------
    // Accounts — EOP Upload
    // -------------------------------------------------------

    /**
     * Accounts marks a payment request as processed.
     * EOP document is sent as MultipartFile alongside this DTO.
     */
    @Data
    public static class EopProcessRequest {
        @Size(max = 500)
        private String accountNote;
        // eopDocument file is sent as MultipartFile alongside this DTO
    }
}
