package com.timeblocks.web;

import com.timeblocks.model.UserSettings;
import com.timeblocks.repo.UserSettingsRepository;
import com.timeblocks.logging.TBLog;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final UserSettingsRepository repo;
    private final DataSource dataSource;

    public SettingsController(UserSettingsRepository repo, DataSource dataSource) {
        this.repo = repo;
        this.dataSource = dataSource;
    }

    private static final Long SINGLETON_ID = 1L;

    private void ensureTableExists() {
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            // SQLite-compatible schema
            st.executeUpdate("CREATE TABLE IF NOT EXISTS user_settings (id INTEGER PRIMARY KEY, json TEXT)");
            TBLog.info("settings.table.ensure ok");
        } catch (Exception e) {
            TBLog.warn("settings.table.ensure failed: {}", e.getMessage());
        }
    }

    private String jdbcSelectJson() throws Exception {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT json FROM user_settings WHERE id = 1")) {
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString(1);
                }
            }
        }
        return null;
    }

    private void jdbcUpsertJson(String json) throws Exception {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("INSERT INTO user_settings (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json")) {
            ps.setString(1, json);
            ps.executeUpdate();
        }
    }

    private String defaultJson() {
        // Keep in sync with frontend DEFAULT_SETTINGS
        return """
        {
          "general": {
            "timeZone": "UTC",
            "dateFormat": "MDY",
            "timeFormat": "12h",
            "weekStart": "Mon",
            "workDays": ["Mon","Tue","Wed","Thu","Fri"],
            "workHours": { "start": "09:00", "end": "17:00" }
          },
          "appearance": { "theme": "system", "density": "comfortable" },
          "notifications": {
            "channels": { "inApp": true, "email": false, "push": false },
            "types": { "assigned": true, "dueSoon": true, "overdue": true, "comments": true, "projectChanges": true },
            "quietHours": null,
            "digest": "off"
          },
          "scheduling": {
            "defaultBlockMinutes": 30,
            "bufferMinutes": 5,
            "maxDailyMinutes": 480,
            "defaultReminderMinutes": 15
          },
          "tasks": {
            "defaultProjectId": null,
            "defaultPriority": "normal",
            "defaultLabels": [],
            "subtaskBlocksParent": true,
            "inheritDueDate": true
          },
          "calendar": {
            "provider": null,
            "isConnected": false,
            "defaultCalendarId": null,
            "syncDirection": "app_to_google",
            "mapping": "timed",
            "titleTemplate": "[Project] {name}",
            "includeCompleted": false
          },
          "accessibility": { "fontScale": 1, "reducedMotion": false, "highContrast": false },
          "advanced": { "enableBetas": false, "diagnostics": false }
        }
        """;
    }

    @GetMapping
    public ResponseEntity<String> get() {
        TBLog.groupStart("GET /api/settings", TBLog.newCorrelationId("settings"));
        ensureTableExists();
        try {
            Optional<UserSettings> opt = repo.findById(SINGLETON_ID);
            if (opt.isEmpty()) {
                UserSettings created = new UserSettings(SINGLETON_ID, defaultJson());
                repo.save(created);
                TBLog.kv("settings.created", "default row inserted");
                TBLog.groupEnd();
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(created.getJson());
            }
            String json = opt.get().getJson();
            TBLog.kv("settings.size", json != null ? json.length() : 0);
            TBLog.groupEnd();
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json);
        } catch (Exception ex) {
            try {
                TBLog.warn("settings.repo.get failed: {}", ex.getMessage());
                // Fallback to JDBC
                String json = jdbcSelectJson();
                if (json == null) {
                    json = defaultJson();
                    jdbcUpsertJson(json);
                    TBLog.kv("settings.jdbc.created", "default row inserted");
                }
                TBLog.kv("settings.jdbc.size", json.length());
                TBLog.groupEnd();
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
            } catch (Exception ex2) {
                TBLog.error("settings.jdbc.get failed", ex2);
                TBLog.groupEnd();
                return ResponseEntity.status(500).contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"settings load failed\"}");
            }
        }
    }

    @PutMapping
    public ResponseEntity<Void> put(@RequestBody String body) {
        TBLog.groupStart("PUT /api/settings", TBLog.newCorrelationId("settings"));
        TBLog.kv("settings.in.size", body != null ? body.length() : 0);
        ensureTableExists();
        try {
            // Accept arbitrary JSON and store as-is
            UserSettings existing = repo.findById(SINGLETON_ID).orElse(new UserSettings(SINGLETON_ID, defaultJson()));
            existing.setJson(body);
            repo.save(existing);
            TBLog.info("settings.saved");
            TBLog.groupEnd();
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            try {
                TBLog.warn("settings.repo.put failed: {}", ex.getMessage());
                jdbcUpsertJson(body != null ? body : defaultJson());
                TBLog.info("settings.saved.jdbc");
                TBLog.groupEnd();
                return ResponseEntity.noContent().build();
            } catch (Exception ex2) {
                TBLog.error("settings.jdbc.put failed", ex2);
                TBLog.groupEnd();
                return ResponseEntity.status(500).build();
            }
        }
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportJson() {
        TBLog.groupStart("GET /api/settings/export", TBLog.newCorrelationId("settings"));
        ensureTableExists();
        try {
            String json = repo.findById(SINGLETON_ID).map(UserSettings::getJson).orElse(defaultJson());
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            TBLog.kv("settings.export.size", bytes.length);
            TBLog.groupEnd();
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Content-Disposition", "attachment; filename=\"settings.json\"")
                    .body(bytes);
        } catch (Exception ex) {
            try {
                TBLog.warn("settings.repo.export failed: {}", ex.getMessage());
                String json = jdbcSelectJson();
                if (json == null) json = defaultJson();
                byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
                TBLog.kv("settings.export.size.jdbc", bytes.length);
                TBLog.groupEnd();
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Content-Disposition", "attachment; filename=\"settings.json\"")
                        .body(bytes);
            } catch (Exception ex2) {
                TBLog.error("settings.jdbc.export failed", ex2);
                TBLog.groupEnd();
                return ResponseEntity.status(500).body("{}".getBytes(StandardCharsets.UTF_8));
            }
        }
    }
}


