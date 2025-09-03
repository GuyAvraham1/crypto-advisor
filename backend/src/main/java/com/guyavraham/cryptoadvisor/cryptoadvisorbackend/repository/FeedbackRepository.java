package com.guyavraham.cryptoadvisor.cryptoadvisorbackend.repository;

import com.guyavraham.cryptoadvisor.cryptoadvisorbackend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // Find all feedback by user and section
    List<Feedback> findByUserIdAndSection(Long userId, String section);

    // Find specific article vote by user
    Optional<Feedback> findByUserIdAndSectionAndArticleId(Long userId, String section, String articleId);

    // Get all votes for a specific article (optional - for analytics)
    List<Feedback> findByArticleId(String articleId);

    // Get all feedback by user (optional - for user analytics)
    List<Feedback> findByUserId(Long userId);
}