package com.statco.leave.service;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.*;
import com.statco.leave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository leaveRepo;
    private final LeaveBalanceRepository balanceRepo;
    private final LeavePaymentRequestRepository paymentRepo;
    private final UserRepository userRepo;
    private final EmailService emailService;

    private static final String UPLOAD_DIR = "uploads/handover-notes/";
    private static final String EOP_DIR    = "uploads/eop-documents/";
    private static final int    PAID_LEAVE_MIN_DAYS = 10;

    // -------------------------------------------------------
    // EMPLOYEE: Apply for leave
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest applyForLeave(User employee, Dto.LeaveRequestDto dto, MultipartFile handoverNote) {
        // Validate dates
        int days = (int) ChronoUnit.DAYS.between(dto.getStartDate(), dto.getEndDate()) + 1;
        if (days <= 0) throw new RuntimeException("End date must be after start date");

        // Handover note is mandatory
        if (handoverNote == null || handoverNote.isEmpty()) {
            throw new RuntimeException("Handover note is required to apply for leave");
        }

        // Validate leave balance
        LeaveBalance balance = balanceRepo.findByEmployee(employee)
                .orElseThrow(() -> new RuntimeException("Leave balance not found"));
        validateBalance(balance, dto.getLeaveType(), days);

        // Save handover note file
        String filePath = saveFile(handoverNote, UPLOAD_DIR);

        // Build leave request
        LeaveRequest request = new LeaveRequest();
        request.setEmployee(employee);
        request.setLeaveType(dto.getLeaveType());
        request.setStartDate(dto.getStartDate());
        request.setEndDate(dto.getEndDate());
        request.setTotalDays(days);
        request.setReason(dto.getReason());
        request.setReliefStaffName(dto.getReliefStaffName());
        request.setHandoverNotePath(filePath);
        request.setHandoverNoteFileName(handoverNote.getOriginalFilename());

        // Determine starting status based on applicant's approval level
        determineInitialStatus(request, employee);

        LeaveRequest saved = leaveRepo.save(request);

        // Notify first approver
        notifyFirstApprover(saved);

        return saved;
    }

    /**
     * Sets the initial status based on who is applying.
     * Unit Head skips Level 1. Div Head skips Levels 1 & 2. HR auto-approves.
     */
    private void determineInitialStatus(LeaveRequest request, User employee) {
        switch (employee.getApprovalLevel()) {
            case UNIT_HEAD -> {
                request.setUnitHeadStatus(LeaveRequest.ApprovalStatus.SKIPPED);
                request.setStatus(LeaveRequest.Status.PENDING_DIV_HEAD);
            }
            case DIV_HEAD -> {
                request.setUnitHeadStatus(LeaveRequest.ApprovalStatus.SKIPPED);
                request.setDivHeadStatus(LeaveRequest.ApprovalStatus.SKIPPED);
                request.setStatus(LeaveRequest.Status.PENDING_HR);
            }
            default -> request.setStatus(LeaveRequest.Status.PENDING_UNIT_HEAD);
        }

        // ADMIN (HR) leave goes straight to PENDING_HR
        if (employee.getRole() == User.Role.ADMIN) {
            request.setUnitHeadStatus(LeaveRequest.ApprovalStatus.SKIPPED);
            request.setDivHeadStatus(LeaveRequest.ApprovalStatus.SKIPPED);
            request.setStatus(LeaveRequest.Status.PENDING_HR);
        }
    }

    // -------------------------------------------------------
    // UNIT HEAD: Level 1 Approval
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest unitHeadReview(Long requestId, User reviewer, Dto.LeaveApprovalRequest dto) {
        if (reviewer.getApprovalLevel() != User.ApprovalLevel.UNIT_HEAD) {
            throw new RuntimeException("You are not authorised as a Unit Head");
        }

        LeaveRequest request = leaveRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (request.getStatus() != LeaveRequest.Status.PENDING_UNIT_HEAD) {
            throw new RuntimeException("This request is not awaiting Unit Head approval");
        }

        // Unit Head must be in the same department
        if (!reviewer.getDepartment().equalsIgnoreCase(request.getEmployee().getDepartment())) {
            throw new RuntimeException("You can only approve requests within your department");
        }

        request.setUnitHeadReviewer(reviewer);
        request.setUnitHeadComment(dto.getComment());
        request.setUnitHeadReviewedAt(LocalDateTime.now());

        if (dto.isApproved()) {
            request.setUnitHeadStatus(LeaveRequest.ApprovalStatus.APPROVED);
            request.setStatus(LeaveRequest.Status.PENDING_DIV_HEAD);
            notifyDivHead(request);
        } else {
            request.setUnitHeadStatus(LeaveRequest.ApprovalStatus.REJECTED);
            request.setStatus(LeaveRequest.Status.REJECTED);
            emailService.sendLeaveRejected(request, "Unit Head", dto.getComment());
        }

        return leaveRepo.save(request);
    }

    // -------------------------------------------------------
    // DIV HEAD: Level 2 Approval
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest divHeadReview(Long requestId, User reviewer, Dto.LeaveApprovalRequest dto) {
        if (reviewer.getApprovalLevel() != User.ApprovalLevel.DIV_HEAD) {
            throw new RuntimeException("You are not authorised as a Divisional Head");
        }

        LeaveRequest request = leaveRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (request.getStatus() != LeaveRequest.Status.PENDING_DIV_HEAD) {
            throw new RuntimeException("This request is not awaiting Divisional Head approval");
        }

        if (!reviewer.getDepartment().equalsIgnoreCase(request.getEmployee().getDepartment())) {
            throw new RuntimeException("You can only approve requests within your department");
        }

        request.setDivHeadReviewer(reviewer);
        request.setDivHeadComment(dto.getComment());
        request.setDivHeadReviewedAt(LocalDateTime.now());

        if (dto.isApproved()) {
            request.setDivHeadStatus(LeaveRequest.ApprovalStatus.APPROVED);
            request.setStatus(LeaveRequest.Status.PENDING_HR);
            notifyHr(request);
        } else {
            request.setDivHeadStatus(LeaveRequest.ApprovalStatus.REJECTED);
            request.setStatus(LeaveRequest.Status.REJECTED);
            emailService.sendLeaveRejected(request, "Divisional Head", dto.getComment());
        }

        return leaveRepo.save(request);
    }

    // -------------------------------------------------------
    // HR: Process Leave (Level 3)
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest hrProcess(Long requestId, User hr, Dto.HrProcessRequest dto) {
        if (hr.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("Only HR can process leave requests");
        }

        LeaveRequest request = leaveRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (request.getStatus() != LeaveRequest.Status.PENDING_HR) {
            throw new RuntimeException("This request is not awaiting HR processing");
        }

        request.setHrProcessor(hr);
        request.setHrComment(dto.getComment());
        request.setHrProcessedAt(LocalDateTime.now());
        request.setHrStatus(LeaveRequest.ApprovalStatus.APPROVED);
        request.setStatus(LeaveRequest.Status.ACTIVE);

        // Check if annual leave payment applies
        boolean paymentApplicable = request.getLeaveType() == LeaveRequest.LeaveType.ANNUAL
                && request.getTotalDays() >= PAID_LEAVE_MIN_DAYS;
        request.setPaymentApplicable(paymentApplicable);

        LeaveRequest saved = leaveRepo.save(request);

        // Deduct from leave balance
        deductBalance(saved);

        // Send confirmation email with .ics calendar attachment
        emailService.sendLeaveConfirmation(saved);

        // Create payment request for Accounts if applicable
        if (paymentApplicable) {
            createPaymentRequest(saved, hr);
        }

        return saved;
    }

    // -------------------------------------------------------
    // RESUMPTION CONFIRMATION
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest confirmResumptionByHr(Long requestId, User hr) {
        LeaveRequest request = getActiveLeave(requestId);
        request.setResumedConfirmedByHr(true);
        checkAndFinaliseResumption(request);
        return leaveRepo.save(request);
    }

    @Transactional
    public LeaveRequest confirmResumptionByHod(Long requestId, User hod) {
        // HOD = UNIT_HEAD or DIV_HEAD in same department
        LeaveRequest request = getActiveLeave(requestId);
        if (!hod.getDepartment().equalsIgnoreCase(request.getEmployee().getDepartment())) {
            throw new RuntimeException("You can only confirm resumption for your department");
        }
        request.setResumedConfirmedByHod(true);
        checkAndFinaliseResumption(request);
        return leaveRepo.save(request);
    }

    private LeaveRequest getActiveLeave(Long requestId) {
        LeaveRequest request = leaveRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));
        if (request.getStatus() != LeaveRequest.Status.ACTIVE) {
            throw new RuntimeException("Leave is not currently active");
        }
        return request;
    }

    private void checkAndFinaliseResumption(LeaveRequest request) {
        if (request.isFullyResumed()) {
            request.setStatus(LeaveRequest.Status.RESUMED);
            request.setResumedAt(LocalDateTime.now());
            // Send welcome back email
            emailService.sendWelcomeBack(request);
        }
    }

    // -------------------------------------------------------
    // ACCOUNTS: Process EOP
    // -------------------------------------------------------

    @Transactional
    public LeavePaymentRequest processEop(Long paymentRequestId, User accountUser,
                                          Dto.EopProcessRequest dto, MultipartFile eopDoc) {
        if (accountUser.getRole() != User.Role.ACCOUNT) {
            throw new RuntimeException("Only Accounts staff can process EOP");
        }

        LeavePaymentRequest payment = paymentRepo.findById(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Payment request not found"));

        if (payment.getStatus() != LeavePaymentRequest.PaymentStatus.PENDING) {
            throw new RuntimeException("Payment request already processed");
        }

        String filePath = saveFile(eopDoc, EOP_DIR);
        payment.setEopDocumentPath(filePath);
        payment.setEopDocumentFileName(eopDoc.getOriginalFilename());
        payment.setAccountNote(dto.getAccountNote());
        payment.setProcessedByAccount(accountUser);
        payment.setProcessedAt(LocalDateTime.now());
        payment.setStatus(LeavePaymentRequest.PaymentStatus.PROCESSED);

        return paymentRepo.save(payment);
    }

    // -------------------------------------------------------
    // EMPLOYEE: Cancel leave
    // -------------------------------------------------------

    @Transactional
    public LeaveRequest cancelLeave(Long requestId, User employee) {
        LeaveRequest request = leaveRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (!request.getEmployee().getId().equals(employee.getId())) {
            throw new RuntimeException("Unauthorised");
        }
        if (request.getStatus() == LeaveRequest.Status.ACTIVE
                && request.getStartDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Cannot cancel an ongoing leave");
        }
        if (request.getStatus() == LeaveRequest.Status.CANCELLED) {
            throw new RuntimeException("Already cancelled");
        }

        request.setStatus(LeaveRequest.Status.CANCELLED);

        // Cancel pending payment request if it exists
        paymentRepo.findByLeaveRequestId(requestId).ifPresent(p -> {
            p.setStatus(LeavePaymentRequest.PaymentStatus.CANCELLED);
            paymentRepo.save(p);
        });

        return leaveRepo.save(request);
    }

    // -------------------------------------------------------
    // QUERIES
    // -------------------------------------------------------

    public List<LeaveRequest> getMyRequests(User employee) {
        return leaveRepo.findByEmployeeOrderByCreatedAtDesc(employee);
    }

    public List<LeaveRequest> getAllRequests() {
        return leaveRepo.findAllByOrderByCreatedAtDesc();
    }

    /** Requests pending this user's approval based on their level and department */
    public List<LeaveRequest> getPendingForApprover(User approver) {
        LeaveRequest.Status targetStatus = switch (approver.getApprovalLevel()) {
            case UNIT_HEAD -> LeaveRequest.Status.PENDING_UNIT_HEAD;
            case DIV_HEAD  -> LeaveRequest.Status.PENDING_DIV_HEAD;
            default        -> throw new RuntimeException("You have no approval authority");
        };
        return leaveRepo.findByStatusAndDepartment(targetStatus, approver.getDepartment());
    }

    public List<LeaveRequest> getPendingHr() {
        return leaveRepo.findByStatusOrderByCreatedAtAsc(LeaveRequest.Status.PENDING_HR);
    }

    public List<LeaveRequest> getOverstayedLeaves() {
        return leaveRepo.findOverstayedLeaves(LocalDate.now());
    }

    public LeaveBalance getBalance(User employee) {
        return balanceRepo.findByEmployee(employee)
                .orElseThrow(() -> new RuntimeException("Balance not found"));
    }

    public List<LeavePaymentRequest> getPendingPayments() {
        return paymentRepo.findByStatusOrderByCreatedAtAsc(LeavePaymentRequest.PaymentStatus.PENDING);
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", leaveRepo.count());
        stats.put("pendingRequests", leaveRepo.countPendingRequests());
        stats.put("activeLeaves", leaveRepo.countActiveLeaves());
        stats.put("overstayed", leaveRepo.findOverstayedLeaves(LocalDate.now()).size());
        stats.put("totalEmployees", userRepo.findByRole(User.Role.EMPLOYEE).size());
        return stats;
    }

    // -------------------------------------------------------
    // SCHEDULED JOBS
    // -------------------------------------------------------

    /** Runs every morning at 7:00 AM */
    @Scheduled(cron = "0 0 7 * * *")
    public void sendLeaveReminders() {
        LocalDate today = LocalDate.now();

        // 2-day reminder — resumption is in 2 days
        LocalDate twoDaysFromNow = today.plusDays(2);
        leaveRepo.findLeavesEndingOn(twoDaysFromNow).forEach(leave -> {
            try {
                emailService.sendTwoDayReminder(leave);
                leave.setTwoDayReminderSent(true);
                leaveRepo.save(leave);
            } catch (Exception e) {
                log.error("Failed to send 2-day reminder for leave {}: {}", leave.getId(), e.getMessage());
            }
        });

        // Resumption day — employee resumes today
        leaveRepo.findResumingToday(today).forEach(leave -> {
            try {
                emailService.sendResumptionDayReminder(leave);
                leave.setResumptionDayReminderSent(true);
                leaveRepo.save(leave);
            } catch (Exception e) {
                log.error("Failed to send resumption reminder for leave {}: {}", leave.getId(), e.getMessage());
            }
        });
    }

    // -------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------

    private void createPaymentRequest(LeaveRequest leave, User hr) {
        LeavePaymentRequest payment = new LeavePaymentRequest();
        payment.setLeaveRequest(leave);
        payment.setEmployee(leave.getEmployee());
        payment.setAmount(leave.getEmployee().getLeaveAllowanceAmount());
        payment.setCreatedByHr(hr);
        payment.setHrNote("Annual leave allowance for " + leave.getTotalDays() + " days");
        paymentRepo.save(payment);

        leave.setPaymentRequestSent(true);
        leaveRepo.save(leave);

        // Notify accounts
        userRepo.findByRole(User.Role.ACCOUNT).forEach(acc ->
            emailService.sendPaymentRequestNotification(payment, acc)
        );
    }

    private void notifyFirstApprover(LeaveRequest request) {
        if (request.getStatus() == LeaveRequest.Status.PENDING_UNIT_HEAD) {
            userRepo.findUnitHeadByDepartment(request.getEmployee().getDepartment())
                    .ifPresent(uh -> emailService.sendApprovalRequest(request, uh, "Unit Head"));
        } else if (request.getStatus() == LeaveRequest.Status.PENDING_DIV_HEAD) {
            userRepo.findDivHeadByDepartment(request.getEmployee().getDepartment())
                    .ifPresent(dh -> emailService.sendApprovalRequest(request, dh, "Divisional Head"));
        } else if (request.getStatus() == LeaveRequest.Status.PENDING_HR) {
            userRepo.findByRole(User.Role.ADMIN)
                    .forEach(hr -> emailService.sendApprovalRequest(request, hr, "HR"));
        }
    }

    private void notifyDivHead(LeaveRequest request) {
        userRepo.findDivHeadByDepartment(request.getEmployee().getDepartment())
                .ifPresent(dh -> emailService.sendApprovalRequest(request, dh, "Divisional Head"));
    }

    private void notifyHr(LeaveRequest request) {
        userRepo.findByRole(User.Role.ADMIN)
                .forEach(hr -> emailService.sendApprovalRequest(request, hr, "HR"));
    }

    private void validateBalance(LeaveBalance balance, LeaveRequest.LeaveType type, int days) {
        switch (type) {
            case ANNUAL   -> { if (balance.getAnnualRemaining()    < days) throw new RuntimeException("Insufficient annual leave balance"); }
            case SICK     -> { if (balance.getSickRemaining()      < days) throw new RuntimeException("Insufficient sick leave balance"); }
            case CASUAL   -> { if (balance.getCasualRemaining()    < days) throw new RuntimeException("Insufficient casual leave balance"); }
            case EXAM     -> { if (balance.getExamRemaining()      < days) throw new RuntimeException("Insufficient exam leave balance"); }
            case MATERNITY-> { if (balance.getMaternityRemaining() < days) throw new RuntimeException("Insufficient maternity leave balance"); }
            case PATERNITY-> { if (balance.getPaternityRemaining() < days) throw new RuntimeException("Insufficient paternity leave balance"); }
        }
    }

    private void deductBalance(LeaveRequest request) {
        LeaveBalance balance = balanceRepo.findByEmployee(request.getEmployee())
                .orElseThrow(() -> new RuntimeException("Balance not found"));
        switch (request.getLeaveType()) {
            case ANNUAL    -> balance.setAnnualUsed(balance.getAnnualUsed()       + request.getTotalDays());
            case SICK      -> balance.setSickUsed(balance.getSickUsed()           + request.getTotalDays());
            case CASUAL    -> balance.setCasualUsed(balance.getCasualUsed()       + request.getTotalDays());
            case EXAM      -> balance.setExamUsed(balance.getExamUsed()           + request.getTotalDays());
            case MATERNITY -> balance.setMaternityUsed(balance.getMaternityUsed() + request.getTotalDays());
            case PATERNITY -> balance.setPaternityUsed(balance.getPaternityUsed() + request.getTotalDays());
            case UNPAID    -> balance.setUnpaidUsed(balance.getUnpaidUsed()       + request.getTotalDays());
        }
        balanceRepo.save(balance);
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
