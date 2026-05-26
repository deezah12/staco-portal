package com.statco.leave.controller;

import com.statco.leave.model.*;
import com.statco.leave.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ReportsController {

    private final UserRepository userRepo;
    private final LeaveRequestRepository leaveRepo;
    private final LoanRequestRepository loanRepo;
    private final LoanRepaymentRepository repaymentRepo;
    private final PerformanceReviewRepository perfRepo;

    @GetMapping("/leave")
    public ResponseEntity<?> leaveReport() {
        List<LeaveRequest> all = leaveRepo.findAllByOrderByCreatedAtDesc();

        // By status
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(r -> r.getStatus().name(), Collectors.counting()));

        // By leave type
        Map<String, Long> byType = all.stream()
                .collect(Collectors.groupingBy(r -> r.getLeaveType().name(), Collectors.counting()));

        // By department
        Map<String, Long> byDept = all.stream()
                .filter(r -> r.getEmployee().getDepartment() != null)
                .collect(Collectors.groupingBy(r -> r.getEmployee().getDepartment(), Collectors.counting()));

        // Days taken per employee (approved only)
        Map<String, Integer> daysByEmployee = all.stream()
                .filter(r -> r.getStatus() == LeaveRequest.Status.ACTIVE || r.getStatus() == LeaveRequest.Status.RESUMED)
                .collect(Collectors.groupingBy(
                        r -> r.getEmployee().getFullName(),
                        Collectors.summingInt(LeaveRequest::getTotalDays)
                ));

        // Monthly trend (approved requests by month)
        Map<String, Long> monthlyTrend = all.stream()
                .filter(r -> r.getStatus() == LeaveRequest.Status.ACTIVE || r.getStatus() == LeaveRequest.Status.RESUMED)
                .collect(Collectors.groupingBy(
                        r -> r.getStartDate().getYear() + "-" + String.format("%02d", r.getStartDate().getMonthValue()),
                        Collectors.counting()
                ));

        // Currently on leave
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> currentlyOnLeave = all.stream()
                .filter(r -> r.getStatus() == LeaveRequest.Status.ACTIVE
                        && !r.getStartDate().isAfter(today)
                        && !r.getEndDate().isBefore(today))
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("employee", r.getEmployee().getFullName());
                    m.put("department", r.getEmployee().getDepartment());
                    m.put("type", r.getLeaveType().name());
                    m.put("endDate", r.getEndDate().toString());
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRequests", all.size());
        result.put("byStatus", byStatus);
        result.put("byType", byType);
        result.put("byDepartment", byDept);
        result.put("daysByEmployee", daysByEmployee);
        result.put("monthlyTrend", new TreeMap<>(monthlyTrend));
        result.put("currentlyOnLeave", currentlyOnLeave);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/loans")
    public ResponseEntity<?> loanReport() {
        List<LoanRequest> all = loanRepo.findAllByOrderByCreatedAtDesc();

        // By status
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(r -> r.getStatus().name(), Collectors.counting()));

        // Total disbursed
        BigDecimal totalDisbursed = all.stream()
                .filter(r -> r.getStatus() == LoanRequest.LoanStatus.DISBURSED
                        || r.getStatus() == LoanRequest.LoanStatus.FULLY_REPAID)
                .map(LoanRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Outstanding balance
        BigDecimal totalOutstanding = all.stream()
                .filter(r -> r.getStatus() == LoanRequest.LoanStatus.DISBURSED)
                .map(LoanRequest::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // By department
        Map<String, Long> byDept = all.stream()
                .filter(r -> r.getEmployee().getDepartment() != null)
                .collect(Collectors.groupingBy(r -> r.getEmployee().getDepartment(), Collectors.counting()));

        // Loan details table
        List<Map<String, Object>> details = all.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("employee", r.getEmployee().getFullName());
            m.put("department", r.getEmployee().getDepartment());
            m.put("amount", r.getAmount());
            m.put("monthlyDeduction", r.getMonthlyDeduction());
            m.put("repaymentMonths", r.getRepaymentMonths());
            m.put("outstanding", r.getOutstandingBalance());
            m.put("status", r.getStatus().name());
            m.put("appliedDate", r.getCreatedAt().toLocalDate().toString());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalLoans", all.size());
        result.put("totalDisbursed", totalDisbursed);
        result.put("totalOutstanding", totalOutstanding);
        result.put("byStatus", byStatus);
        result.put("byDepartment", byDept);
        result.put("details", details);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/performance")
    public ResponseEntity<?> performanceReport() {
        List<PerformanceReview> all = perfRepo.findAllByOrderByCreatedAtDesc();

        // By status
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(r -> r.getStatus().name(), Collectors.counting()));

        // By recommendation
        Map<String, Long> byRecommendation = all.stream()
                .filter(r -> r.getRecommendation() != null)
                .collect(Collectors.groupingBy(r -> r.getRecommendation().name(), Collectors.counting()));

        // Average score by department
        Map<String, Double> avgScoreByDept = all.stream()
                .filter(r -> r.getFinalScore() != null && r.getEmployee().getDepartment() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getEmployee().getDepartment(),
                        Collectors.averagingDouble(PerformanceReview::getFinalScore)
                ));

        // Score distribution
        Map<String, Long> scoreDistribution = new LinkedHashMap<>();
        scoreDistribution.put("1.0-2.0", all.stream().filter(r -> r.getFinalScore() != null && r.getFinalScore() < 2.0).count());
        scoreDistribution.put("2.0-3.0", all.stream().filter(r -> r.getFinalScore() != null && r.getFinalScore() >= 2.0 && r.getFinalScore() < 3.0).count());
        scoreDistribution.put("3.0-4.0", all.stream().filter(r -> r.getFinalScore() != null && r.getFinalScore() >= 3.0 && r.getFinalScore() < 4.0).count());
        scoreDistribution.put("4.0-5.0", all.stream().filter(r -> r.getFinalScore() != null && r.getFinalScore() >= 4.0).count());

        // Review details table
        List<Map<String, Object>> details = all.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("employee", r.getEmployee().getFullName());
            m.put("department", r.getEmployee().getDepartment());
            m.put("period", r.getReviewPeriod());
            m.put("manager", r.getManager().getFullName());
            m.put("score", r.getFinalScore());
            m.put("status", r.getStatus().name());
            m.put("recommendation", r.getRecommendation() != null ? r.getRecommendation().name() : null);
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalReviews", all.size());
        result.put("byStatus", byStatus);
        result.put("byRecommendation", byRecommendation);
        result.put("avgScoreByDepartment", avgScoreByDept);
        result.put("scoreDistribution", scoreDistribution);
        result.put("details", details);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEmployees", userRepo.findByActiveTrue().size());
        result.put("totalLeaveRequests", leaveRepo.count());
        result.put("pendingLeave", leaveRepo.countPendingRequests());
        result.put("totalLoans", loanRepo.count());
        result.put("activeLoans", loanRepo.countActiveLoans());
        result.put("totalReviews", perfRepo.count());
        result.put("pendingAppraisals", perfRepo.countEligible());
        return ResponseEntity.ok(result);
    }
}
