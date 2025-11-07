package com.timeblocks.repo;

import com.timeblocks.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Integer> {
    @Query("SELECT t FROM Task t WHERE t.typeId = :typeId ORDER BY t.createdAt DESC")
    List<Task> findByTypeId(@Param("typeId") Integer typeId);
    
    // Support both typeId and type_id query params for backward compatibility
    @Query("SELECT t FROM Task t WHERE t.typeId = :typeId OR t.typeId = :type_id ORDER BY t.createdAt DESC")
    List<Task> findByTypeIdFlexible(@Param("typeId") Integer typeId, @Param("type_id") Integer type_id);
}






