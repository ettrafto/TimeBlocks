package com.timeblocks.web;

import com.timeblocks.logging.TBLog;
import com.timeblocks.model.Schedule;
import com.timeblocks.model.ScheduleException;
import com.timeblocks.repo.ScheduleExceptionRepository;
import com.timeblocks.repo.TaskRepository;
import com.timeblocks.model.Task;
import com.timeblocks.repo.ScheduleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ScheduleController {
    private final ScheduleRepository schedules;
    private final ScheduleExceptionRepository exceptions;
    private final TaskRepository tasks;

    public ScheduleController(ScheduleRepository schedules, ScheduleExceptionRepository exceptions, TaskRepository tasks) {
        this.schedules = schedules;
        this.exceptions = exceptions;
        this.tasks = tasks;
    }

    // =============================
    // GET /api/schedules?timeMin&timeMax&laneId&includeCache
    // =============================
    @GetMapping("/schedules")
    public List<Map<String,Object>> listOccurrences(@RequestParam String timeMin,
                                                    @RequestParam String timeMax,
                                                    @RequestParam(required = false) String laneId,
                                                    @RequestParam(required = false, defaultValue = "0") int includeCache) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("GET /api/schedules", cid);
        try {
            long from = parseIsoToEpochMs(timeMin);
            long to   = parseIsoToEpochMs(timeMax);

            List<Schedule> base = schedules.findForWindow(from, to);
            if (laneId != null && !laneId.isBlank()) {
                base.removeIf(s -> s.getLaneId() != null && !laneId.equals(s.getLaneId()));
            }

            List<Map<String,Object>> out = new ArrayList<>();
            for (Schedule s : base) {
                List<ScheduleException> ex = exceptions.findByScheduleId(s.getId());
                // Enrich with task metadata once per schedule
                Integer taskIdInt = null; Task task = null;
                try { taskIdInt = s.getTaskId() != null ? Integer.parseInt(s.getTaskId()) : null; } catch (NumberFormatException ignored) {}
                if (taskIdInt != null) { task = tasks.findById(taskIdInt).orElse(null); }
                out.addAll(expandScheduleInRange(s, ex, from, to, task));
            }
            // Filter invalid entries and sort by start then end
            out.removeIf(o -> o == null || o.get("start") == null || o.get("end") == null);
            out.sort(Comparator.comparingLong((Map<String,Object> o) -> (Long)o.get("start"))
                    .thenComparingLong((Map<String,Object> o) -> (Long)o.get("end")));
            TBLog.kv("occurrences", Map.of("count", out.size()));
            return out;
        } finally {
            TBLog.groupEnd();
        }
    }

    // =============================
    // POST /api/schedules
    // =============================
    @PostMapping("/schedules")
    public ResponseEntity<Schedule> create(@RequestBody Schedule dto) {
        if (dto.getEndTsUtc() == null || dto.getStartTsUtc() == null || dto.getEndTsUtc() <= dto.getStartTsUtc()) {
            return ResponseEntity.badRequest().build();
        }
        // Ensure we have an associated task id
        if (dto.getId() == null || dto.getId().isBlank()) {
            dto.setId(UUID.randomUUID().toString());
        }
        if (dto.getCreatedAt() == null) dto.setCreatedAt(System.currentTimeMillis());
        if (dto.getUpdatedAt() == null) dto.setUpdatedAt(System.currentTimeMillis());
        Schedule saved = schedules.save(dto);

        // Mark the related task as scheduled (persistent flag)
        try {
            Integer taskIdInt = null;
            try { taskIdInt = saved.getTaskId() != null ? Integer.parseInt(saved.getTaskId()) : null; } catch (NumberFormatException ignored) {}
            if (taskIdInt != null) {
                tasks.findById(taskIdInt).ifPresent(t -> {
                    if (Boolean.FALSE.equals(t.getScheduled())) {
                        t.setScheduled(true);
                        tasks.save(t);
                    }
                });
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(saved);
    }

    // =============================
    // PUT /api/schedules/:id (partial update via map)
    // =============================
    @PutMapping("/schedules/{id}")
    public ResponseEntity<Schedule> update(@PathVariable String id, @RequestBody Map<String,Object> patch) {
        Optional<Schedule> opt = schedules.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Schedule s = opt.get();
        String oldTaskId = s.getTaskId();
        if (patch.containsKey("taskId")) s.setTaskId(String.valueOf(patch.get("taskId")));
        if (patch.containsKey("start")) s.setStartTsUtc(((Number)patch.get("start")).longValue());
        if (patch.containsKey("end")) s.setEndTsUtc(((Number)patch.get("end")).longValue());
        if (patch.containsKey("timezone")) s.setTimezone((String)patch.get("timezone"));
        if (patch.containsKey("laneId")) s.setLaneId((String)patch.get("laneId"));
        if (patch.containsKey("allDay")) s.setAllDay(((Number)patch.get("allDay")).intValue());
        if (patch.containsKey("status")) s.setStatus((String)patch.get("status"));
        if (patch.containsKey("recurrenceRule")) s.setRecurrenceRule((String)patch.get("recurrenceRule"));
        if (patch.containsKey("meta")) s.setMeta((String)patch.get("meta"));
        if (s.getEndTsUtc() <= s.getStartTsUtc()) return ResponseEntity.badRequest().build();
        s.setUpdatedAt(System.currentTimeMillis());
        Schedule saved = schedules.save(s);

        // Maintain scheduled flag if task link changed
        try {
            String newTaskId = saved.getTaskId();
            if (newTaskId != null && !newTaskId.equals(oldTaskId)) {
                // Set new task as scheduled
                try {
                    Integer newTaskInt = Integer.parseInt(newTaskId);
                    tasks.findById(newTaskInt).ifPresent(t -> {
                        if (Boolean.FALSE.equals(t.getScheduled())) {
                            t.setScheduled(true);
                            tasks.save(t);
                        }
                    });
                } catch (NumberFormatException ignored) {}
                // Potentially clear old task if no remaining schedules
                if (oldTaskId != null && schedules.countByTaskId(oldTaskId) == 0) {
                    try {
                        Integer oldTaskInt = Integer.parseInt(oldTaskId);
                        tasks.findById(oldTaskInt).ifPresent(t -> {
                            if (Boolean.TRUE.equals(t.getScheduled())) {
                                t.setScheduled(false);
                                tasks.save(t);
                            }
                        });
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(saved);
    }

    // =============================
    // DELETE /api/schedules/:id
    // =============================
    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<Map<String,Boolean>> delete(@PathVariable String id) {
        String cid = TBLog.getCorrelationId();
        TBLog.groupStart("DELETE /api/schedules/{id}", cid);
        try {
            TBLog.kv("Path", Map.of("id", id));
            Optional<Schedule> toDelete = schedules.findById(id);
            if (toDelete.isEmpty()) return ResponseEntity.notFound().build();
            Schedule s = toDelete.get();
            String taskId = s.getTaskId();
            schedules.deleteById(id);
            // After deletion, update task.scheduled if needed
            try {
                if (taskId != null && schedules.countByTaskId(taskId) == 0) {
                    Integer taskInt = null;
                    try { taskInt = Integer.parseInt(taskId); } catch (NumberFormatException ignored) {}
                    if (taskInt != null) {
                        tasks.findById(taskInt).ifPresent(t -> {
                            if (Boolean.TRUE.equals(t.getScheduled())) {
                                t.setScheduled(false);
                                tasks.save(t);
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
            TBLog.info("Deleted schedule", Map.of("id", id));
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            TBLog.error("Error deleting schedule", e);
            throw e;
        } finally { TBLog.groupEnd(); }
    }

    // =============================
    // Exceptions
    // =============================
    @PostMapping("/schedules/{id}/exceptions")
    public ResponseEntity<ScheduleException> createException(@PathVariable String id, @RequestBody ScheduleException dto) {
        if (!schedules.existsById(id)) return ResponseEntity.notFound().build();
        if (dto.getId() == null || dto.getId().isBlank()) dto.setId(UUID.randomUUID().toString());
        dto.setScheduleId(id);
        if (dto.getCreatedAt() == null) dto.setCreatedAt(System.currentTimeMillis());
        return ResponseEntity.ok(exceptions.save(dto));
    }

    @DeleteMapping("/schedule-exceptions/{exceptionId}")
    public ResponseEntity<Map<String,Boolean>> deleteException(@PathVariable String exceptionId) {
        if (!exceptions.existsById(exceptionId)) return ResponseEntity.notFound().build();
        exceptions.deleteById(exceptionId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // =============================
    // Helpers
    // =============================
    private static long parseIsoToEpochMs(String iso) {
        try {
            return Instant.parse(iso).toEpochMilli();
        } catch (DateTimeParseException e) {
            // Try lenient parsing if needed
            return ZonedDateTime.parse(iso).toInstant().toEpochMilli();
        }
    }

    private static List<Map<String,Object>> expandScheduleInRange(Schedule s, List<ScheduleException> exList, long from, long to, Task task) {
        List<Map<String,Object>> out = new ArrayList<>();
        long dur = Math.max(1, s.getEndTsUtc() - s.getStartTsUtc());

        if (s.getRecurrenceRule() == null || s.getRecurrenceRule().isBlank()) {
            // one-time
            if (s.getEndTsUtc() >= from && s.getStartTsUtc() <= to) {
                Map<String,Object> occ = baseOcc(s, s.getStartTsUtc(), s.getStartTsUtc() + dur, task);
                occ = applyException(occ, exList);
                if (occ != null) out.add(occ);
            }
            return out;
        }

        // Minimal RRULE support: FREQ=DAILY or WEEKLY; BYDAY=MO,WE,...
        String rule = s.getRecurrenceRule();
        Map<String,String> parts = new HashMap<>();
        for (String p : rule.split(";")) {
            String[] kv = p.split("=", 2);
            if (kv.length == 2) parts.put(kv[0].toUpperCase(Locale.ROOT), kv[1]);
        }
        String freq = parts.getOrDefault("FREQ", "WEEKLY").toUpperCase(Locale.ROOT);
        Set<DayOfWeek> byDays = parseByDay(parts.get("BYDAY"));

        // Iterate days in window (bounded)
        long dayMs = 24L * 60 * 60 * 1000;
        long cursor = from - (from % dayMs);
        ZoneId zone = ZoneId.of(Optional.ofNullable(s.getTimezone()).orElse("UTC"));
        while (cursor <= to) {
            Instant inst = Instant.ofEpochMilli(cursor);
            ZonedDateTime zdt = inst.atZone(zone);
            boolean include = false;
            if ("DAILY".equals(freq)) include = true;
            else if ("WEEKLY".equals(freq)) include = byDays.isEmpty() || byDays.contains(zdt.getDayOfWeek());

            if (include) {
                long occStart = alignStartForTemplate(zdt, s.getStartTsUtc(), zone);
                long occEnd = occStart + dur;
                if (occEnd >= from && occStart <= to) {
                    Map<String,Object> occ = baseOcc(s, occStart, occEnd, task);
                    occ = applyException(occ, exList);
                    if (occ != null) out.add(occ);
                }
            }
            cursor += dayMs;
        }
        return out;
    }

    private static Set<DayOfWeek> parseByDay(String byDay) {
        Set<DayOfWeek> out = new HashSet<>();
        if (byDay == null || byDay.isBlank()) return out;
        for (String token : byDay.split(",")) {
            switch (token.trim().toUpperCase(Locale.ROOT)) {
                case "MO": out.add(DayOfWeek.MONDAY); break;
                case "TU": out.add(DayOfWeek.TUESDAY); break;
                case "WE": out.add(DayOfWeek.WEDNESDAY); break;
                case "TH": out.add(DayOfWeek.THURSDAY); break;
                case "FR": out.add(DayOfWeek.FRIDAY); break;
                case "SA": out.add(DayOfWeek.SATURDAY); break;
                case "SU": out.add(DayOfWeek.SUNDAY); break;
            }
        }
        return out;
    }

    private static long alignStartForTemplate(ZonedDateTime day, long templateStartUtc, ZoneId zone) {
        // Use the template's time-of-day in its timezone
        Instant templ = Instant.ofEpochMilli(templateStartUtc);
        ZonedDateTime tzTempl = templ.atZone(zone);
        ZonedDateTime combined = day.withHour(tzTempl.getHour()).withMinute(tzTempl.getMinute())
                .withSecond(0).withNano(0);
        return combined.toInstant().toEpochMilli();
    }

    private static Map<String,Object> baseOcc(Schedule s, long start, long end, Task task) {
        Map<String,Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("occId", s.getId() + ":" + start);
        m.put("taskId", s.getTaskId());
        if (task != null) {
            m.put("taskTitle", task.getTitle());
            if (task.getTypeId() != null) m.put("typeId", task.getTypeId());
        }
        m.put("laneId", s.getLaneId());
        m.put("tz", s.getTimezone());
        m.put("start", start);
        m.put("end", end);
        m.put("allDay", s.getAllDay());
        m.put("status", s.getStatus());
        m.put("isRecurring", s.getRecurrenceRule() != null && !s.getRecurrenceRule().isBlank());
        m.put("baseScheduleMeta", s.getMeta());
        return m;
    }

    private static Map<String,Object> applyException(Map<String,Object> occ, List<ScheduleException> exceptions) {
        if (occ == null || exceptions == null || exceptions.isEmpty()) return occ;
        Object s = occ.get("start");
        if (!(s instanceof Long)) return occ;
        long start = (Long)s;
        for (ScheduleException ex : exceptions) {
            if (Objects.equals(ex.getExDateUtc(), start)) {
                // Skip
                if (ex.getChangeStartTsUtc() == null && ex.getChangeEndTsUtc() == null
                        && ex.getChangeLaneId() == null && ex.getChangeStatus() == null) {
                    return null;
                }
                if (ex.getChangeStartTsUtc() != null) occ.put("start", ex.getChangeStartTsUtc());
                if (ex.getChangeEndTsUtc() != null) occ.put("end", ex.getChangeEndTsUtc());
                if (ex.getChangeLaneId() != null) occ.put("laneId", ex.getChangeLaneId());
                if (ex.getChangeStatus() != null) occ.put("status", ex.getChangeStatus());
                occ.put("occurrenceMeta", ex.getMeta());
            }
        }
        return occ;
    }
}


