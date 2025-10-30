package com.timeblocks.web;

import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
        
        if (from != null && to != null) {
            return eventRepo.findForWindow(calendarId, from, to);
        }
        // If no date range provided, return empty list or all events
        return List.of();
    }

    @PostMapping("/calendars/{calendarId}/scheduled-events")
    public ResponseEntity<Event> createScheduledEvent(@PathVariable String calendarId, @RequestBody Event event) {
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
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
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
        if (!eventRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

