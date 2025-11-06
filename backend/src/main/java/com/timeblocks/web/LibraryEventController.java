package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.LibraryEvent;
import com.timeblocks.repo.LibraryEventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class LibraryEventController {
    private final LibraryEventRepository libRepo;

    public LibraryEventController(LibraryEventRepository libRepo) {
        this.libRepo = libRepo;
    }

    @GetMapping("/workspaces/{workspaceId}/library-events")
    public List<LibraryEvent> getLibraryEvents(@PathVariable String workspaceId) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/workspaces/{workspaceId}/library-events", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("workspaceId", workspaceId);
            TBLog.kv("Request params", params);
            
            List<LibraryEvent> events = libRepo.findByWorkspace(workspaceId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("count", events.size());
            TBLog.kv("DB rows", result);
            TBLog.info("Returning {} library events", events.size());
            
            return events;
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PostMapping("/workspaces/{workspaceId}/library-events")
    public ResponseEntity<LibraryEvent> createLibraryEvent(@PathVariable String workspaceId, @RequestBody LibraryEvent event) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("POST /api/workspaces/{workspaceId}/library-events", cid);
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("workspaceId", workspaceId);
            payload.put("event", event);
            TBLog.kv("Payload", payload);
            
            if (event.getId() == null || event.getId().isEmpty()) {
                event.setId("lib_" + UUID.randomUUID().toString());
            }
            event.setWorkspaceId(workspaceId);
            
            LibraryEvent saved = libRepo.save(event);
            
            Map<String, Object> dbResult = new HashMap<>();
            dbResult.put("id", saved.getId());
            dbResult.put("title", saved.getName());
            TBLog.kv("DB created", dbResult);
            TBLog.info("Created library event: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PutMapping("/library-events/{id}")
    public ResponseEntity<LibraryEvent> updateLibraryEvent(@PathVariable String id, @RequestBody LibraryEvent event) {
        if (!libRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        event.setId(id);
        LibraryEvent updated = libRepo.save(event);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/library-events/{id}")
    public ResponseEntity<Void> deleteLibraryEvent(@PathVariable String id) {
        if (!libRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        libRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

