package com.timeblocks.web;

import com.timeblocks.model.EventOccurrence;
import com.timeblocks.service.OccurrenceService;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api")
public class CalendarController {
    private final OccurrenceService occ;

    public CalendarController(OccurrenceService occ) { this.occ = occ; }

    @GetMapping("/calendars/{id}/events")
    public List<EventOccurrence> window(@PathVariable String id,
                                        @RequestParam String from,
                                        @RequestParam String to) {
        return occ.getWindow(id, Instant.parse(from), Instant.parse(to));
    }
}

