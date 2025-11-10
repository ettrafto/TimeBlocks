package com.timeblocks.repo;

import com.timeblocks.model.Event;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, String> {
    @Query("select e from Event e where e.calendarId = :calId and " +
           "((e.startUtc <= :to and e.endUtc >= :from) or e.recurrenceRule is not null)")
    List<Event> findForWindow(@Param("calId") String calendarId,
                              @Param("from") String fromIso,
                              @Param("to") String toIso);

    long countByTaskId(String taskId);

    @Modifying
    @Query("delete from Event e where e.taskId = :taskId")
    void deleteByTaskId(@Param("taskId") String taskId);
}

