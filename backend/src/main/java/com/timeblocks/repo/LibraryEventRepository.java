package com.timeblocks.repo;

import com.timeblocks.model.LibraryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LibraryEventRepository extends JpaRepository<LibraryEvent, String> {
    @Query("select e from LibraryEvent e where e.workspaceId = :workspaceId")
    List<LibraryEvent> findByWorkspace(@Param("workspaceId") String workspaceId);
}

