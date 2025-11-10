package com.timeblocks.repo;

import com.timeblocks.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, String> {
    @Query("select s from Schedule s where (s.startTsUtc <= :to and s.endTsUtc >= :from) or s.recurrenceRule is not null")
    List<Schedule> findForWindow(@Param("from") long from, @Param("to") long to);

    long countByTaskId(String taskId);
}


