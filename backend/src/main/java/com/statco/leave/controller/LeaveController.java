package com.statco.leave.controller;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.User;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

@RestController
@RequestMapping("/api/leave")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final UserRepository userRepo;

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // -------------------------------------------------------
    // EMPLOYEE endpoints
    // -------------------------------------------------------

    @PostMapping(value = "/apply", consumes = "multipart/form-data")
    public ResponseEntity<?> apply(
            @RequestPart("data") @Valid Dto.LeaveRequestDto dto,
            @RequestPart("handoverNote") MultipartFile handoverNote,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.applyForLeave(getUser(auth), dto, handoverNote));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<?> myRequests(Authentication auth) {
        return ResponseEntity.ok(leaveService.getMyRequests(getUser(auth)));
    }

    @GetMapping("/relief-staff")
    public ResponseEntity<?> reliefStaff(Authentication auth) {
        return ResponseEntity.ok(leaveService.getReliefStaffOptions(getUser(auth)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(leaveService.cancelLeave(id, getUser(auth)));
    }

    @GetMapping("/balance")
    public ResponseEntity<?> balance(Authentication auth) {
        return ResponseEntity.ok(leaveService.getBalance(getUser(auth)));
    }

    @GetMapping("/{id}/payment")
    public ResponseEntity<?> leavePayment(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(leaveService.getPaymentForLeave(id, getUser(auth)));
    }

    @GetMapping("/{id}/payment/eop")
    public ResponseEntity<Resource> downloadEop(@PathVariable Long id, Authentication auth) {
        Path path = leaveService.getEopDocumentPath(id, getUser(auth));
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + path.getFileName() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/handover-note")
    public ResponseEntity<Resource> downloadHandoverNote(@PathVariable Long id, Authentication auth) {
        Path path = leaveService.getHandoverNotePath(id, getUser(auth));
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + path.getFileName() + "\"")
                .body(resource);
    }

    // -------------------------------------------------------
    // UNIT HEAD / DIV HEAD endpoints
    // -------------------------------------------------------

    /** Returns all requests pending this approver's review (filtered by dept + level) */
    @GetMapping("/approver/pending")
    public ResponseEntity<?> pendingForApprover(Authentication auth) {
        return ResponseEntity.ok(leaveService.getPendingForApprover(getUser(auth)));
    }

    @GetMapping("/approver/history")
    public ResponseEntity<?> approvalHistory(Authentication auth) {
        return ResponseEntity.ok(leaveService.getApprovalHistory(getUser(auth)));
    }

    @PostMapping("/{id}/unit-head-review")
    public ResponseEntity<?> unitHeadReview(
            @PathVariable Long id,
            @Valid @RequestBody Dto.LeaveApprovalRequest dto,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.unitHeadReview(id, getUser(auth), dto));
    }

    @PostMapping("/{id}/div-head-review")
    public ResponseEntity<?> divHeadReview(
            @PathVariable Long id,
            @Valid @RequestBody Dto.LeaveApprovalRequest dto,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.divHeadReview(id, getUser(auth), dto));
    }

    // -------------------------------------------------------
    // HR (ADMIN) endpoints
    // -------------------------------------------------------

    @GetMapping("/hr/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> pendingHr() {
        return ResponseEntity.ok(leaveService.getPendingHr());
    }

    @GetMapping("/hr/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> allRequests() {
        return ResponseEntity.ok(leaveService.getAllRequests());
    }

    @PostMapping("/hr/{id}/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> hrProcess(
            @PathVariable Long id,
            @Valid @RequestBody Dto.HrProcessRequest dto,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.hrProcess(id, getUser(auth), dto));
    }

    @PostMapping("/hr/{id}/confirm-resumption")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> hrConfirmResumption(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(leaveService.confirmResumptionByHr(id, getUser(auth)));
    }

    @GetMapping("/hr/overstayed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> overstayed() {
        return ResponseEntity.ok(leaveService.getOverstayedLeaves());
    }

    @GetMapping("/hr/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(leaveService.getDashboardStats());
    }

    // -------------------------------------------------------
    // HOD (Unit Head / Div Head) — resumption confirmation
    // -------------------------------------------------------

    @PostMapping("/{id}/hod-confirm-resumption")
    public ResponseEntity<?> hodConfirmResumption(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(leaveService.confirmResumptionByHod(id, getUser(auth)));
    }

    // -------------------------------------------------------
    // ACCOUNTS endpoints
    // -------------------------------------------------------

    @GetMapping("/accounts/payment-requests")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> pendingPayments() {
        return ResponseEntity.ok(leaveService.getPendingPayments());
    }

    @GetMapping("/accounts/payment-requests/history")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> paymentHistory(Authentication auth) {
        return ResponseEntity.ok(leaveService.getAccountPaymentHistory(getUser(auth)));
    }

    @PostMapping(value = "/accounts/payment-requests/{id}/process-eop", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> processEop(
            @PathVariable Long id,
            @RequestPart("data") @Valid Dto.EopProcessRequest dto,
            @RequestPart("eopDocument") MultipartFile eopDocument,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.processEop(id, getUser(auth), dto, eopDocument));
    }

    @PostMapping(value = "/accounts/payment-requests/{id}/eop-document", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ACCOUNT')")
    public ResponseEntity<?> replaceEopDocument(
            @PathVariable Long id,
            @RequestPart(value = "data", required = false) Dto.EopProcessRequest dto,
            @RequestPart(value = "eopDocument", required = false) MultipartFile eopDocument,
            Authentication auth) {
        return ResponseEntity.ok(leaveService.replaceEopDocument(id, getUser(auth), dto, eopDocument));
    }
}
