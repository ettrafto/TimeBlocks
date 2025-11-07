package com.timeblocks.service;

import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventService {
  private static final Logger log = LoggerFactory.getLogger(EventService.class);
  private final EventRepository repo;
  private final OccurrenceService occurrences;

  public EventService(EventRepository repo, OccurrenceService occurrences) {
    this.repo = repo; this.occurrences = occurrences;
  }

  @Transactional
  public Event create(String calendarId, String title, Instant start, Instant end,
                      String rrule, String typeId, String color) {
    if (calendarId == null || calendarId.isBlank())
      throw new IllegalArgumentException("calendar_id required");
    if (title == null || title.isBlank())
      throw new IllegalArgumentException("title required");
    if (start == null || end == null || !start.isBefore(end))
      throw new IllegalArgumentException("start < end required");

    Event e = new Event();
    e.setId(UUID.randomUUID().toString());
    e.setCalendarId(calendarId);
    e.setTitle(title);
    e.setStartUtc(start.toString());
    e.setEndUtc(end.toString());
    e.setRecurrenceRule(rrule);
    e.setTzid("UTC");
    if (typeId != null) e.setTypeId(typeId);
    if (color != null) e.setNotes(color);
    e.setCreatedBy("system");
    e.setCreatedAtUtc(Instant.now().toString());

    Event saved = repo.save(e);
    log.debug("create(): inserted event id={}", saved.getId());

    Optional<Event> check = repo.findById(saved.getId());
    log.debug("create(): select back -> present={}", check.isPresent());

    try {
      occurrences.upsertSingle(saved.getId(), saved.getTitle(), Instant.parse(saved.getStartUtc()), Instant.parse(saved.getEndUtc()), null, color);
    } catch (Exception ex) {
      log.warn("create(): occurrence upsert failed (will rely on window expansion)", ex);
    }
    long n = repo.count();
    log.debug("create(): events count now = {}", n);
    return saved;
  }

  @Transactional
  public Event update(String id, String title, Instant start, Instant end,
                      String rrule, String typeId, String color) {
    Event e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("event not found: " + id));
    if (title != null && !title.isBlank()) e.setTitle(title);
    if (start != null && end != null) {
      if (!start.isBefore(end)) throw new IllegalArgumentException("start < end required");
      e.setStartUtc(start.toString());
      e.setEndUtc(end.toString());
    }
    if (rrule != null) e.setRecurrenceRule(rrule);
    if (typeId != null) e.setTypeId(typeId);
    Event saved = repo.save(e);
    try {
      occurrences.upsertSingle(saved.getId(), saved.getTitle(), Instant.parse(saved.getStartUtc()), Instant.parse(saved.getEndUtc()), null, null);
    } catch (DateTimeParseException dtpe) {
      log.warn("update(): invalid time parse on occurrence upsert", dtpe);
    } catch (Exception ex) {
      log.warn("update(): occurrence sync failed", ex);
    }
    return saved;
  }

  @Transactional
  public void deleteHard(String id) {
    log.info("deleteHard(): request to delete event id={}", id);
    long before = 0L;
    try { before = repo.count(); } catch (Exception ignored) {}
    repo.deleteById(id);
    long after = 0L;
    try { after = repo.count(); } catch (Exception ignored) {}
    log.info("deleteHard(): deleted event id={}, countBefore={}, countAfter={}", id, before, after);
    try {
      occurrences.deleteForEvent(id);
      log.debug("deleteHard(): occurrences deleted for event id={}", id);
    } catch (Exception ex) {
      log.warn("deleteHard(): occurrence cleanup failed for event id={}", id, ex);
    }
  }
}


