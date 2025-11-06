package com.timeblocks.service;

import com.timeblocks.model.Event;
import com.timeblocks.model.EventOccurrence;
import com.timeblocks.repo.EventOccurrenceRepository;
import com.timeblocks.repo.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@Service
public class OccurrenceService {
    private final EventRepository events;
    private final EventOccurrenceRepository occRepo;

    public OccurrenceService(EventRepository events, EventOccurrenceRepository occRepo) {
        this.events = events; this.occRepo = occRepo;
    }

    @Transactional
    public List<EventOccurrence> getWindow(String calendarId, Instant from, Instant to) {
        String F = from.toString(), T = to.toString();
        List<Event> base = events.findForWindow(calendarId, F, T);
        org.slf4j.LoggerFactory.getLogger(getClass()).debug("getWindow(): events in window = {}", base.size());

        List<EventOccurrence> upserts = new ArrayList<>();
        for (Event e : base) {
            if (e.getRecurrenceRule() == null) {
                String keySeed = e.getId() + "|" + e.getStartUtc() + "|" + e.getEndUtc();
                String stableId = UUID.nameUUIDFromBytes(keySeed.getBytes(StandardCharsets.UTF_8)).toString();
                EventOccurrence occ = new EventOccurrence();
                occ.setId(stableId);
                occ.setEventId(e.getId());
                occ.setStartUtc(e.getStartUtc());
                occ.setEndUtc(e.getEndUtc());
                occ.setTzid(e.getTzid());
                occ.setStatus("confirmed");
                occ.setIsException(0);
                occ.setPayloadJsonb("{}");
                upserts.add(occ);
            } else {
                // TODO: replace with real RRULE expansion.
                // For dev we'll return the series "seed" instance if within window:
                if (e.getStartUtc().compareTo(T) <= 0 && e.getEndUtc().compareTo(F) >= 0) {
                    String keySeed = e.getId() + "|" + e.getStartUtc() + "|" + e.getEndUtc();
                    String stableId = UUID.nameUUIDFromBytes(keySeed.getBytes(StandardCharsets.UTF_8)).toString();
                    EventOccurrence occ = new EventOccurrence();
                    occ.setId(stableId);
                    occ.setEventId(e.getId());
                    occ.setStartUtc(e.getStartUtc());
                    occ.setEndUtc(e.getEndUtc());
                    occ.setTzid(e.getTzid());
                    occ.setStatus("confirmed");
                    occ.setIsException(0);
                    occ.setPayloadJsonb("{}");
                    upserts.add(occ);
                }
            }
        }
        // Save and return
        occRepo.saveAll(upserts);
        org.slf4j.LoggerFactory.getLogger(getClass()).debug("getWindow(): returning occurrences = {}", upserts.size());
        return upserts.stream()
                .sorted(Comparator.comparing(EventOccurrence::getStartUtc))
                .collect(Collectors.toList());
    }

    @Transactional
    public void upsertSingle(String eventId, String title, Instant start, Instant end, Integer typeId, String color) {
        String keySeed = eventId + "|" + start.toString() + "|" + end.toString();
        String stableId = UUID.nameUUIDFromBytes(keySeed.getBytes(StandardCharsets.UTF_8)).toString();
        EventOccurrence occ = new EventOccurrence();
        occ.setId(stableId);
        occ.setEventId(eventId);
        occ.setStartUtc(start.toString());
        occ.setEndUtc(end.toString());
        occ.setTzid("UTC");
        occ.setStatus("confirmed");
        occ.setIsException(0);
        occ.setPayloadJsonb("{}");
        occRepo.save(occ);
        org.slf4j.LoggerFactory.getLogger(getClass()).debug("upsertSingle(): event={} upserted id={}", eventId, stableId);
    }

    public void deleteForEvent(String eventId) {
        // optional: bulk delete via repository if needed; leaving as no-op for now
    }
}

