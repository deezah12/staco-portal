package com.statco.leave.controller;

import com.statco.leave.dto.LoanDto;
import com.statco.leave.model.User;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;
    private final UserRepository userRepo;

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // -------------------------------------------------------
    // EMPLOYEE
    // -------------------------------------------------------

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@Valid @RequestBody LoanDto.ApplyRequest dto, Authentication auth) {
        return ResponseEntity.ok(loanService.applyForLoan(getUser(auth), dto));
    }

    @GetMapping("/my-loans")
    public ResponseEntity<?> myLoans(Authentication auth) {
        return ResponseEntity.ok(loanService.getMyLoans(getUser(auth)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(loanService.cancelLoan(id, getUser(auth)));
    }

    @GetMapping("/{id}/schedule")
    public ResponseEntity<?> schedule(@PathVariable Long id) {
        return ResponseEntity.ok(loanService.getRepaymentSchedule(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(loanService.getLoanById(id));
    }

    /** Returns eligible guarantors for the logged-in employee */
    @GetMapping("/eligible-guarantors")
    public ResponseEntity<?> eligibleGuarantors(Authentication auth) {
        return ResponseEntity.ok(loanService.getEligibleGuarantors(getUser(auth)));
    }

    // -------------------------------------------------------
    // GUARANTOR (in-app, must be logged in)
    // -------------------------------------------------------

    @GetMapping("/guarantor/my-requests")
    public ResponseEntity<?> myGuarantorRequests(Authentication auth) {
        return ResponseEntity.ok(loanService.getMyGuarantorRequests(getUser(auth)));
    }

    @GetMapping("/guarantor/pending")
    public ResponseEntity<?> pendingGuarantorRequests(Authentication auth) {
        return ResponseEntity.ok(loanService.getMyPendingGuarantorRequests(getUser(auth)));
    }

    @PostMapping("/guarantor/respond")
    public ResponseEntity<?> respondAsGuarantor(@Valid @RequestBody LoanDto.GuarantorRespondRequest dto, Authentication auth) {
        return ResponseEntity.ok(loanService.respondAsGuarantor(getUser(auth), dto));
    }

    // -------------------------------------------------------
    // APPROVER (Unit Head / Div Head / MD)
    // -------------------------------------------------------

    @GetMapping("/approver/pending")
    public ResponseEntity<?> pendingForApprover(Authentication auth) {
        return ResponseEntity.ok(loanService.getPendingForApprover(getUser(auth)));
    }

    @PostMapping("/{id}/unit-head-review")
    public ResponseEntity<?> unitHeadReview(@PathVariable Long id,
                                             @Valid @RequestBody LoanDto.LoanApprovalRequest dto,
                                             Authentication auth) {
        return ResponseEntity.ok(loanService.unitHeadReview(id, getUser(auth), dto));
    }

    @PostMapping("/{id}/div-head-review")
    public ResponseEntity<?> divHeadReview(@PathVariable Long id,
                                            @Valid @RequestBody LoanDto.LoanApprovalRequest dto,
                                            Authentication auth) {
        return ResponseEntity.ok(loanService.divHeadReview(id, getUser(auth), dto));
    }

    @PostMapping("/{id}/md-review")
    public ResponseEntity<?> mdReview(@PathVariable Long id,
                                       @Valid @RequestBody LoanDto.MdApprovalRequest dto,
                                       Authentication auth) {
        return ResponseEntity.ok(loanService.mdReview(id, getUser(auth), dto));
    }

    // -------------------------------------------------------
    // HR (ADMIN)
    // -------------------------------------------------------

    @GetMapping("/hr/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> pendingHr() {
        return ResponseEntity.ok(loanService.getPendingHr());
    }

    @GetMapping("/hr/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> allLoans() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    @PostMapping("/hr/{id}/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> hrProcess(@PathVariable Long id,
                                        @Valid @RequestBody LoanDto.HrProcessRequest dto,
                                        Authentication auth) {
        return ResponseEntity.ok(loanService.hrProcess(id, getUser(auth), dto));
    }

    @PostMapping("/hr/{id}/repayment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> recordRepayment(@PathVariable Long id,
                                              @Valid @RequestBody LoanDto.RecordRepaymentRequest dto,
                                              Authentication auth) {
        return ResponseEntity.ok(loanService.recordRepayment(id, dto, getUser(auth)));
    }

    @GetMapping("/hr/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(loanService.getLoanStats());
    }

    // -------------------------------------------------------
    // ACCOUNTS
    // -------------------------------------------------------

    @GetMapping("/accounts/pending")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> pendingDisbursement() {
        return ResponseEntity.ok(loanService.getPendingAccounts());
    }

    @PostMapping(value = "/accounts/{id}/disburse", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> disburse(@PathVariable Long id,
                                       @RequestPart("data") @Valid LoanDto.DisburseRequest dto,
                                       @RequestPart(value = "confirmation", required = false) MultipartFile confirmation,
                                       Authentication auth) {
        return ResponseEntity.ok(loanService.disburse(id, getUser(auth), dto, confirmation));
    }

    // -------------------------------------------------------
    // GRADES (HR manages)
    // -------------------------------------------------------

    @GetMapping("/grades")
    public ResponseEntity<?> getAllGrades() {
        return ResponseEntity.ok(loanService.getAllGrades());
    }

    @PostMapping("/grades")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createGrade(@Valid @RequestBody LoanDto.GradeRequest dto) {
        return ResponseEntity.ok(loanService.createGrade(dto));
    }
}
