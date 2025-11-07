package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Subtask;
import com.timeblocks.repo.SubtaskRepository;
import com.timeblocks.repo.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubtaskController {
    private final SubtaskRepository subtaskRepo;
    private final TaskRepository taskRepo;

    public SubtaskController(SubtaskRepository subtaskRepo, TaskRepository taskRepo) {
        this.subtaskRepo = subtaskRepo;
        this.taskRepo = taskRepo;
    }

    @GetMapping("/subtasks")
    public List<Subtask> getSubtasks(@RequestParam(required = false) Integer taskId,
                                     @RequestParam(required = false) Integer task_id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/subtasks", cid);
        try {
            Integer effectiveTaskId = taskId != null ? taskId : task_id;
            Map<String, Object> params = new HashMap<>();
            params.put("taskId", effectiveTaskId);
            TBLog.kv("Request params", params);
            
            if (effectiveTaskId == null) {
                TBLog.warn("taskId parameter required");
                return List.of();
            }
            
            List<Subtask> subtasks = subtaskRepo.findByTaskId(effectiveTaskId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("count", subtasks.size());
            TBLog.kv("DB rows", result);
            TBLog.info("Returning {} subtasks", subtasks.size());
            
            return subtasks;
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PostMapping("/subtasks")
    public ResponseEntity<Subtask> createSubtask(@RequestBody Subtask subtask) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("POST /api/subtasks", cid);
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("task_id", subtask.getTaskId());
            payload.put("title", subtask.getTitle());
            payload.put("done", subtask.getDone());
            payload.put("orderIndex", subtask.getOrderIndex());
            TBLog.kv("Payload", payload);
            
            // Validate input early with explicit logging
            if (subtask.getTaskId() == null) {
                TBLog.warn("Validation failed: task_id is null");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            if (subtask.getTitle() == null || subtask.getTitle().trim().isEmpty()) {
                TBLog.warn("Validation failed: title is blank");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            // Ensure parent task exists to avoid FK 500
            if (!taskRepo.existsById(subtask.getTaskId())) {
                TBLog.warn("Validation failed: parent task not found: {}", subtask.getTaskId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            Subtask saved = subtaskRepo.save(subtask);
            
            Map<String, Object> dbResult = new HashMap<>();
            dbResult.put("id", saved.getId());
            dbResult.put("title", saved.getTitle());
            dbResult.put("task_id", saved.getTaskId());
            TBLog.kv("DB created", dbResult);
            TBLog.info("Created subtask: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            TBLog.error("Handler error (createSubtask)", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PatchMapping("/subtasks/{id}")
    public ResponseEntity<Subtask> updateSubtask(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("PATCH /api/subtasks/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            params.put("updates", updates);
            TBLog.kv("Update params", params);
            
            Subtask subtask = subtaskRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Subtask not found: " + id));
            
            if (updates.containsKey("title")) {
                subtask.setTitle((String) updates.get("title"));
            }
            if (updates.containsKey("done")) {
                Object doneValue = updates.get("done");
                if (doneValue instanceof Boolean) {
                    subtask.setDone((Boolean) doneValue);
                } else if (doneValue instanceof Number) {
                    subtask.setDone(((Number) doneValue).intValue());
                }
            }
            if (updates.containsKey("order_index")) {
                subtask.setOrderIndex(((Number) updates.get("order_index")).intValue());
            }
            
            Subtask updated = subtaskRepo.save(subtask);
            TBLog.info("Updated subtask: {}", id);
            
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @DeleteMapping("/subtasks/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteSubtask(@PathVariable Integer id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("DELETE /api/subtasks/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            TBLog.kv("Delete params", params);
            
            if (!subtaskRepo.existsById(id)) {
                TBLog.warn("Subtask not found for deletion: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            subtaskRepo.deleteById(id);
            TBLog.info("Deleted subtask: {}", id);
            
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

