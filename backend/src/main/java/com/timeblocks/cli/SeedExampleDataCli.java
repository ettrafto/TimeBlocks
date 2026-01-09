package com.timeblocks.cli;

import com.timeblocks.TimeBlocksApplication;
import com.timeblocks.model.*;
import com.timeblocks.repo.*;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * CLI tool to seed example data for the admin account.
 * Creates event types, tasks, and calendar events.
 */
public final class SeedExampleDataCli {

    private SeedExampleDataCli() {
        // utility
    }

    public static void main(String[] args) {
        int exitCode = 0;
        ConfigurableApplicationContext context = null;
        try {
            context = new SpringApplicationBuilder(TimeBlocksApplication.class)
                    .profiles("dev")
                    .web(WebApplicationType.NONE)
                    .logStartupInfo(false)
                    .run(args);

            seedExampleData(context);
            System.out.println("[SeedExampleDataCli] Example data seeded successfully.");
        } catch (Exception ex) {
            exitCode = 1;
            System.err.println("[SeedExampleDataCli] Failed to seed example data: " + ex.getMessage());
            ex.printStackTrace(System.err);
        } finally {
            if (context != null) {
                context.close();
            }
        }
        System.exit(exitCode);
    }

    private static void seedExampleData(ConfigurableApplicationContext context) {
        UserRepository userRepo = context.getBean(UserRepository.class);
        EventTypeRepository eventTypeRepo = context.getBean(EventTypeRepository.class);
        TypeRepository typeRepo = context.getBean(TypeRepository.class);
        TaskRepository taskRepo = context.getBean(TaskRepository.class);
        EventRepository eventRepo = context.getBean(EventRepository.class);

        // Get admin user
        User admin = userRepo.findByEmail("admin@local.test")
                .orElseThrow(() -> new RuntimeException("Admin user not found. Run seedAdmin first."));

        String adminUserId = admin.getId().toString();
        String workspaceId = "ws_admin";
        String calendarId = "cal_admin";

        System.out.println("[SeedExampleDataCli] Admin user: " + admin.getEmail() + " (ID: " + adminUserId + ")");
        System.out.println("[SeedExampleDataCli] Workspace: " + workspaceId);
        System.out.println("[SeedExampleDataCli] Calendar: " + calendarId);

        // Create Event Types (for workspace)
        System.out.println("\n[SeedExampleDataCli] Creating event types...");
        List<EventType> eventTypes = List.of(
                createEventType("type_deep", workspaceId, "Deep Work", "#2563eb", "💻", "{\"duration\": 90}"),
                createEventType("type_meeting", workspaceId, "Meeting", "#dc2626", "👥", "{\"duration\": 60}"),
                createEventType("type_gym", workspaceId, "Workout", "#16a34a", "🏋️", "{\"duration\": 60}"),
                createEventType("type_break", workspaceId, "Break", "#f59e0b", "☕", "{\"duration\": 15}"),
                createEventType("type_personal", workspaceId, "Personal", "#8b5cf6", "📝", "{\"duration\": 30}")
        );

        for (EventType et : eventTypes) {
            if (eventTypeRepo.findById(et.getId()).isEmpty()) {
                eventTypeRepo.save(et);
                System.out.println("  ✓ Created event type: " + et.getName());
            } else {
                System.out.println("  - Event type already exists: " + et.getName());
            }
        }

        // Ensure we have at least one Type (for tasks)
        System.out.println("\n[SeedExampleDataCli] Ensuring base types exist...");
        Type workType = typeRepo.findAll().stream()
                .filter(t -> "Work".equalsIgnoreCase(t.getName()))
                .findFirst()
                .orElse(null);
        
        if (workType == null) {
            workType = new Type();
            workType.setName("Work");
            workType.setColor("#2563eb");
            workType = typeRepo.save(workType);
            System.out.println("  ✓ Created type: Work");
        } else {
            System.out.println("  - Type already exists: Work");
        }

        // Create Tasks
        System.out.println("\n[SeedExampleDataCli] Creating tasks...");
        List<Task> tasks = List.of(
                createTask(workType.getId(), "Review project proposal", "Review and provide feedback on Q4 project proposal", 60),
                createTask(workType.getId(), "Update documentation", "Update API documentation with latest changes", 45),
                createTask(workType.getId(), "Team standup prep", "Prepare notes for tomorrow's standup meeting", 15),
                createTask(workType.getId(), "Code review", "Review pull requests from team members", 90)
        );

        for (Task task : tasks) {
            Task saved = taskRepo.save(task);
            System.out.println("  ✓ Created task: " + saved.getTitle() + " (ID: " + saved.getId() + ")");
        }

        // Create Calendar Events
        System.out.println("\n[SeedExampleDataCli] Creating calendar events...");
        ZoneId tz = ZoneId.of("America/New_York");
        LocalDate today = LocalDate.now(tz);

        // Today's events
        Instant morningStart = today.atTime(9, 0).atZone(tz).toInstant();
        Instant morningEnd = morningStart.plus(90, ChronoUnit.MINUTES);
        createEvent(eventRepo, calendarId, adminUserId, "type_deep", "Deep Work Session", morningStart, morningEnd, tz.getId());

        Instant lunchStart = today.atTime(12, 0).atZone(tz).toInstant();
        Instant lunchEnd = lunchStart.plus(60, ChronoUnit.MINUTES);
        createEvent(eventRepo, calendarId, adminUserId, "type_break", "Lunch Break", lunchStart, lunchEnd, tz.getId());

        Instant meetingStart = today.atTime(14, 0).atZone(tz).toInstant();
        Instant meetingEnd = meetingStart.plus(60, ChronoUnit.MINUTES);
        createEvent(eventRepo, calendarId, adminUserId, "type_meeting", "Team Sync", meetingStart, meetingEnd, tz.getId());

        // Tomorrow's events
        LocalDate tomorrow = today.plusDays(1);
        Instant gymStart = tomorrow.atTime(7, 0).atZone(tz).toInstant();
        Instant gymEnd = gymStart.plus(60, ChronoUnit.MINUTES);
        createEvent(eventRepo, calendarId, adminUserId, "type_gym", "Morning Workout", gymStart, gymEnd, tz.getId());

        Instant workStart = tomorrow.atTime(10, 0).atZone(tz).toInstant();
        Instant workEnd = workStart.plus(120, ChronoUnit.MINUTES);
        createEvent(eventRepo, calendarId, adminUserId, "type_deep", "Focus Time", workStart, workEnd, tz.getId());

        System.out.println("  ✓ Created 5 calendar events");
    }

    private static EventType createEventType(String id, String workspaceId, String name, String color, String icon, String defaults) {
        EventType et = new EventType();
        et.setId(id);
        et.setWorkspaceId(workspaceId);
        et.setName(name);
        et.setColor(color);
        et.setIcon(icon);
        et.setDefaultsJsonb(defaults);
        return et;
    }

    private static Task createTask(Integer typeId, String title, String description, Integer duration) {
        Task task = new Task();
        task.setTypeId(typeId);
        task.setTitle(title);
        task.setDescription(description);
        task.setDuration(duration);
        task.setStatus("todo");
        return task;
    }

    private static void createEvent(EventRepository repo, String calendarId, String createdBy, String typeId,
                                   String title, Instant start, Instant end, String tzid) {
        Event event = new Event();
        event.setId("evt_" + UUID.randomUUID().toString());
        event.setCalendarId(calendarId);
        event.setCreatedBy(createdBy);
        event.setTypeId(typeId);
        event.setTitle(title);
        event.setStartUtc(start.toString());
        event.setEndUtc(end.toString());
        event.setTzid(tzid);
        event.setIsAllDay(0);
        event.setCreatedAtUtc(Instant.now().toString());
        repo.save(event);
    }
}

