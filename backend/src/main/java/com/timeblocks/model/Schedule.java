package com.timeblocks.model;

import jakarta.persistence.*;

@Entity
@Table(name = "schedules")
public class Schedule {
    @Id
    private String id;

    @Column(name = "task_id", nullable = false)
    private String taskId;

    @Column(name = "start_ts_utc", nullable = false)
    private Long startTsUtc;

    @Column(name = "end_ts_utc", nullable = false)
    private Long endTsUtc;

    @Column(name = "timezone", nullable = false)
    private String timezone;

    @Column(name = "all_day", nullable = false)
    private Integer allDay = 0;

    @Column(name = "lane_id")
    private String laneId;

    @Column(name = "status", nullable = false)
    private String status = "confirmed";

    @Column(name = "recurrence_rule")
    private String recurrenceRule;

    @Column(name = "meta")
    private String meta;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    // Getters/Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }
    public Long getStartTsUtc() { return startTsUtc; }
    public void setStartTsUtc(Long startTsUtc) { this.startTsUtc = startTsUtc; }
    public Long getEndTsUtc() { return endTsUtc; }
    public void setEndTsUtc(Long endTsUtc) { this.endTsUtc = endTsUtc; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public Integer getAllDay() { return allDay; }
    public void setAllDay(Integer allDay) { this.allDay = allDay; }
    public String getLaneId() { return laneId; }
    public void setLaneId(String laneId) { this.laneId = laneId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRecurrenceRule() { return recurrenceRule; }
    public void setRecurrenceRule(String recurrenceRule) { this.recurrenceRule = recurrenceRule; }
    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}


