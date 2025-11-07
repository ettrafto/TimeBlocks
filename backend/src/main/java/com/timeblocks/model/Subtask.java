package com.timeblocks.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "subtasks")
public class Subtask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "task_id", nullable = false)
    @JsonAlias({"task_id", "taskId"})
    private Integer taskId;
    
    @Column(nullable = false)
    private String title;
    
    @Column(nullable = false)
    private Integer done = 0;
    
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;
    
    // Getters and Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public Integer getTaskId() {
        return taskId;
    }
    
    public void setTaskId(Integer taskId) {
        this.taskId = taskId;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public Integer getDone() {
        return done;
    }
    
    public void setDone(Integer done) {
        this.done = done;
    }
    
    @JsonIgnore
    public Boolean isDone() {
        return done != null && done == 1;
    }
    
    @JsonIgnore
    public void setDone(Boolean done) {
        this.done = done != null && done ? 1 : 0;
    }
    
    public Integer getOrderIndex() {
        return orderIndex;
    }
    
    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }
}


