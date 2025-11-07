package com.timeblocks.model;

import jakarta.persistence.*;

@Entity
@Table(name = "schedule_exceptions")
public class ScheduleException {
    @Id
    private String id;

    @Column(name = "schedule_id", nullable = false)
    private String scheduleId;

    @Column(name = "ex_date_utc", nullable = false)
    private Long exDateUtc;

    @Column(name = "change_start_ts_utc")
    private Long changeStartTsUtc;

    @Column(name = "change_end_ts_utc")
    private Long changeEndTsUtc;

    @Column(name = "change_lane_id")
    private String changeLaneId;

    @Column(name = "change_status")
    private String changeStatus;

    @Column(name = "meta")
    private String meta;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    // Getters/Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getScheduleId() { return scheduleId; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }
    public Long getExDateUtc() { return exDateUtc; }
    public void setExDateUtc(Long exDateUtc) { this.exDateUtc = exDateUtc; }
    public Long getChangeStartTsUtc() { return changeStartTsUtc; }
    public void setChangeStartTsUtc(Long changeStartTsUtc) { this.changeStartTsUtc = changeStartTsUtc; }
    public Long getChangeEndTsUtc() { return changeEndTsUtc; }
    public void setChangeEndTsUtc(Long changeEndTsUtc) { this.changeEndTsUtc = changeEndTsUtc; }
    public String getChangeLaneId() { return changeLaneId; }
    public void setChangeLaneId(String changeLaneId) { this.changeLaneId = changeLaneId; }
    public String getChangeStatus() { return changeStatus; }
    public void setChangeStatus(String changeStatus) { this.changeStatus = changeStatus; }
    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}


