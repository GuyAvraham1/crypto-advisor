package com.guyavraham.cryptoadvisor.cryptoadvisorbackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String section;

    @Column(nullable = false)
    private String vote;

    @Column(name = "article_id")
    private String articleId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public Feedback() {}

    public Feedback(Long userId, String section, String vote) {
        this.userId = userId;
        this.section = section;
        this.vote = vote;
    }

    public Feedback(Long userId, String section, String vote, String articleId) {
        this.userId = userId;
        this.section = section;
        this.vote = vote;
        this.articleId = articleId;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getVote() { return vote; }
    public void setVote(String vote) { this.vote = vote; }

    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}