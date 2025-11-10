package com.timeblocks.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_settings")
public class UserSettings {
    @Id
    private Long id;

    @Lob
    @Column(name = "json", columnDefinition = "TEXT")
    private String json;

    public UserSettings() {}

    public UserSettings(Long id, String json) {
        this.id = id;
        this.json = json;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getJson() {
        return json;
    }

    public void setJson(String json) {
        this.json = json;
    }
}


