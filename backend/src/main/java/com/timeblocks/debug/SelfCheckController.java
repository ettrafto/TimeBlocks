package com.timeblocks.debug;

import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import com.timeblocks.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/debug")
public class SelfCheckController {
  private final EventService events;
  private final EventRepository repo;

  public SelfCheckController(EventService events, EventRepository repo) {
    this.events = events; this.repo = repo;
  }

  @PostMapping("/selfcheck")
  public ResponseEntity<?> selfCheck() {
    String cal = "selfcheck";
    String idTitle = "debug-" + UUID.randomUUID().toString().substring(0,8);
    var now = Instant.now();
    var end = now.plusSeconds(1800);
    Event row = events.create(cal, idTitle, now, end, null, null, null);

    Optional<Event> fetched = repo.findById(row.getId());
    long count = repo.count();
    return ResponseEntity.ok(Map.of(
      "created_id", row.getId(),
      "found_after_create", fetched.isPresent(),
      "total_events", count
    ));
  }
}


