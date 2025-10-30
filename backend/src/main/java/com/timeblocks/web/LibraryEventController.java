package com.timeblocks.web;

import com.timeblocks.model.LibraryEvent;
import com.timeblocks.repo.LibraryEventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
        return libRepo.findByWorkspace(workspaceId);
    }

    @PostMapping("/workspaces/{workspaceId}/library-events")
    public ResponseEntity<LibraryEvent> createLibraryEvent(@PathVariable String workspaceId, @RequestBody LibraryEvent event) {
        if (event.getId() == null || event.getId().isEmpty()) {
            event.setId("lib_" + UUID.randomUUID().toString());
        }
        event.setWorkspaceId(workspaceId);
        LibraryEvent saved = libRepo.save(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
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

