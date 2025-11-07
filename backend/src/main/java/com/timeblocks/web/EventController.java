package com.timeblocks.web;

import com.timeblocks.model.Event;
import com.timeblocks.logging.TBLog;
import com.timeblocks.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EventController {
  private final EventService events;

  public EventController(EventService events) { this.events = events; }

  @PostMapping("/events")
  public ResponseEntity<Event> create(@RequestBody Map<String, Object> body) {
    String cid = TBLog.getCorrelationId();
    TBLog.groupStart("POST /api/events", cid);
    try {
      TBLog.kv("Request body", body);
      String calendarId = (String) body.get("calendar_id");
      String title = (String) body.get("title");
      String start = (String) body.get("start");
      String end = (String) body.get("end");
      String rrule = (String) body.getOrDefault("rrule", null);
      Object typeRaw = body.get("type_id");
      String typeId = typeRaw instanceof Number ? String.valueOf(((Number) typeRaw).intValue()) : (typeRaw instanceof String ? (String) typeRaw : null);
      String color = (String) body.getOrDefault("color", null);
      Event saved = events.create(calendarId, title, Instant.parse(start), Instant.parse(end), rrule, typeId, color);
      TBLog.kv("Created event", Map.of("id", saved.getId(), "title", saved.getTitle(), "start", saved.getStartUtc(), "end", saved.getEndUtc(), "typeId", saved.getTypeId()));
      return ResponseEntity.status(201).body(saved);
    } finally {
      TBLog.groupEnd();
    }
  }

  @PatchMapping("/events/{id}")
  public ResponseEntity<Event> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
    String cid = TBLog.getCorrelationId();
    TBLog.groupStart("PATCH /api/events/{id}", cid);
    try {
      TBLog.kv("Path+Body", Map.of("id", id, "body", body));
      String title = (String) body.get("title");
      String start = (String) body.get("start");
      String end = (String) body.get("end");
      String rrule = (String) body.getOrDefault("rrule", null);
      Object typeRaw = body.get("type_id");
      String typeId = typeRaw instanceof Number ? String.valueOf(((Number) typeRaw).intValue()) : (typeRaw instanceof String ? (String) typeRaw : null);
      Instant s = start != null ? Instant.parse(start) : null;
      Instant e = end != null ? Instant.parse(end) : null;
      Event saved = events.update(id, title, s, e, rrule, typeId, null);
      TBLog.kv("Updated event", Map.of("id", saved.getId(), "title", saved.getTitle(), "start", saved.getStartUtc(), "end", saved.getEndUtc(), "typeId", saved.getTypeId()));
      return ResponseEntity.ok(saved);
    } finally {
      TBLog.groupEnd();
    }
  }

  @DeleteMapping("/events/{id}")
  public ResponseEntity<Map<String, Boolean>> delete(@PathVariable String id) {
    String cid = TBLog.getCorrelationId();
    TBLog.groupStart("DELETE /api/events/{id}", cid);
    try {
      TBLog.kv("Path", Map.of("id", id));
      events.deleteHard(id);
      TBLog.info("Deleted event", Map.of("id", id));
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (Exception e) {
      TBLog.error("Error in delete event", e);
      throw e;
    } finally {
      TBLog.groupEnd();
    }
  }
}


