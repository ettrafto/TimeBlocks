package com.timeblocks.model;

import jakarta.persistence.*;

@Entity @Table(name="event_occurrences")
public class EventOccurrence {
    @Id private String id;
    @Column(name="event_id", nullable=false) private String eventId;
    @Column(name="start_utc", nullable=false) private String startUtc;
    @Column(name="end_utc", nullable=false) private String endUtc;
    private String tzid;
    private String status;
    @Column(name="is_exception") private Integer isException = 0;
    @Column(name="payload_jsonb") private String payloadJsonb;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getStartUtc() { return startUtc; }
    public void setStartUtc(String startUtc) { this.startUtc = startUtc; }

    public String getEndUtc() { return endUtc; }
    public void setEndUtc(String endUtc) { this.endUtc = endUtc; }

    public String getTzid() { return tzid; }
    public void setTzid(String tzid) { this.tzid = tzid; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getIsException() { return isException; }
    public void setIsException(Integer isException) { this.isException = isException; }

    public String getPayloadJsonb() { return payloadJsonb; }
    public void setPayloadJsonb(String payloadJsonb) { this.payloadJsonb = payloadJsonb; }
}

