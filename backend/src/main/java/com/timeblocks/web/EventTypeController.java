package com.timeblocks.web;

import com.timeblocks.model.EventType;
import com.timeblocks.repo.EventTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class EventTypeController {
    private final EventTypeRepository typeRepo;

    public EventTypeController(EventTypeRepository typeRepo) {
        this.typeRepo = typeRepo;
    }

    @GetMapping("/workspaces/{workspaceId}/types")
    public List<EventType> getTypes(@PathVariable String workspaceId) {
        return typeRepo.findByWorkspace(workspaceId);
    }

    @PostMapping("/workspaces/{workspaceId}/types")
    public ResponseEntity<EventType> createType(@PathVariable String workspaceId, @RequestBody EventType type) {
        if (type.getId() == null || type.getId().isEmpty()) {
            type.setId("type_" + UUID.randomUUID().toString());
        }
        type.setWorkspaceId(workspaceId);
        
        // Ensure defaults_jsonb has a value
        if (type.getDefaultsJsonb() == null || type.getDefaultsJsonb().isEmpty()) {
            type.setDefaultsJsonb("{}");
        }
        
        EventType saved = typeRepo.save(type);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/types/{id}")
    public ResponseEntity<EventType> updateType(@PathVariable String id, @RequestBody EventType type) {
        EventType existing = typeRepo.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Preserve required fields from existing entity
        type.setId(id);
        type.setWorkspaceId(existing.getWorkspaceId());
        
        // Ensure defaults_jsonb has a value
        if (type.getDefaultsJsonb() == null || type.getDefaultsJsonb().isEmpty()) {
            type.setDefaultsJsonb(existing.getDefaultsJsonb() != null ? existing.getDefaultsJsonb() : "{}");
        }
        
        EventType updated = typeRepo.save(type);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/types/{id}")
    public ResponseEntity<Void> deleteType(@PathVariable String id) {
        if (!typeRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        typeRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

