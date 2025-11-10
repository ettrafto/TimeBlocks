package com.timeblocks.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "type_id", nullable = false)
    @JsonAlias({"type_id", "typeId"})
    private Integer typeId;
    
    @Column(nullable = false)
    private String title;
    
    private String description;
    
    @Column(nullable = false)
    private String status = "todo";

    @Column(name = "attached_date")
    @JsonAlias({"attached_date", "attachedDate"})
    private LocalDate attachedDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public Integer getTypeId() {
        return typeId;
    }
    
    public void setTypeId(Integer typeId) {
        this.typeId = typeId;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDate getAttachedDate() {
        return attachedDate;
    }

    public void setAttachedDate(LocalDate attachedDate) {
        this.attachedDate = attachedDate;
    }
}


