package com.timeblocks.repo;

import com.timeblocks.model.Subtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubtaskRepository extends JpaRepository<Subtask, Integer> {
    @Query("SELECT s FROM Subtask s WHERE s.taskId = :taskId ORDER BY s.orderIndex ASC, s.id ASC")
    List<Subtask> findByTaskId(@Param("taskId") Integer taskId);
    
    // Support both taskId and task_id query params for backward compatibility
    @Query("SELECT s FROM Subtask s WHERE s.taskId = :taskId OR s.taskId = :task_id ORDER BY s.orderIndex ASC, s.id ASC")
    List<Subtask> findByTaskIdFlexible(@Param("taskId") Integer taskId, @Param("task_id") Integer task_id);
}

