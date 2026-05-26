package com.statco.leave.repository;
import com.statco.leave.model.OffenceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OffenceCategoryRepository extends JpaRepository<OffenceCategory, Long> {
    List<OffenceCategory> findByActiveTrueOrderByNameAsc();
}
