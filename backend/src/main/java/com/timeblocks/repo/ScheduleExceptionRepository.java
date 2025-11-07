package com.timeblocks.repo;

import com.timeblocks.model.ScheduleException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleExceptionRepository extends JpaRepository<ScheduleException, String> {
    List<ScheduleException> findByScheduleId(String scheduleId);
}


