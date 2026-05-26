package com.statco.leave.repository;
import com.statco.leave.model.TrainingType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TrainingTypeRepository extends JpaRepository<TrainingType, Long> {
    List<TrainingType> findByActiveTrueOrderByNameAsc();
}
