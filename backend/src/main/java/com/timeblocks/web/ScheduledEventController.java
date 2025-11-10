package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ScheduledEventController {
    private final EventRepository eventRepo;
    private final com.timeblocks.repo.TaskRepository taskRepo;

    public ScheduledEventController(EventRepository eventRepo, com.timeblocks.repo.TaskRepository taskRepo) {
        this.eventRepo = eventRepo;
        this.taskRepo = taskRepo;
    }

    @GetMapping("/calendars/{calendarId}/scheduled-events")
    public List<Event> getScheduledEvents(
            @PathVariable String calendarId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/calendars/{calendarId}/scheduled-events", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("calendarId", calendarId);
            params.put("from", from);
            params.put("to", to);
            TBLog.kv("Request params", params);
            
            List<Event> events;
            if (from != null && to != null) {
                events = eventRepo.findForWindow(calendarId, from, to);
            } else {
                events = List.of();
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("count", events.size());
            TBLog.kv("DB rows", result);
            TBLog.info("Returning {} scheduled events", events.size());
            
            return events;
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PostMapping("/calendars/{calendarId}/scheduled-events")
    public ResponseEntity<Event> createScheduledEvent(@PathVariable String calendarId, @RequestBody Event event) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("POST /api/calendars/{calendarId}/scheduled-events", cid);
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("calendarId", calendarId);
            payload.put("event", event);
            TBLog.kv("Payload", payload);
            
            if (event.getId() == null || event.getId().isEmpty()) {
                event.setId("evt_" + UUID.randomUUID().toString());
            }
            event.setCalendarId(calendarId);
            
            // Set created timestamp if not provided
            if (event.getCreatedAtUtc() == null || event.getCreatedAtUtc().isEmpty()) {
                event.setCreatedAtUtc(Instant.now().toString());
            }
            
            // Set default creator if not provided
            if (event.getCreatedBy() == null || event.getCreatedBy().isEmpty()) {
                event.setCreatedBy("u_dev"); // Default user for now
            }
            
            Event saved = eventRepo.save(event);

            // If linked to a task, set the scheduled flag true
            try {
                Integer taskIdInt = null;
                try { taskIdInt = saved.getTaskId() != null ? Integer.parseInt(saved.getTaskId()) : null; } catch (NumberFormatException ignored) {}
                if (taskIdInt != null) {
                    taskRepo.findById(taskIdInt).ifPresent(t -> {
                        if (Boolean.FALSE.equals(t.getScheduled())) {
                            t.setScheduled(true);
                            taskRepo.save(t);
                        }
                    });
                }
            } catch (Exception ignored) {}
            
            Map<String, Object> dbResult = new HashMap<>();
            dbResult.put("id", saved.getId());
            dbResult.put("title", saved.getTitle());
            dbResult.put("startUtc", saved.getStartUtc());
            TBLog.kv("DB created", dbResult);
            TBLog.info("Created scheduled event: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PutMapping("/scheduled-events/{id}")
    public ResponseEntity<Event> updateScheduledEvent(@PathVariable String id, @RequestBody Event event) {
        if (!eventRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Event prev = eventRepo.findById(id).orElse(null);
        String oldTaskId = prev != null ? prev.getTaskId() : null;
        event.setId(id);
        Event updated = eventRepo.save(event);
        // Maintain task.scheduled if task link changed
        try {
            String newTaskId = updated.getTaskId();
            if (newTaskId != null && !newTaskId.equals(oldTaskId)) {
                try {
                    Integer newTaskInt = Integer.parseInt(newTaskId);
                    taskRepo.findById(newTaskInt).ifPresent(t -> {
                        if (Boolean.FALSE.equals(t.getScheduled())) {
                            t.setScheduled(true);
                            taskRepo.save(t);
                        }
                    });
                } catch (NumberFormatException ignored) {}
                if (oldTaskId != null && eventRepo.countByTaskId(oldTaskId) == 0) {
                    try {
                        Integer oldTaskInt = Integer.parseInt(oldTaskId);
                        taskRepo.findById(oldTaskInt).ifPresent(t -> {
                            if (Boolean.TRUE.equals(t.getScheduled())) {
                                t.setScheduled(false);
                                taskRepo.save(t);
                            }
                        });
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/scheduled-events/{id}")
    public ResponseEntity<Void> deleteScheduledEvent(@PathVariable String id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("DELETE /api/scheduled-events/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            TBLog.kv("Delete params", params);
            
            Event existing = eventRepo.findById(id).orElse(null);
            if (existing == null) {
                TBLog.warn("Event not found for deletion: {}", id);
                return ResponseEntity.notFound().build();
            }
            String taskId = existing.getTaskId();
            eventRepo.deleteById(id);
            // If linked to task, and no remaining events, clear flag
            try {
                if (taskId != null && eventRepo.countByTaskId(taskId) == 0) {
                    Integer taskInt = null;
                    try { taskInt = Integer.parseInt(taskId); } catch (NumberFormatException ignored) {}
                    if (taskInt != null) {
                        taskRepo.findById(taskInt).ifPresent(t -> {
                            if (Boolean.TRUE.equals(t.getScheduled())) {
                                t.setScheduled(false);
                                taskRepo.save(t);
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
            TBLog.info("Deleted scheduled event: {}", id);
            
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }
}

