package com.statco.leave.controller;

import com.statco.leave.dto.PerformanceDto;
import com.statco.leave.model.User;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.service.PerformanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/performance")
@RequiredArgsConstructor
public class PerformanceController {

    private final PerformanceService perfService;
    private final UserRepository userRepo;

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // -------------------------------------------------------
    // ADMIN — Review management
    // -------------------------------------------------------

    @PostMapping("/admin/mark-eligible")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> markEligible(@Valid @RequestBody PerformanceDto.MarkEligibleRequest dto) {
        return ResponseEntity.ok(perfService.markEligible(dto));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> allReviews() {
        return ResponseEntity.ok(perfService.getAllReviews());
    }

    @PostMapping("/admin/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> close(@PathVariable Long id) {
        return ResponseEntity.ok(perfService.closeReview(id));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(perfService.getStats());
    }

    @GetMapping("/admin/employees")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> employees() {
        return ResponseEntity.ok(userRepo.findByActiveTrue());
    }

    @GetMapping("/admin/periods")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> periods() {
        return ResponseEntity.ok(perfService.getSuggestedPeriods());
    }

    // -------------------------------------------------------
    // ADMIN — Offence Categories
    // -------------------------------------------------------

    @GetMapping("/admin/offence-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getOffenceCategories() {
        return ResponseEntity.ok(perfService.getAllOffenceCategories());
    }

    @PostMapping("/admin/offence-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createOffenceCategory(@Valid @RequestBody PerformanceDto.OffenceCategoryRequest dto) {
        return ResponseEntity.ok(perfService.createOffenceCategory(dto));
    }

    @PutMapping("/admin/offence-categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateOffenceCategory(@PathVariable Long id, @Valid @RequestBody PerformanceDto.OffenceCategoryRequest dto) {
        return ResponseEntity.ok(perfService.updateOffenceCategory(id, dto));
    }

    // -------------------------------------------------------
    // ADMIN — Disciplinary Actions
    // -------------------------------------------------------

    @PostMapping("/admin/disciplinary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> logDisciplinary(@Valid @RequestBody PerformanceDto.LogDisciplinaryActionRequest dto, Authentication auth) {
        return ResponseEntity.ok(perfService.logDisciplinaryAction(getUser(auth), dto));
    }

    @GetMapping("/admin/disciplinary/{employeeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> staffDisciplinaryHistory(@PathVariable Long employeeId) {
        return ResponseEntity.ok(perfService.getStaffDisciplinaryHistory(employeeId));
    }

    // -------------------------------------------------------
    // ADMIN — Training Types
    // -------------------------------------------------------

    @GetMapping("/training-types")
    public ResponseEntity<?> getTrainingTypes() {
        return ResponseEntity.ok(perfService.getAllTrainingTypes());
    }

    @PostMapping("/admin/training-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createTrainingType(@Valid @RequestBody PerformanceDto.TrainingTypeRequest dto) {
        return ResponseEntity.ok(perfService.createTrainingType(dto));
    }

    // -------------------------------------------------------
    // ADMIN — Training Records
    // -------------------------------------------------------

    @GetMapping("/admin/training-records")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> allTrainingRecords() {
        return ResponseEntity.ok(perfService.getAllTrainingRecords());
    }

    @PostMapping("/admin/training-records/schedule")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> scheduleTraining(@Valid @RequestBody PerformanceDto.ScheduleTrainingRequest dto, Authentication auth) {
        return ResponseEntity.ok(perfService.scheduleTraining(getUser(auth), dto));
    }

    @PostMapping("/admin/training-records/update-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateTrainingStatus(@Valid @RequestBody PerformanceDto.UpdateTrainingStatusRequest dto) {
        return ResponseEntity.ok(perfService.updateTrainingStatus(dto));
    }

    // -------------------------------------------------------
    // ADMIN — Feedback Questions
    // -------------------------------------------------------

    @GetMapping("/admin/feedback-questions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackQuestions() {
        return ResponseEntity.ok(perfService.getAllFeedbackQuestions());
    }

    @PostMapping("/admin/feedback-questions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createFeedbackQuestion(@Valid @RequestBody PerformanceDto.FeedbackQuestionRequest dto) {
        return ResponseEntity.ok(perfService.createFeedbackQuestion(dto));
    }

    @GetMapping("/admin/feedback/{reviewId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReviewFeedback(@PathVariable Long reviewId) {
        return ResponseEntity.ok(perfService.getReviewFeedback(reviewId));
    }

    // -------------------------------------------------------
    // MANAGER
    // -------------------------------------------------------

    @GetMapping("/manager/my-reviews")
    public ResponseEntity<?> managerReviews(Authentication auth) {
        return ResponseEntity.ok(perfService.getManagerReviews(getUser(auth)));
    }

    @GetMapping("/manager/pending-appraisals")
    public ResponseEntity<?> pendingAppraisals(Authentication auth) {
        return ResponseEntity.ok(perfService.getManagerPendingAppraisals(getUser(auth)));
    }

    @GetMapping("/manager/pending-recommendations")
    public ResponseEntity<?> pendingRecommendations(Authentication auth) {
        return ResponseEntity.ok(perfService.getManagerPendingRecommendations(getUser(auth)));
    }

    @PostMapping("/manager/{id}/appraise")
    public ResponseEntity<?> appraise(@PathVariable Long id,
                                       @Valid @RequestBody PerformanceDto.SubmitAppraisalRequest dto,
                                       Authentication auth) {
        return ResponseEntity.ok(perfService.submitAppraisal(id, getUser(auth), dto));
    }

    @PostMapping("/manager/{id}/recommend")
    public ResponseEntity<?> recommend(@PathVariable Long id,
                                        @Valid @RequestBody PerformanceDto.RecommendationRequest dto,
                                        Authentication auth) {
        return ResponseEntity.ok(perfService.giveRecommendation(id, getUser(auth), dto));
    }

    // -------------------------------------------------------
    // EMPLOYEE
    // -------------------------------------------------------

    @GetMapping("/my-reviews")
    public ResponseEntity<?> myReviews(Authentication auth) {
        return ResponseEntity.ok(perfService.getMyReviews(getUser(auth)));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<?> respond(@PathVariable Long id,
                                      @Valid @RequestBody PerformanceDto.EmployeeResponseRequest dto,
                                      Authentication auth) {
        return ResponseEntity.ok(perfService.respondToAppraisal(id, getUser(auth), dto));
    }

    @PostMapping("/{id}/feedback")
    public ResponseEntity<?> submitFeedback(@PathVariable Long id,
                                             @Valid @RequestBody PerformanceDto.SubmitFeedbackRequest dto,
                                             Authentication auth) {
        return ResponseEntity.ok(perfService.submitFeedback(id, getUser(auth), dto));
    }

    @GetMapping("/my-training")
    public ResponseEntity<?> myTraining(Authentication auth) {
        return ResponseEntity.ok(perfService.getMyTrainingRecords(getUser(auth)));
    }

    @GetMapping("/my-disciplinary")
    public ResponseEntity<?> myDisciplinary(Authentication auth) {
        return ResponseEntity.ok(perfService.getMyDisciplinaryHistory(getUser(auth)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(perfService.getById(id));
    }

    @GetMapping("/{id}/scores")
    public ResponseEntity<?> getScores(@PathVariable Long id) {
        return ResponseEntity.ok(perfService.getScores(id));
    }
}
