package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ScheduledEventController {
    private final EventRepository eventRepo;

    public ScheduledEventController(EventRepository eventRepo) {
        this.eventRepo = eventRepo;
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
        event.setId(id);
        Event updated = eventRepo.save(event);
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
            
            if (!eventRepo.existsById(id)) {
                TBLog.warn("Event not found for deletion: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            eventRepo.deleteById(id);
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

