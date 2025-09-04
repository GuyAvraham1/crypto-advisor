import React, { useState, useEffect } from 'react';
import './NewsSection.css';

function NewsSection({ user }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({}); // Store user's votes for each article
  const [votingLoading, setVotingLoading] = useState({});

  useEffect(() => {
    fetchNews();
    fetchUserVotes();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch('https://backend-production-3f95.up.railway.app/api/auth/crypto-news');
      if (response.ok) {
        const data = await response.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const response = await fetch(`https://backend-production-3f95.up.railway.app/api/auth/article-feedback/${user.userId}`);
      if (response.ok) {
        const votes = await response.json();
        setUserVotes(votes);
      }
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const handleVote = async (articleId, voteType) => {
    setVotingLoading(prev => ({ ...prev, [articleId]: true }));

    try {
      const response = await fetch('https://backend-production-3f95.up.railway.app/api/auth/article-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          articleId: articleId,
          vote: voteType
        }),
      });

      if (response.ok) {
        // Update local state
        setUserVotes(prev => ({
          ...prev,
          [articleId]: voteType
        }));
      } else {
        console.error('Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setVotingLoading(prev => ({ ...prev, [articleId]: false }));
    }
  };

  const formatTimeAgo = (timeString) => {
    // If it's already formatted (like "2 hours ago"), return as is
    if (timeString.includes('ago') || timeString.includes('hour') || timeString.includes('minute')) {
      return timeString;
    }
    
    // Otherwise, try to parse and format the timestamp
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="news-section">
        <div className="section-header">
          <span className="section-icon">📰</span>
          <h2>Market News</h2>
        </div>
        <div className="loading">Loading news...</div>
      </div>
    );
  }

  return (
    <div className="news-section">
      <div className="section-header">
        <span className="section-icon">📰</span>
        <h2>Market News</h2>
      </div>
      
      <div className="news-list">
        {news.map((article) => (
          <div key={article.id} className="news-item">
            <div className="news-content">
              <h3 className="news-title">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h3>
              <div className="news-meta">
                <span className="news-time">{formatTimeAgo(article.time)}</span>
                <span className="news-source">• {article.source}</span>
              </div>
            </div>
            
            <div className="news-voting">
              <button
                className={`vote-btn ${userVotes[article.id] === 'up' ? 'voted up' : ''}`}
                onClick={() => handleVote(article.id, 'up')}
                disabled={votingLoading[article.id]}
                title="Like this article"
              >
                👍
              </button>
              
              <button
                className={`vote-btn ${userVotes[article.id] === 'down' ? 'voted down' : ''}`}
                onClick={() => handleVote(article.id, 'down')}
                disabled={votingLoading[article.id]}
                title="Dislike this article"
              >
                👎
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NewsSection;