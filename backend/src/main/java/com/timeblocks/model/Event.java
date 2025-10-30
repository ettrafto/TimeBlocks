package com.timeblocks.model;

import jakarta.persistence.*;

@Entity @Table(name="events")
public class Event {
    @Id private String id;
    @Column(name="calendar_id", nullable=false) private String calendarId;
    @Column(name="library_event_id") private String libraryEventId;
    @Column(name="type_id") private String typeId;
    private String title;
    private String notes;
    private String tzid;
    @Column(name="start_utc", nullable=false) private String startUtc;
    @Column(name="end_utc", nullable=false) private String endUtc;
    @Column(name="is_all_day") private Integer isAllDay = 0;
    @Column(name="recurrence_rule") private String recurrenceRule;
    @Column(name="created_by", nullable=false) private String createdBy;
    @Column(name="created_at_utc") private String createdAtUtc;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCalendarId() { return calendarId; }
    public void setCalendarId(String calendarId) { this.calendarId = calendarId; }

    public String getLibraryEventId() { return libraryEventId; }
    public void setLibraryEventId(String libraryEventId) { this.libraryEventId = libraryEventId; }

    public String getTypeId() { return typeId; }
    public void setTypeId(String typeId) { this.typeId = typeId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getTzid() { return tzid; }
    public void setTzid(String tzid) { this.tzid = tzid; }

    public String getStartUtc() { return startUtc; }
    public void setStartUtc(String startUtc) { this.startUtc = startUtc; }

    public String getEndUtc() { return endUtc; }
    public void setEndUtc(String endUtc) { this.endUtc = endUtc; }

    public Integer getIsAllDay() { return isAllDay; }
    public void setIsAllDay(Integer isAllDay) { this.isAllDay = isAllDay; }

    public String getRecurrenceRule() { return recurrenceRule; }
    public void setRecurrenceRule(String recurrenceRule) { this.recurrenceRule = recurrenceRule; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAtUtc() { return createdAtUtc; }
    public void setCreatedAtUtc(String createdAtUtc) { this.createdAtUtc = createdAtUtc; }
}

