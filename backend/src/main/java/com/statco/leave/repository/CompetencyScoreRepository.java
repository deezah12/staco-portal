package com.statco.leave.repository;

import com.statco.leave.model.CompetencyScore;
import com.statco.leave.model.PerformanceReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CompetencyScoreRepository extends JpaRepository<CompetencyScore, Long> {
    List<CompetencyScore> findByReview(PerformanceReview review);
}
