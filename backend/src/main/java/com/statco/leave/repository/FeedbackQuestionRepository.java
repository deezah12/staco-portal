package com.statco.leave.repository;
import com.statco.leave.model.FeedbackQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FeedbackQuestionRepository extends JpaRepository<FeedbackQuestion, Long> {
    List<FeedbackQuestion> findByActiveTrueOrderBySortOrderAsc();
}
