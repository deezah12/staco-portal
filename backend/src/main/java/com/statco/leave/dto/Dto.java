package com.statco.leave.dto;

import com.statco.leave.model.LeaveRequest;
import com.statco.leave.model.User;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // -------------------------------------------------------
    // User / Staff response — safe, proxy-free projection
    // -------------------------------------------------------

    @Data
    public static class UserDto {
        private Long id;
        private String fullName;
        private String email;
        private String department;
        private String position;
        private String phone;
        private String role;
        private String approvalLevel;
        private boolean active;
        private boolean mustChangePassword;
        private BigDecimal leaveAllowanceAmount;
        private int sickLeaveTotal;
        private LocalDateTime createdAt;
        private GradeInfo grade;

        @Data
        public static class GradeInfo {
            private Long id;
            private String name;
            private int level;
            private String description;
        }

        public static UserDto from(User user) {
            UserDto dto = new UserDto();
            dto.id = user.getId();
            dto.fullName = user.getFullName();
            dto.email = user.getEmail();
            dto.department = user.getDepartment();
            dto.position = user.getPosition();
            dto.phone = user.getPhone();
            dto.role = user.getRole().name();
            dto.approvalLevel = user.getApprovalLevel().name();
            dto.active = user.isActive();
            dto.mustChangePassword = user.isMustChangePassword();
            dto.leaveAllowanceAmount = user.getLeaveAllowanceAmount();
            dto.sickLeaveTotal = user.getSickLeaveTotal();
            dto.createdAt = user.getCreatedAt();
            if (user.getGrade() != null) {
                GradeInfo g = new GradeInfo();
                g.id = user.getGrade().getId();
                g.name = user.getGrade().getName();
                g.level = user.getGrade().getLevel();
                g.description = user.getGrade().getDescription();
                dto.grade = g;
            }
            return dto;
        }
    }
}
