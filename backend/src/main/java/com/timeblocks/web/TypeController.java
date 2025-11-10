package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Type;
import com.timeblocks.repo.TypeRepository;
import com.timeblocks.repo.TaskRepository;
import com.timeblocks.repo.SubtaskRepository;
import com.timeblocks.repo.EventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TypeController {
    private final TypeRepository typeRepo;
    private final TaskRepository taskRepo;
    private final SubtaskRepository subtaskRepo;
    private final EventRepository eventRepo;

    public TypeController(TypeRepository typeRepo,
                          TaskRepository taskRepo,
                          SubtaskRepository subtaskRepo,
                          EventRepository eventRepo) {
        this.typeRepo = typeRepo;
        this.taskRepo = taskRepo;
        this.subtaskRepo = subtaskRepo;
        this.eventRepo = eventRepo;
    }

    @GetMapping("/types")
    public List<Type> getAllTypes() {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/types", cid);
        try {
            List<Type> types = typeRepo.findAllByOrderByIdAsc();
            Map<String, Object> result = new HashMap<>();
            result.put("count", types.size());
            TBLog.kv("DB rows", result);
            TBLog.info("Returning {} types", types.size());
            return types;
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PostMapping("/types")
    public ResponseEntity<Type> createType(@RequestBody Type type) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("POST /api/types", cid);
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("name", type.getName());
            payload.put("color", type.getColor());
            TBLog.kv("Payload", payload);
            
            Type saved = typeRepo.save(type);
            
            Map<String, Object> dbResult = new HashMap<>();
            dbResult.put("id", saved.getId());
            dbResult.put("name", saved.getName());
            TBLog.kv("DB created", dbResult);
            TBLog.info("Created type: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PatchMapping("/types/{id}")
    public ResponseEntity<Type> updateType(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("PATCH /api/types/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            params.put("updates", updates);
            TBLog.kv("Update params", params);
            
            Type type = typeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Type not found: " + id));
            
            if (updates.containsKey("name")) {
                type.setName((String) updates.get("name"));
            }
            if (updates.containsKey("color")) {
                type.setColor((String) updates.get("color"));
            }
            
            Type updated = typeRepo.save(type);
            TBLog.info("Updated type: {}", id);
            
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @DeleteMapping("/types/{id}")
    @Transactional
    public ResponseEntity<Map<String, Boolean>> deleteType(@PathVariable Integer id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("DELETE /api/types/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            TBLog.kv("Delete params", params);
            
            if (!typeRepo.existsById(id)) {
                TBLog.warn("Type not found for deletion: {}", id);
                return ResponseEntity.notFound().build();
            }

            // Load task ids linked to this type
            List<Integer> taskIds = taskRepo.findIdsByTypeId(id);
            TBLog.kv("tasks.for.type", Map.of("typeId", id, "count", taskIds.size()));

            if (!taskIds.isEmpty()) {
                try {
                    subtaskRepo.deleteByTaskIds(taskIds);
                    TBLog.kv("subtasks.deleted", Map.of("count", taskIds.size()));
                } catch (Exception e) {
                    TBLog.warn("Failed deleting subtasks for tasks {}: {}", taskIds, e.getMessage());
                }
                try {
                    for (Integer taskId : taskIds) {
                        eventRepo.deleteByTaskId(String.valueOf(taskId));
                    }
                } catch (Exception e) {
                    TBLog.warn("Failed deleting events for tasks {}: {}", taskIds, e.getMessage());
                }
                taskRepo.deleteByTypeId(id);
                TBLog.kv("tasks.deleted", Map.of("count", taskIds.size()));
            }
            
            typeRepo.deleteById(id);
            TBLog.info("Deleted type: {}", id);
            
            Map<String, Boolean> response = new HashMap<>();
            response.put("ok", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }
}

