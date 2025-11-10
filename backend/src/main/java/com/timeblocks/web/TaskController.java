package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Task;
import com.timeblocks.repo.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;

@RestController
@RequestMapping("/api")
public class TaskController {
    private final TaskRepository taskRepo;

    public TaskController(TaskRepository taskRepo) {
        this.taskRepo = taskRepo;
    }

    @GetMapping("/tasks")
    public List<Task> getTasks(@RequestParam(required = false) Integer typeId, 
                               @RequestParam(required = false) Integer type_id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/tasks", cid);
        try {
            Integer effectiveTypeId = typeId != null ? typeId : type_id;
            Map<String, Object> params = new HashMap<>();
            params.put("typeId", effectiveTypeId);
            TBLog.kv("Request params", params);
            
            List<Task> tasks;
            if (effectiveTypeId != null) {
                tasks = taskRepo.findByTypeId(effectiveTypeId);
            } else {
                tasks = taskRepo.findAll();
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("count", tasks.size());
            TBLog.kv("DB rows", result);
            TBLog.info("Returning {} tasks", tasks.size());
            
            return tasks;
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PostMapping("/tasks")
    public ResponseEntity<Task> createTask(@RequestBody Task task) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("POST /api/tasks", cid);
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type_id", task.getTypeId());
            payload.put("title", task.getTitle());
            payload.put("description", task.getDescription());
            payload.put("status", task.getStatus());
            payload.put("attached_date", task.getAttachedDate());
            TBLog.kv("Payload", payload);
            
            Task saved = taskRepo.save(task);
            
            Map<String, Object> dbResult = new HashMap<>();
            dbResult.put("id", saved.getId());
            dbResult.put("title", saved.getTitle());
            dbResult.put("type_id", saved.getTypeId());
            dbResult.put("attached_date", saved.getAttachedDate());
            TBLog.kv("DB created", dbResult);
            TBLog.info("Created task: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @PatchMapping("/tasks/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("PATCH /api/tasks/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            params.put("updates", updates);
            TBLog.kv("Update params", params);
            
            Task task = taskRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
            
            if (updates.containsKey("title")) {
                task.setTitle((String) updates.get("title"));
            }
            if (updates.containsKey("description")) {
                task.setDescription((String) updates.get("description"));
            }
            if (updates.containsKey("status")) {
                task.setStatus((String) updates.get("status"));
            }
            if (updates.containsKey("type_id")) {
                task.setTypeId(((Number) updates.get("type_id")).intValue());
            }
            if (updates.containsKey("attached_date")) {
                Object v = updates.get("attached_date");
                LocalDate d = v == null ? null : LocalDate.parse(String.valueOf(v));
                task.setAttachedDate(d);
            } else if (updates.containsKey("attachedDate")) {
                Object v = updates.get("attachedDate");
                LocalDate d = v == null ? null : LocalDate.parse(String.valueOf(v));
                task.setAttachedDate(d);
            }
            
            Task updated = taskRepo.save(task);
            TBLog.info("Updated task: {}", id);
            
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            TBLog.error("Handler error", e);
            throw e;
        } finally {
            TBLog.groupEnd();
        }
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteTask(@PathVariable Integer id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("DELETE /api/tasks/{id}", cid);
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("id", id);
            TBLog.kv("Delete params", params);
            
            if (!taskRepo.existsById(id)) {
                TBLog.warn("Task not found for deletion: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            taskRepo.deleteById(id);
            TBLog.info("Deleted task: {} (cascade will delete subtasks)", id);
            
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

