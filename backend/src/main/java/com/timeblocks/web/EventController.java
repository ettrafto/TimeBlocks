package com.timeblocks.web;

import com.timeblocks.model.Event;
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
    String calendarId = (String) body.get("calendar_id");
    String title = (String) body.get("title");
    String start = (String) body.get("start");
    String end = (String) body.get("end");
    String rrule = (String) body.getOrDefault("rrule", null);
    Object typeRaw = body.get("type_id");
    String typeId = typeRaw instanceof Number ? String.valueOf(((Number) typeRaw).intValue()) : (typeRaw instanceof String ? (String) typeRaw : null);
    String color = (String) body.getOrDefault("color", null);
    Event saved = events.create(calendarId, title, Instant.parse(start), Instant.parse(end), rrule, typeId, color);
    return ResponseEntity.status(201).body(saved);
  }

  @PatchMapping("/events/{id}")
  public ResponseEntity<Event> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
    String title = (String) body.get("title");
    String start = (String) body.get("start");
    String end = (String) body.get("end");
    String rrule = (String) body.getOrDefault("rrule", null);
    Object typeRaw = body.get("type_id");
    String typeId = typeRaw instanceof Number ? String.valueOf(((Number) typeRaw).intValue()) : (typeRaw instanceof String ? (String) typeRaw : null);
    Instant s = start != null ? Instant.parse(start) : null;
    Instant e = end != null ? Instant.parse(end) : null;
    Event saved = events.update(id, title, s, e, rrule, typeId, null);
    return ResponseEntity.ok(saved);
  }

  @DeleteMapping("/events/{id}")
  public ResponseEntity<Map<String, Boolean>> delete(@PathVariable String id) {
    events.deleteHard(id);
    return ResponseEntity.ok(Map.of("ok", true));
  }
}


