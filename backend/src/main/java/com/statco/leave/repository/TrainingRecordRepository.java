package com.statco.leave.repository;
import com.statco.leave.model.TrainingRecord;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TrainingRecordRepository extends JpaRepository<TrainingRecord, Long> {
    List<TrainingRecord> findByEmployeeOrderByCreatedAtDesc(User employee);
    List<TrainingRecord> findAllByOrderByCreatedAtDesc();
}
