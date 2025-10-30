package com.timeblocks.model;

import jakarta.persistence.*;

@Entity @Table(name="library_events")
public class LibraryEvent {
    @Id private String id;
    @Column(name="workspace_id", nullable=false) private String workspaceId;
    @Column(name="type_id") private String typeId;
    private String name;
    @Column(name="default_duration_min", nullable=false) private Integer defaultDurationMin;
    private String color;
    private String notes;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getTypeId() { return typeId; }
    public void setTypeId(String typeId) { this.typeId = typeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getDefaultDurationMin() { return defaultDurationMin; }
    public void setDefaultDurationMin(Integer defaultDurationMin) { this.defaultDurationMin = defaultDurationMin; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}

