package com.statco.leave.service;

import com.statco.leave.dto.PerformanceDto;
import com.statco.leave.model.*;
import com.statco.leave.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final PerformanceReviewRepository reviewRepo;
    private final CompetencyScoreRepository scoreRepo;
    private final UserRepository userRepo;
    private final TrainingTypeRepository trainingTypeRepo;
    private final TrainingRecordRepository trainingRecordRepo;
    private final OffenceCategoryRepository offenceCategoryRepo;
    private final DisciplinaryActionRepository disciplinaryRepo;
    private final FeedbackQuestionRepository feedbackQuestionRepo;
    private final FeedbackResponseRepository feedbackResponseRepo;
    private final EmailService emailService;

    // -------------------------------------------------------
    // ADMIN: Mark eligible
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview markEligible(PerformanceDto.MarkEligibleRequest dto) {
        User employee = userRepo.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        User manager = userRepo.findById(dto.getManagerId())
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        reviewRepo.findByEmployeeAndReviewPeriod(employee, dto.getReviewPeriod())
                .ifPresent(r -> { throw new RuntimeException(employee.getFullName() + " already has a review for " + dto.getReviewPeriod()); });

        PerformanceReview review = new PerformanceReview();
        review.setEmployee(employee);
        review.setManager(manager);
        review.setReviewPeriod(dto.getReviewPeriod());

        // Pre-calculate any existing disciplinary deductions for this period
        double deductions = disciplinaryRepo.sumDeductionsForPeriod(employee, dto.getReviewPeriod());
        review.setDisciplinaryDeductions(deductions);

        PerformanceReview saved = reviewRepo.save(review);

        emailService.sendRaw(manager.getEmail(),
            "[Statco] Performance Review Assigned — " + employee.getFullName(),
            String.format("Hello %s,\n\n%s has been marked eligible for a performance review for %s.\n\nPlease log in to submit the appraisal.\n\nStatco HR",
                manager.getFullName(), employee.getFullName(), dto.getReviewPeriod()));

        return saved;
    }

    // -------------------------------------------------------
    // MANAGER: Submit appraisal
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview submitAppraisal(Long reviewId, User manager, PerformanceDto.SubmitAppraisalRequest dto) {
        PerformanceReview review = getAndValidate(reviewId);

        if (!review.getManager().getId().equals(manager.getId())) {
            throw new RuntimeException("You are not assigned to this review");
        }
        if (review.getStatus() != PerformanceReview.ReviewStatus.ELIGIBLE) {
            throw new RuntimeException("Appraisal already submitted");
        }

        for (PerformanceDto.CompetencyScoreInput s : dto.getScores()) {
            CompetencyScore cs = new CompetencyScore();
            cs.setReview(review);
            cs.setCompetency(s.getCompetency());
            cs.setScore(s.getScore());
            cs.setComment(s.getComment());
            scoreRepo.save(cs);
        }

        double avg = dto.getScores().stream().mapToInt(PerformanceDto.CompetencyScoreInput::getScore).average().orElse(0);
        double managerScore = Math.round(avg * 10.0) / 10.0;

        // Refresh deductions at appraisal time
        double deductions = disciplinaryRepo.sumDeductionsForPeriod(review.getEmployee(), review.getReviewPeriod());
        double finalScore  = Math.round((managerScore + deductions) * 10.0) / 10.0; // deductions are negative

        review.setManagerScore(managerScore);
        review.setDisciplinaryDeductions(deductions);
        review.setFinalScore(finalScore);
        review.setAppraisalSummary(dto.getAppraisalSummary());
        review.setAppraisedAt(LocalDateTime.now());
        review.setStatus(PerformanceReview.ReviewStatus.APPRAISED);

        PerformanceReview saved = reviewRepo.save(review);

        emailService.sendRaw(review.getEmployee().getEmail(),
            "[Statco] Your Performance Appraisal is Ready — " + review.getReviewPeriod(),
            String.format("Hello %s,\n\nYour manager has submitted your performance appraisal for %s.\n\nManager Score: %.1f / 5.0\nDisciplinary Deductions: %.1f\nFinal Score: %.1f / 5.0\n\nPlease log in to review and respond.\n\nStatco HR",
                review.getEmployee().getFullName(), review.getReviewPeriod(),
                managerScore, deductions, finalScore));

        return saved;
    }

    // -------------------------------------------------------
    // EMPLOYEE: Respond to appraisal
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview respondToAppraisal(Long reviewId, User employee, PerformanceDto.EmployeeResponseRequest dto) {
        PerformanceReview review = getAndValidate(reviewId);

        if (!review.getEmployee().getId().equals(employee.getId())) {
            throw new RuntimeException("This review does not belong to you");
        }
        if (review.getStatus() != PerformanceReview.ReviewStatus.APPRAISED) {
            throw new RuntimeException("Review is not awaiting your response");
        }

        review.setEmployeeResponse(dto.getResponse());
        review.setEmployeeComment(dto.getComment());
        review.setRespondedAt(LocalDateTime.now());
        review.setStatus(dto.getResponse() == PerformanceReview.EmployeeResponse.ACCEPTED
                ? PerformanceReview.ReviewStatus.ACKNOWLEDGED
                : PerformanceReview.ReviewStatus.DISPUTED);

        PerformanceReview saved = reviewRepo.save(review);

        String action = dto.getResponse() == PerformanceReview.EmployeeResponse.ACCEPTED ? "accepted" : "disputed";
        emailService.sendRaw(review.getManager().getEmail(),
            "[Statco] " + review.getEmployee().getFullName() + " has " + action + " their appraisal",
            String.format("Hello %s,\n\n%s has %s their appraisal for %s.\n\n%s\n\nPlease log in to give your recommendation.\n\nStatco HR",
                review.getManager().getFullName(), review.getEmployee().getFullName(), action, review.getReviewPeriod(),
                dto.getComment() != null ? "Employee comment: " + dto.getComment() : ""));

        return saved;
    }

    // -------------------------------------------------------
    // MANAGER: Give recommendation
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview giveRecommendation(Long reviewId, User manager, PerformanceDto.RecommendationRequest dto) {
        PerformanceReview review = getAndValidate(reviewId);

        if (!review.getManager().getId().equals(manager.getId())) {
            throw new RuntimeException("You are not assigned to this review");
        }
        if (review.getStatus() != PerformanceReview.ReviewStatus.ACKNOWLEDGED
                && review.getStatus() != PerformanceReview.ReviewStatus.DISPUTED) {
            throw new RuntimeException("Employee has not yet responded");
        }

        review.setRecommendation(dto.getRecommendation());
        review.setRecommendationNote(dto.getNote());
        review.setRecommendedAt(LocalDateTime.now());
        review.setStatus(PerformanceReview.ReviewStatus.RECOMMENDATION_GIVEN);

        // If training recommended, link the training type and create training record
        if (dto.getRecommendation() == PerformanceReview.Recommendation.TRAINING_AND_DEVELOPMENT
                && dto.getTrainingTypeId() != null) {
            TrainingType tt = trainingTypeRepo.findById(dto.getTrainingTypeId())
                    .orElseThrow(() -> new RuntimeException("Training type not found"));
            review.setTrainingType(tt);

            TrainingRecord tr = new TrainingRecord();
            tr.setEmployee(review.getEmployee());
            tr.setTrainingType(tt);
            tr.setReview(review);
            trainingRecordRepo.save(tr);
        }

        PerformanceReview saved = reviewRepo.save(review);

        emailService.sendRaw(review.getEmployee().getEmail(),
            "[Statco] Performance Review Recommendation — " + review.getReviewPeriod(),
            String.format("Hello %s,\n\nYour manager has submitted a recommendation for your %s review.\n\nRecommendation: %s\n\n%s\n\nStatco HR",
                review.getEmployee().getFullName(), review.getReviewPeriod(),
                dto.getRecommendation().name().replace("_", " "), dto.getNote()));

        userRepo.findByRole(User.Role.ADMIN).forEach(admin ->
            emailService.sendRaw(admin.getEmail(),
                "[Statco] Performance Review Completed — " + review.getEmployee().getFullName(),
                String.format("Hello %s,\n\n%s's review for %s is complete. Recommendation: %s.\n\nStatco HR",
                    admin.getFullName(), review.getEmployee().getFullName(), review.getReviewPeriod(),
                    dto.getRecommendation().name().replace("_", " "))));

        return saved;
    }

    // -------------------------------------------------------
    // ADMIN: Close review
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview closeReview(Long reviewId) {
        PerformanceReview review = getAndValidate(reviewId);
        review.setStatus(PerformanceReview.ReviewStatus.FEEDBACK_PENDING);

        PerformanceReview saved = reviewRepo.save(review);

        // Notify employee to submit feedback
        List<FeedbackQuestion> questions = feedbackQuestionRepo.findByActiveTrueOrderBySortOrderAsc();
        if (!questions.isEmpty()) {
            emailService.sendRaw(review.getEmployee().getEmail(),
                "[Statco] Please Submit Your Appraisal Feedback — " + review.getReviewPeriod(),
                String.format("Hello %s,\n\nYour performance review for %s has been closed. Please log in to submit your feedback.\n\nStatco HR",
                    review.getEmployee().getFullName(), review.getReviewPeriod()));
        }

        return saved;
    }

    // -------------------------------------------------------
    // EMPLOYEE: Submit feedback (after FEEDBACK_PENDING)
    // -------------------------------------------------------

    @Transactional
    public PerformanceReview submitFeedback(Long reviewId, User employee, PerformanceDto.SubmitFeedbackRequest dto) {
        PerformanceReview review = getAndValidate(reviewId);

        if (!review.getEmployee().getId().equals(employee.getId())) {
            throw new RuntimeException("This review does not belong to you");
        }
        if (review.getStatus() != PerformanceReview.ReviewStatus.FEEDBACK_PENDING) {
            throw new RuntimeException("Feedback is not required for this review at this stage");
        }
        if (review.isFeedbackSubmitted()) {
            throw new RuntimeException("You have already submitted feedback for this review");
        }

        for (PerformanceDto.FeedbackAnswerInput ans : dto.getAnswers()) {
            FeedbackQuestion q = feedbackQuestionRepo.findById(ans.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found: " + ans.getQuestionId()));
            FeedbackResponse resp = new FeedbackResponse();
            resp.setReview(review);
            resp.setQuestion(q);
            resp.setRating(ans.getRating());
            resp.setTextAnswer(ans.getTextAnswer());
            feedbackResponseRepo.save(resp);
        }

        review.setFeedbackSubmitted(true);
        review.setFeedbackSubmittedAt(LocalDateTime.now());
        review.setStatus(PerformanceReview.ReviewStatus.CLOSED);

        return reviewRepo.save(review);
    }

    // -------------------------------------------------------
    // DISCIPLINARY ACTIONS (HR)
    // -------------------------------------------------------

    @Transactional
    public DisciplinaryAction logDisciplinaryAction(User hr, PerformanceDto.LogDisciplinaryActionRequest dto) {
        User employee = userRepo.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        OffenceCategory category = offenceCategoryRepo.findById(dto.getOffenceCategoryId())
                .orElseThrow(() -> new RuntimeException("Offence category not found"));

        DisciplinaryAction action = new DisciplinaryAction();
        action.setEmployee(employee);
        action.setOffenceCategory(category);
        action.setReviewPeriod(dto.getReviewPeriod());
        action.setDescription(dto.getDescription());
        action.setLoggedBy(hr);
        DisciplinaryAction saved = disciplinaryRepo.save(action);

        // If there's an active review for this period, recalculate final score
        reviewRepo.findByEmployeeAndReviewPeriod(employee, dto.getReviewPeriod()).ifPresent(review -> {
            double deductions = disciplinaryRepo.sumDeductionsForPeriod(employee, dto.getReviewPeriod());
            review.setDisciplinaryDeductions(deductions);
            if (review.getManagerScore() != null) {
                double finalScore = Math.round((review.getManagerScore() + deductions) * 10.0) / 10.0;
                review.setFinalScore(finalScore);
            }
            reviewRepo.save(review);
        });

        // Notify employee
        emailService.sendRaw(employee.getEmail(),
            "[Statco] Disciplinary Action Logged — " + category.getName(),
            String.format("Hello %s,\n\nA disciplinary action has been logged on your record.\n\nOffence: %s\nDeduction: %.1f marks\nPeriod: %s\n\nDescription: %s\n\nPlease contact HR for more details.\n\nStatco HR",
                employee.getFullName(), category.getName(), category.getDeductionMark(),
                dto.getReviewPeriod(), dto.getDescription() != null ? dto.getDescription() : "N/A"));

        return saved;
    }

    public List<DisciplinaryAction> getStaffDisciplinaryHistory(Long employeeId) {
        User employee = userRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return disciplinaryRepo.findByEmployeeOrderByLoggedAtDesc(employee);
    }

    public List<DisciplinaryAction> getMyDisciplinaryHistory(User employee) {
        return disciplinaryRepo.findByEmployeeOrderByLoggedAtDesc(employee);
    }

    // -------------------------------------------------------
    // OFFENCE CATEGORIES (HR manages)
    // -------------------------------------------------------

    public OffenceCategory createOffenceCategory(PerformanceDto.OffenceCategoryRequest dto) {
        OffenceCategory cat = new OffenceCategory();
        cat.setName(dto.getName());
        cat.setDeductionMark(dto.getDeductionMark());
        cat.setDescription(dto.getDescription());
        return offenceCategoryRepo.save(cat);
    }

    public List<OffenceCategory> getAllOffenceCategories() {
        return offenceCategoryRepo.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public OffenceCategory updateOffenceCategory(Long id, PerformanceDto.OffenceCategoryRequest dto) {
        OffenceCategory cat = offenceCategoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Offence category not found"));
        cat.setName(dto.getName());
        cat.setDeductionMark(dto.getDeductionMark());
        cat.setDescription(dto.getDescription());
        return offenceCategoryRepo.save(cat);
    }

    // -------------------------------------------------------
    // TRAINING TYPES (HR manages)
    // -------------------------------------------------------

    public TrainingType createTrainingType(PerformanceDto.TrainingTypeRequest dto) {
        TrainingType tt = new TrainingType();
        tt.setName(dto.getName());
        tt.setDescription(dto.getDescription());
        return trainingTypeRepo.save(tt);
    }

    public List<TrainingType> getAllTrainingTypes() {
        return trainingTypeRepo.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public TrainingRecord scheduleTraining(User hr, PerformanceDto.ScheduleTrainingRequest dto) {
        TrainingRecord tr = trainingRecordRepo.findById(dto.getTrainingRecordId())
                .orElseThrow(() -> new RuntimeException("Training record not found"));
        tr.setScheduledDate(dto.getScheduledDate());
        tr.setScheduledBy(hr);
        tr.setNotes(dto.getNotes());
        tr.setStatus(TrainingRecord.TrainingStatus.SCHEDULED);
        TrainingRecord saved = trainingRecordRepo.save(tr);

        emailService.sendRaw(tr.getEmployee().getEmail(),
            "[Statco] Training Scheduled — " + tr.getTrainingType().getName(),
            String.format("Hello %s,\n\nYour training '%s' has been scheduled for %s.\n\nStatco HR",
                tr.getEmployee().getFullName(), tr.getTrainingType().getName(), dto.getScheduledDate()));

        return saved;
    }

    @Transactional
    public TrainingRecord updateTrainingStatus(PerformanceDto.UpdateTrainingStatusRequest dto) {
        TrainingRecord tr = trainingRecordRepo.findById(dto.getTrainingRecordId())
                .orElseThrow(() -> new RuntimeException("Training record not found"));
        tr.setStatus(dto.getStatus());
        if (dto.getCompletedDate() != null) tr.setCompletedDate(dto.getCompletedDate());
        if (dto.getNotes() != null) tr.setNotes(dto.getNotes());
        return trainingRecordRepo.save(tr);
    }

    public List<TrainingRecord> getAllTrainingRecords() {
        return trainingRecordRepo.findAllByOrderByCreatedAtDesc();
    }

    public List<TrainingRecord> getMyTrainingRecords(User employee) {
        return trainingRecordRepo.findByEmployeeOrderByCreatedAtDesc(employee);
    }

    // -------------------------------------------------------
    // FEEDBACK QUESTIONS (HR manages)
    // -------------------------------------------------------

    public FeedbackQuestion createFeedbackQuestion(PerformanceDto.FeedbackQuestionRequest dto) {
        FeedbackQuestion q = new FeedbackQuestion();
        q.setQuestionText(dto.getQuestionText());
        q.setType(dto.getType());
        q.setSortOrder(dto.getSortOrder());
        return feedbackQuestionRepo.save(q);
    }

    public List<FeedbackQuestion> getAllFeedbackQuestions() {
        return feedbackQuestionRepo.findByActiveTrueOrderBySortOrderAsc();
    }

    public List<FeedbackResponse> getReviewFeedback(Long reviewId) {
        PerformanceReview review = getAndValidate(reviewId);
        return feedbackResponseRepo.findByReviewOrderByQuestion_SortOrderAsc(review);
    }

    // -------------------------------------------------------
    // QUERIES
    // -------------------------------------------------------

    public List<PerformanceReview> getMyReviews(User employee) {
        return reviewRepo.findByEmployeeOrderByCreatedAtDesc(employee);
    }

    public List<PerformanceReview> getManagerReviews(User manager) {
        return reviewRepo.findByManagerOrderByCreatedAtDesc(manager);
    }

    public List<PerformanceReview> getManagerPendingAppraisals(User manager) {
        return reviewRepo.findByManagerAndStatus(manager, PerformanceReview.ReviewStatus.ELIGIBLE);
    }

    public List<PerformanceReview> getManagerPendingRecommendations(User manager) {
        List<PerformanceReview> ack = reviewRepo.findByManagerAndStatus(manager, PerformanceReview.ReviewStatus.ACKNOWLEDGED);
        List<PerformanceReview> dis = reviewRepo.findByManagerAndStatus(manager, PerformanceReview.ReviewStatus.DISPUTED);
        ack.addAll(dis);
        return ack;
    }

    public List<PerformanceReview> getAllReviews() {
        return reviewRepo.findAllByOrderByCreatedAtDesc();
    }

    public PerformanceReview getById(Long id) { return getAndValidate(id); }

    public List<CompetencyScore> getScores(Long reviewId) {
        return scoreRepo.findByReview(getAndValidate(reviewId));
    }

    public Map<String, Object> getStats() {
        return new HashMap<>() {{
            put("total", reviewRepo.count());
            put("eligible", reviewRepo.countEligible());
            put("awaitingEmployee", reviewRepo.countAwaitingEmployee());
            put("disputed", reviewRepo.countDisputed());
        }};
    }

    public List<String> getSuggestedPeriods() {
        int year = java.time.LocalDate.now().getYear();
        return List.of("H1 " + (year-1), "H2 " + (year-1), "H1 " + year, "H2 " + year, "H1 " + (year+1), "H2 " + (year+1));
    }

    private PerformanceReview getAndValidate(Long id) {
        return reviewRepo.findById(id).orElseThrow(() -> new RuntimeException("Review not found"));
    }
}
