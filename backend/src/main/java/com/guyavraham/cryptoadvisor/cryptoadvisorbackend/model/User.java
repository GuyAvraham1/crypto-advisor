package com.guyavraham.cryptoadvisor.cryptoadvisorbackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    // User preferences from onboarding
    @ElementCollection
    @CollectionTable(name = "user_crypto_interests",
                    joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "crypto_asset")
    private Set<String> cryptoInterests;

    @Column(name = "investor_type")
    private String investorType; // HODLer, Day Trader, NFT Collector

    @ElementCollection
    @CollectionTable(name = "user_content_preferences",
                    joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "content_type")
    private Set<String> contentPreferences; // Market News, Charts, Social, Fun

    @Column(name = "onboarding_completed")
    private Boolean onboardingCompleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public User() {}

    public User(String email, String name, String password) {
        this.email = email;
        this.name = name;
        this.password = password;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Set<String> getCryptoInterests() { return cryptoInterests; }
    public void setCryptoInterests(Set<String> cryptoInterests) {
        this.cryptoInterests = cryptoInterests;
    }

    public String getInvestorType() { return investorType; }
    public void setInvestorType(String investorType) {
        this.investorType = investorType;
    }

    public Set<String> getContentPreferences() { return contentPreferences; }
    public void setContentPreferences(Set<String> contentPreferences) {
        this.contentPreferences = contentPreferences;
    }

    public Boolean getOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(Boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}