package com.timeblocks.repo;

import com.timeblocks.model.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EventTypeRepository extends JpaRepository<EventType, String> {
    @Query("select t from EventType t where t.workspaceId = :workspaceId")
    List<EventType> findByWorkspace(@Param("workspaceId") String workspaceId);
}

