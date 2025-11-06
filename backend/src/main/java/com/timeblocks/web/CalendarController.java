package com.timeblocks.web;

import com.timeblocks.model.Event;
import com.timeblocks.model.EventOccurrence;
import com.timeblocks.repo.EventRepository;
import com.timeblocks.service.OccurrenceService;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class CalendarController {
    private final OccurrenceService occ;
    private final EventRepository events;

    public CalendarController(OccurrenceService occ, EventRepository events) { this.occ = occ; this.events = events; }

    @GetMapping("/calendars/{id}/events")
    public List<Map<String,Object>> window(@PathVariable String id,
                                           @RequestParam String from,
                                           @RequestParam String to) {
        // Ensure occurrence rows exist (idempotent)
        occ.getWindow(id, Instant.parse(from), Instant.parse(to));

        // Map events to UI-friendly occurrence DTOs
        String F = Instant.parse(from).toString();
        String T = Instant.parse(to).toString();
        List<Event> base = events.findForWindow(id, F, T);
        List<Map<String,Object>> out = new ArrayList<>();
        for (Event e : base) {
            String keySeed = e.getId() + "|" + e.getStartUtc() + "|" + e.getEndUtc();
            String stableId = java.util.UUID.nameUUIDFromBytes(keySeed.getBytes(StandardCharsets.UTF_8)).toString();
            Map<String,Object> dto = new LinkedHashMap<>();
            dto.put("id", stableId);
            dto.put("event_id", e.getId());
            dto.put("title", e.getTitle());
            dto.put("start", e.getStartUtc());
            dto.put("end", e.getEndUtc());
            dto.put("type_id", e.getTypeId());
            dto.put("color", e.getNotes());
            out.add(dto);
        }
        return out;
    }
}

