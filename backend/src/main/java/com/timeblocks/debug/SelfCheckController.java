package com.timeblocks.debug;

import com.timeblocks.model.Event;
import com.timeblocks.repo.EventRepository;
import com.timeblocks.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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

    String eventId = row.getId();
    if (eventId == null) {
      throw new IllegalStateException("Event ID not generated during self-check creation");
    }

    Optional<Event> fetched = repo.findById(eventId);
    long count = repo.count();

    UUID createdId = UUID.fromString(eventId);
    return ResponseEntity.ok(new SelfCheckResult(createdId, fetched.isPresent(), count));
  }

  private record SelfCheckResult(UUID createdId, boolean foundAfterCreate, long totalEvents) {}
}


