package com.statco.leave.repository;
import com.statco.leave.model.FeedbackResponse;
import com.statco.leave.model.PerformanceReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FeedbackResponseRepository extends JpaRepository<FeedbackResponse, Long> {
    List<FeedbackResponse> findByReviewOrderByQuestion_SortOrderAsc(PerformanceReview review);
    boolean existsByReview(PerformanceReview review);
}
