package com.timeblocks.model;

import jakarta.persistence.*;

@Entity @Table(name="event_types")
public class EventType {
    @Id private String id;
    @Column(name="workspace_id", nullable=false) private String workspaceId;
    private String name;
    private String color;
    private String icon;
    @Column(name="defaults_jsonb", nullable=false) private String defaultsJsonb = "{}";

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getDefaultsJsonb() { return defaultsJsonb; }
    public void setDefaultsJsonb(String defaultsJsonb) { 
        this.defaultsJsonb = (defaultsJsonb != null && !defaultsJsonb.isEmpty()) ? defaultsJsonb : "{}";
    }
}

