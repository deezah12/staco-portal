package com.statco.leave.repository;

import com.statco.leave.model.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GradeRepository extends JpaRepository<Grade, Long> {
    Optional<Grade> findByName(String name);
    List<Grade> findAllByOrderByLevelAsc();
}
