package com.timeblocks.model;

import jakarta.persistence.*;

@Entity
@Table(name = "schedule_occurrences_cache")
public class ScheduleOccurrenceCache {
    @Id
    private String id;

    @Column(name = "schedule_id", nullable = false)
    private String scheduleId;

    @Column(name = "occ_start_utc", nullable = false)
    private Long occStartUtc;

    @Column(name = "occ_end_utc", nullable = false)
    private Long occEndUtc;

    @Column(name = "lane_id")
    private String laneId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "meta")
    private String meta;

    @Column(name = "tz", nullable = false)
    private String tz;

    @Column(name = "generated_window")
    private String generatedWindow;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    // Getters/Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getScheduleId() { return scheduleId; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }
    public Long getOccStartUtc() { return occStartUtc; }
    public void setOccStartUtc(Long occStartUtc) { this.occStartUtc = occStartUtc; }
    public Long getOccEndUtc() { return occEndUtc; }
    public void setOccEndUtc(Long occEndUtc) { this.occEndUtc = occEndUtc; }
    public String getLaneId() { return laneId; }
    public void setLaneId(String laneId) { this.laneId = laneId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }
    public String getTz() { return tz; }
    public void setTz(String tz) { this.tz = tz; }
    public String getGeneratedWindow() { return generatedWindow; }
    public void setGeneratedWindow(String generatedWindow) { this.generatedWindow = generatedWindow; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}


