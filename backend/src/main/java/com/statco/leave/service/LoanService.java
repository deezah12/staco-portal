package com.statco.leave.service;

import com.statco.leave.dto.LoanDto;
import com.statco.leave.model.*;
import com.statco.leave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRequestRepository loanRepo;
    private final LoanGuarantorRepository guarantorRepo;
    private final LoanRepaymentRepository repaymentRepo;
    private final UserRepository userRepo;
    private final GradeRepository gradeRepo;
    private final EmailService emailService;

    private static final BigDecimal MAX_SALARY_RATIO = new BigDecimal("0.33");
    private static final Set<Integer> VALID_DURATIONS = Set.of(3, 6, 9, 12);
    private static final String DISBURSE_DIR = "uploads/disbursement-docs/";

    // -------------------------------------------------------
    // EMPLOYEE: Apply for loan
    // -------------------------------------------------------

    @Transactional
    public LoanRequest applyForLoan(User employee, LoanDto.ApplyRequest dto) {
        // Validate repayment duration
        if (!VALID_DURATIONS.contains(dto.getRepaymentMonths())) {
            throw new RuntimeException("Repayment period must be 3, 6, 9, or 12 months");
        }

        // Block if employee already has an active loan
        List<LoanRequest> activeLoans = loanRepo.findActiveLoansByEmployee(employee);
        if (!activeLoans.isEmpty()) {
            throw new RuntimeException("You already have an active loan. Please complete repayment before applying again.");
        }

        // Validate 33% salary rule
        BigDecimal monthly = dto.getAmount().divide(new BigDecimal(dto.getRepaymentMonths()), 2, RoundingMode.HALF_UP);
        BigDecimal maxMonthly = dto.getMonthlySalary().multiply(MAX_SALARY_RATIO).setScale(2, RoundingMode.HALF_UP);
        if (monthly.compareTo(maxMonthly) > 0) {
            throw new RuntimeException(String.format(
                "Monthly deduction ₦%.2f exceeds 33%% of salary (₦%.2f). Increase repayment months or reduce amount.",
                monthly, maxMonthly));
        }

        // Validate guarantors
        User g1 = userRepo.findById(dto.getGuarantor1Id())
                .orElseThrow(() -> new RuntimeException("Guarantor 1 not found"));
        User g2 = userRepo.findById(dto.getGuarantor2Id())
                .orElseThrow(() -> new RuntimeException("Guarantor 2 not found"));

        validateGuarantor(g1, employee, "Guarantor 1");
        validateGuarantor(g2, employee, "Guarantor 2");

        if (g1.getId().equals(g2.getId())) {
            throw new RuntimeException("Guarantors must be different people");
        }

        // Build loan
        LoanRequest loan = new LoanRequest();
        loan.setEmployee(employee);
        loan.setAmount(dto.getAmount());
        loan.setMonthlySalary(dto.getMonthlySalary());
        loan.setRepaymentMonths(dto.getRepaymentMonths());
        loan.setMonthlyDeduction(monthly);
        loan.setReason(dto.getReason());
        loan.setPurpose(dto.getPurpose());
        loan.setOutstandingBalance(dto.getAmount());

        // Determine initial status based on applicant's level
        determineInitialStatus(loan, employee);
        LoanRequest saved = loanRepo.save(loan);

        // Create guarantor slots
        createGuarantorSlot(saved, g1, 1);
        createGuarantorSlot(saved, g2, 2);

        // Notify guarantors via email + they'll see it in-app
        emailService.sendGuarantorInvite(saved, g1);
        emailService.sendGuarantorInvite(saved, g2);

        return saved;
    }

    private void validateGuarantor(User guarantor, User applicant, String label) {
        if (guarantor.getId().equals(applicant.getId())) {
            throw new RuntimeException("You cannot be your own guarantor");
        }
        if (!guarantor.isActive()) {
            throw new RuntimeException(label + " (" + guarantor.getFullName() + ") is not an active employee");
        }
        // Only enforce grade hierarchy when both parties have grades assigned
        if (guarantor.getGrade() != null && applicant.getGrade() != null) {
            if (guarantor.getGrade().getLevel() <= applicant.getGrade().getLevel()) {
                throw new RuntimeException(label + " (" + guarantor.getFullName() + ") must have a higher grade than you");
            }
        }
    }

    private void determineInitialStatus(LoanRequest loan, User employee) {
        switch (employee.getApprovalLevel()) {
            case UNIT_HEAD -> {
                loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setStatus(LoanRequest.LoanStatus.PENDING_DIV_HEAD);
            }
            case DIV_HEAD -> {
                loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setDivHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setStatus(LoanRequest.LoanStatus.PENDING_MD);
            }
            case MD -> {
                loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setDivHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setMdStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setStatus(LoanRequest.LoanStatus.APPROVED);
            }
            default -> loan.setStatus(LoanRequest.LoanStatus.PENDING_GUARANTORS);
        }
        if (employee.getRole() == User.Role.ADMIN) {
            loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
            loan.setDivHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
            loan.setMdStatus(LoanRequest.ApprovalStatus.SKIPPED);
            loan.setStatus(LoanRequest.LoanStatus.APPROVED);
        }
    }

    private void createGuarantorSlot(LoanRequest loan, User guarantorUser, int slot) {
        LoanGuarantor g = new LoanGuarantor();
        g.setLoanRequest(loan);
        g.setGuarantor(guarantorUser);
        g.setSlotNumber(slot);
        guarantorRepo.save(g);
    }

    // -------------------------------------------------------
    // GUARANTOR: In-app response
    // -------------------------------------------------------

    @Transactional
    public LoanGuarantor respondAsGuarantor(User guarantorUser, LoanDto.GuarantorRespondRequest dto) {
        LoanRequest loan = loanRepo.findById(dto.getLoanRequestId())
                .orElseThrow(() -> new RuntimeException("Loan request not found"));

        LoanGuarantor g = guarantorRepo.findByLoanRequestAndGuarantor(loan, guarantorUser)
                .orElseThrow(() -> new RuntimeException("You are not a guarantor for this loan"));

        if (g.getStatus() != LoanGuarantor.GuarantorStatus.PENDING) {
            throw new RuntimeException("You have already responded to this guarantor request");
        }

        g.setComment(dto.getComment());
        g.setRespondedAt(LocalDateTime.now());

        if (dto.isAccept()) {
            g.setStatus(LoanGuarantor.GuarantorStatus.SIGNED);
        } else {
            g.setStatus(LoanGuarantor.GuarantorStatus.DECLINED);
            loan.setStatus(LoanRequest.LoanStatus.REJECTED);
            loanRepo.save(loan);
            emailService.sendLoanRejected(loan, "Guarantor " + guarantorUser.getFullName() + " declined to guarantee your loan.");
            return guarantorRepo.save(g);
        }

        LoanGuarantor saved = guarantorRepo.save(g);

        // Check if both guarantors have signed
        List<LoanGuarantor> all = guarantorRepo.findByLoanRequest(loan);
        boolean allSigned = all.stream().allMatch(x -> x.getStatus() == LoanGuarantor.GuarantorStatus.SIGNED);
        if (allSigned) {
            // Advance to first approval level
            advanceAfterGuarantors(loan);
            loanRepo.save(loan);
        }

        return saved;
    }

    private void advanceAfterGuarantors(LoanRequest loan) {
        // Find Unit Head for employee's department
        Optional<User> unitHead = userRepo.findUnitHeadByDepartment(loan.getEmployee().getDepartment());
        if (unitHead.isPresent()) {
            loan.setStatus(LoanRequest.LoanStatus.PENDING_UNIT_HEAD);
            emailService.sendLoanApprovalRequest(loan, unitHead.get(), "Unit Head");
        } else {
            // No unit head — try div head
            Optional<User> divHead = userRepo.findDivHeadByDepartment(loan.getEmployee().getDepartment());
            if (divHead.isPresent()) {
                loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setStatus(LoanRequest.LoanStatus.PENDING_DIV_HEAD);
                emailService.sendLoanApprovalRequest(loan, divHead.get(), "Divisional Head");
            } else {
                // No dept heads — go straight to MD
                loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setDivHeadStatus(LoanRequest.ApprovalStatus.SKIPPED);
                loan.setStatus(LoanRequest.LoanStatus.PENDING_MD);
                notifyMd(loan);
            }
        }
    }

    // -------------------------------------------------------
    // UNIT HEAD: Level 1 Approval
    // -------------------------------------------------------

    @Transactional
    public LoanRequest unitHeadReview(Long loanId, User reviewer, LoanDto.LoanApprovalRequest dto) {
        if (reviewer.getApprovalLevel() != User.ApprovalLevel.UNIT_HEAD) {
            throw new RuntimeException("You are not authorised as a Unit Head");
        }
        LoanRequest loan = getLoanAtStatus(loanId, LoanRequest.LoanStatus.PENDING_UNIT_HEAD);
        if (!reviewer.getDepartment().equalsIgnoreCase(loan.getEmployee().getDepartment())) {
            throw new RuntimeException("You can only approve loans within your department");
        }

        loan.setUnitHeadReviewer(reviewer);
        loan.setUnitHeadComment(dto.getComment());
        loan.setUnitHeadReviewedAt(LocalDateTime.now());

        if (dto.isApproved()) {
            loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.APPROVED);
            loan.setStatus(LoanRequest.LoanStatus.PENDING_DIV_HEAD);
            userRepo.findDivHeadByDepartment(loan.getEmployee().getDepartment())
                    .ifPresent(dh -> emailService.sendLoanApprovalRequest(loan, dh, "Divisional Head"));
        } else {
            loan.setUnitHeadStatus(LoanRequest.ApprovalStatus.REJECTED);
            loan.setStatus(LoanRequest.LoanStatus.REJECTED);
            emailService.sendLoanRejected(loan, "Unit Head comment: " + dto.getComment());
        }
        return loanRepo.save(loan);
    }

    // -------------------------------------------------------
    // DIV HEAD: Level 2 Approval
    // -------------------------------------------------------

    @Transactional
    public LoanRequest divHeadReview(Long loanId, User reviewer, LoanDto.LoanApprovalRequest dto) {
        if (reviewer.getApprovalLevel() != User.ApprovalLevel.DIV_HEAD) {
            throw new RuntimeException("You are not authorised as a Divisional Head");
        }
        LoanRequest loan = getLoanAtStatus(loanId, LoanRequest.LoanStatus.PENDING_DIV_HEAD);
        if (!reviewer.getDepartment().equalsIgnoreCase(loan.getEmployee().getDepartment())) {
            throw new RuntimeException("You can only approve loans within your department");
        }

        loan.setDivHeadReviewer(reviewer);
        loan.setDivHeadComment(dto.getComment());
        loan.setDivHeadReviewedAt(LocalDateTime.now());

        if (dto.isApproved()) {
            loan.setDivHeadStatus(LoanRequest.ApprovalStatus.APPROVED);
            loan.setStatus(LoanRequest.LoanStatus.PENDING_MD);
            notifyMd(loan);
        } else {
            loan.setDivHeadStatus(LoanRequest.ApprovalStatus.REJECTED);
            loan.setStatus(LoanRequest.LoanStatus.REJECTED);
            emailService.sendLoanRejected(loan, "Divisional Head comment: " + dto.getComment());
        }
        return loanRepo.save(loan);
    }

    // -------------------------------------------------------
    // MD: Level 3 (Final) Approval
    // -------------------------------------------------------

    @Transactional
    public LoanRequest mdReview(Long loanId, User reviewer, LoanDto.MdApprovalRequest dto) {
        if (reviewer.getApprovalLevel() != User.ApprovalLevel.MD) {
            throw new RuntimeException("You are not authorised as MD");
        }
        LoanRequest loan = getLoanAtStatus(loanId, LoanRequest.LoanStatus.PENDING_MD);

        loan.setMdReviewer(reviewer);
        loan.setMdComment(dto.getComment());
        loan.setMdReviewedAt(LocalDateTime.now());

        if (dto.isApproved()) {
            loan.setMdStatus(LoanRequest.ApprovalStatus.APPROVED);
            loan.setStatus(LoanRequest.LoanStatus.APPROVED);
            // Notify HR to process
            userRepo.findByRole(User.Role.ADMIN)
                    .forEach(hr -> emailService.sendLoanApprovalRequest(loan, hr, "HR"));
        } else {
            loan.setMdStatus(LoanRequest.ApprovalStatus.REJECTED);
            loan.setStatus(LoanRequest.LoanStatus.REJECTED);
            emailService.sendLoanRejected(loan, "MD comment: " + dto.getComment());
        }
        return loanRepo.save(loan);
    }

    // -------------------------------------------------------
    // HR: Process loan (initiate disbursement)
    // -------------------------------------------------------

    @Transactional
    public LoanRequest hrProcess(Long loanId, User hr, LoanDto.HrProcessRequest dto) {
        if (hr.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("Only HR can process loans");
        }
        LoanRequest loan = getLoanAtStatus(loanId, LoanRequest.LoanStatus.APPROVED);

        loan.setHrProcessor(hr);
        loan.setHrComment(dto.getComment());
        loan.setHrProcessedAt(LocalDateTime.now());
        loan.setStatus(LoanRequest.LoanStatus.PROCESSING);

        if (dto.getDisbursementDate() != null) loan.setDisbursementDate(dto.getDisbursementDate());
        if (dto.getRepaymentStartDate() != null) loan.setRepaymentStartDate(dto.getRepaymentStartDate());

        LoanRequest saved = loanRepo.save(loan);

        // Notify Accounts to disburse
        userRepo.findByRole(User.Role.ACCOUNT)
                .forEach(acc -> emailService.sendLoanDisbursementRequest(saved, acc));

        return saved;
    }

    // -------------------------------------------------------
    // ACCOUNTS: Disburse loan
    // -------------------------------------------------------

    @Transactional
    public LoanRequest disburse(Long loanId, User accountUser, LoanDto.DisburseRequest dto, MultipartFile confirmation) {
        if (accountUser.getRole() != User.Role.ACCOUNT) {
            throw new RuntimeException("Only Accounts can disburse loans");
        }
        LoanRequest loan = getLoanAtStatus(loanId, LoanRequest.LoanStatus.PROCESSING);

        // Save confirmation document
        if (confirmation != null && !confirmation.isEmpty()) {
            String path = saveFile(confirmation, DISBURSE_DIR);
            loan.setDisbursementConfirmationPath(path);
        }

        loan.setDisbursedBy(accountUser);
        loan.setDisbursementDate(loan.getDisbursementDate() != null ? loan.getDisbursementDate() : LocalDate.now());
        loan.setRepaymentStartDate(loan.getRepaymentStartDate() != null ? loan.getRepaymentStartDate() : LocalDate.now().plusMonths(1));
        loan.setStatus(LoanRequest.LoanStatus.DISBURSED);

        generateRepaymentSchedule(loan);
        LoanRequest saved = loanRepo.save(loan);

        emailService.sendLoanDisbursed(saved);
        return saved;
    }

    // -------------------------------------------------------
    // Record repayment installment
    // -------------------------------------------------------

    @Transactional
    public LoanRepayment recordRepayment(Long loanId, LoanDto.RecordRepaymentRequest dto, User admin) {
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));

        LoanRepayment repayment = repaymentRepo.findById(dto.getRepaymentId())
                .orElseThrow(() -> new RuntimeException("Repayment installment not found"));

        if (repayment.getStatus() == LoanRepayment.RepaymentStatus.PAID) {
            throw new RuntimeException("Already marked as paid");
        }

        repayment.setStatus(LoanRepayment.RepaymentStatus.PAID);
        repayment.setPaidDate(LocalDate.now());
        repayment.setNotes(dto.getNotes());
        repayment.setRecordedBy(admin);
        repayment.setRecordedAt(LocalDateTime.now());
        LoanRepayment saved = repaymentRepo.save(repayment);

        // Update outstanding balance
        loan.setOutstandingBalance(loan.getOutstandingBalance().subtract(repayment.getAmount()).max(BigDecimal.ZERO));

        // Check if fully repaid
        List<LoanRepayment> all = repaymentRepo.findByLoanRequestOrderByInstallmentNumber(loan);
        boolean allPaid = all.stream().allMatch(r -> r.getStatus() == LoanRepayment.RepaymentStatus.PAID);
        if (allPaid) {
            loan.setFullyRepaid(true);
            loan.setStatus(LoanRequest.LoanStatus.FULLY_REPAID);
            loan.setHasOverdueInstallment(false);
        }
        loanRepo.save(loan);
        return saved;
    }

    // -------------------------------------------------------
    // EMPLOYEE: Cancel loan
    // -------------------------------------------------------

    @Transactional
    public LoanRequest cancelLoan(Long loanId, User employee) {
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getEmployee().getId().equals(employee.getId())) {
            throw new RuntimeException("Unauthorised");
        }
        if (loan.getStatus() == LoanRequest.LoanStatus.DISBURSED
                || loan.getStatus() == LoanRequest.LoanStatus.OVERDUE) {
            throw new RuntimeException("Cannot cancel a disbursed loan");
        }
        loan.setStatus(LoanRequest.LoanStatus.CANCELLED);
        return loanRepo.save(loan);
    }

    // -------------------------------------------------------
    // SCHEDULED: Daily overdue check (runs 6 AM)
    // -------------------------------------------------------

    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void checkOverdueInstallments() {
        LocalDate today = LocalDate.now();
        List<LoanRepayment> overdue = repaymentRepo.findOverdueInstallments(today);

        overdue.forEach(repayment -> {
            repayment.setStatus(LoanRepayment.RepaymentStatus.OVERDUE);
            repaymentRepo.save(repayment);

            LoanRequest loan = repayment.getLoanRequest();
            loan.setHasOverdueInstallment(true);
            if (loan.getStatus() == LoanRequest.LoanStatus.DISBURSED) {
                loan.setStatus(LoanRequest.LoanStatus.OVERDUE);
            }
            loanRepo.save(loan);
        });

        // Send daily overdue notifications for all loans with overdue installments
        loanRepo.findLoansWithOverdueInstallments().forEach(loan -> {
            try {
                List<LoanGuarantor> guarantors = guarantorRepo.findByLoanRequest(loan);
                emailService.sendLoanOverdueNotification(loan, guarantors);
                loan.setLastOverdueNotificationDate(today);
                loanRepo.save(loan);
            } catch (Exception e) {
                log.error("Failed to send overdue notification for loan {}: {}", loan.getId(), e.getMessage());
            }
        });
    }

    // -------------------------------------------------------
    // QUERIES
    // -------------------------------------------------------

    public List<LoanRequest> getMyLoans(User employee) {
        return loanRepo.findByEmployeeIdOrderByCreatedAtDesc(employee.getId());
    }

    public List<LoanGuarantor> getMyGuarantorRequests(User user) {
        return guarantorRepo.findByGuarantorOrderByInvitedAtDesc(user);
    }

    public List<LoanGuarantor> getMyPendingGuarantorRequests(User user) {
        return guarantorRepo.findByGuarantorAndStatusOrderByInvitedAtDesc(user, LoanGuarantor.GuarantorStatus.PENDING);
    }

    public List<LoanRequest> getPendingForApprover(User approver) {
        LoanRequest.LoanStatus targetStatus = switch (approver.getApprovalLevel()) {
            case UNIT_HEAD -> LoanRequest.LoanStatus.PENDING_UNIT_HEAD;
            case DIV_HEAD  -> LoanRequest.LoanStatus.PENDING_DIV_HEAD;
            case MD        -> LoanRequest.LoanStatus.PENDING_MD;
            default        -> throw new RuntimeException("You have no loan approval authority");
        };
        if (approver.getApprovalLevel() == User.ApprovalLevel.MD) {
            return loanRepo.findByStatusOrderByCreatedAtAsc(targetStatus);
        }
        return loanRepo.findByStatusAndDepartment(targetStatus, approver.getDepartment());
    }

    public List<LoanRequest> getPendingHr() {
        return loanRepo.findByStatusOrderByCreatedAtDesc(LoanRequest.LoanStatus.APPROVED);
    }

    public List<LoanRequest> getPendingAccounts() {
        return loanRepo.findByStatusOrderByCreatedAtDesc(LoanRequest.LoanStatus.PROCESSING);
    }

    public List<LoanRequest> getAllLoans() {
        return loanRepo.findAllByOrderByCreatedAtDesc();
    }

    public List<LoanRepayment> getRepaymentSchedule(Long loanId) {
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        return repaymentRepo.findByLoanRequestOrderByInstallmentNumber(loan);
    }

    public LoanRequest getLoanById(Long id) {
        return loanRepo.findById(id).orElseThrow(() -> new RuntimeException("Loan not found"));
    }

    public List<User> getEligibleGuarantors(User applicant) {
        if (applicant.getGrade() != null) {
            List<User> higherGrade = userRepo.findActiveUsersWithHigherGrade(applicant.getGrade().getLevel(), applicant.getId());
            if (!higherGrade.isEmpty()) return higherGrade;
        }
        // Fallback: no grades set up, or no higher-grade employees exist — return all active staff
        return userRepo.findByActiveTrueAndIdNot(applicant.getId());
    }

    public Map<String, Object> getLoanStats() {
        return new HashMap<>() {{
            put("pendingMd", loanRepo.countPendingMd());
            put("activeLoans", loanRepo.countActiveLoans());
            put("totalLoans", loanRepo.count());
        }};
    }

    // -------------------------------------------------------
    // GRADE management
    // -------------------------------------------------------

    public Grade createGrade(LoanDto.GradeRequest dto) {
        Grade grade = new Grade();
        grade.setName(dto.getName());
        grade.setLevel(dto.getLevel());
        grade.setDescription(dto.getDescription());
        return gradeRepo.save(grade);
    }

    public List<Grade> getAllGrades() {
        return gradeRepo.findAllByOrderByLevelAsc();
    }

    // -------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------

    private LoanRequest getLoanAtStatus(Long loanId, LoanRequest.LoanStatus expectedStatus) {
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (loan.getStatus() != expectedStatus) {
            throw new RuntimeException("Loan is not at the expected stage: " + expectedStatus);
        }
        return loan;
    }

    private void notifyMd(LoanRequest loan) {
        userRepo.findByApprovalLevel(User.ApprovalLevel.MD)
                .forEach(md -> emailService.sendLoanApprovalRequest(loan, md, "MD"));
    }

    private void generateRepaymentSchedule(LoanRequest loan) {
        LocalDate start = loan.getRepaymentStartDate();
        for (int i = 1; i <= loan.getRepaymentMonths(); i++) {
            LoanRepayment r = new LoanRepayment();
            r.setLoanRequest(loan);
            r.setInstallmentNumber(i);
            r.setAmount(loan.getMonthlyDeduction());
            r.setDueDate(start.plusMonths(i - 1));
            repaymentRepo.save(r);
        }
    }

    private String saveFile(MultipartFile file, String directory) {
        try {
            Path uploadPath = Paths.get(directory);
            Files.createDirectories(uploadPath);
            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            return filePath.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to save file: " + e.getMessage());
        }
    }
}
