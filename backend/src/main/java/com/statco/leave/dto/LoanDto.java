package com.statco.leave.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanDto {

    @Data
    public static class ApplyRequest {
        @NotNull @DecimalMin("1000.00")
        private BigDecimal amount;

        @NotNull @DecimalMin("1.00")
        private BigDecimal monthlySalary;

        /** Must be one of: 3, 6, 9, 12 */
        @NotNull
        private int repaymentMonths;

        @NotBlank @Size(max = 1000)
        private String reason;

        private String purpose;

        @NotNull
        private Long guarantor1Id;

        @NotNull
        private Long guarantor2Id;
    }

    /** In-app guarantor response — no token needed, user must be logged in */
    @Data
    public static class GuarantorRespondRequest {
        @NotNull
        private Long loanRequestId;
        private boolean accept; // true = sign, false = decline
        @Size(max = 500)
        private String comment;
    }

    /** Unit Head or Div Head loan approval */
    @Data
    public static class LoanApprovalRequest {
        @NotNull
        private boolean approved;
        @Size(max = 500)
        private String comment;
    }

    /** MD final approval */
    @Data
    public static class MdApprovalRequest {
        @NotNull
        private boolean approved;
        @Size(max = 500)
        private String comment;
    }

    /** HR initiates processing after MD approval */
    @Data
    public static class HrProcessRequest {
        @Size(max = 500)
        private String comment;
        private LocalDate disbursementDate;
        private LocalDate repaymentStartDate;
    }

    /** Accounts uploads disbursement confirmation and marks DISBURSED */
    @Data
    public static class DisburseRequest {
        @Size(max = 500)
        private String note;
        // disbursement confirmation doc sent as MultipartFile
    }

    /** Record a repayment installment as paid */
    @Data
    public static class RecordRepaymentRequest {
        @NotNull
        private Long repaymentId;
        private String notes;
    }

    /** HR or Accounts creates a grade */
    @Data
    public static class GradeRequest {
        @NotBlank
        private String name;
        @NotNull @Min(1)
        private int level;
        private String description;
    }
}
