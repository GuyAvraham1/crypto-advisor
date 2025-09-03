import React, { useState, useEffect } from 'react';
import NewsSection from './NewsSection';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState({
    prices: [],
    aiInsight: '',
    meme: null,
    loading: true,
    aiLoading: false
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setDashboardData(prev => ({ ...prev, loading: true }));
    
    try {
      // Fetch all data in parallel (excluding news since it's now handled by NewsSection)
      const [pricesData, aiData, memeData] = await Promise.allSettled([
        fetchCryptoPrices(),
        fetchAIInsight(),
        fetchCryptoMeme()
      ]);

      setDashboardData({
        prices: pricesData.status === 'fulfilled' ? pricesData.value : [],
        aiInsight: aiData.status === 'fulfilled' ? aiData.value : 'AI insight unavailable',
        meme: memeData.status === 'fulfilled' ? memeData.value : null,
        loading: false,
        aiLoading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false, aiLoading: false }));
    }
  };

  const fetchCryptoPrices = async () => {
    try {
      // Using CoinGecko API - enhanced with user preferences if available
      const coins = user.cryptoInterests && user.cryptoInterests.length > 0 
        ? user.cryptoInterests.join(',').toLowerCase()
        : 'bitcoin,ethereum,cardano,solana';
      
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins}&vs_currencies=usd&include_24hr_change=true`);
      const data = await response.json();
      
      return Object.entries(data).map(([coin, info]) => ({
        name: coin.charAt(0).toUpperCase() + coin.slice(1),
        price: `$${info.usd.toLocaleString()}`,
        change: info.usd_24h_change.toFixed(2)
      }));
    } catch (error) {
      return [
        { name: 'Bitcoin', price: '$43,250', change: '2.5' },
        { name: 'Ethereum', price: '$2,680', change: '1.8' },
        { name: 'Cardano', price: '$0.52', change: '-0.9' },
        { name: 'Solana', price: '$95.40', change: '4.2' }
      ];
    }
  };

  const fetchAIInsight = async () => {
    try {
      console.log('Fetching AI insight from backend...');
      const response = await fetch(`http://localhost:8080/api/auth/ai-insight/${user.userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI insight response:', data);
      
      return data.insight || 'AI insight unavailable';
    } catch (error) {
      console.error('Error fetching AI insight:', error);
      
      // Enhanced fallback based on user type
      const fallbackInsights = {
        'hodler': [
          "Long-term holding strategies are showing positive trends with increased institutional adoption.",
          "DCA (Dollar Cost Averaging) remains the most effective strategy for HODLers during market volatility.",
          "Staking rewards are providing additional yield opportunities for long-term holders."
        ],
        'day trader': [
          "High volatility periods present both opportunities and risks for day trading strategies.",
          "Technical analysis indicators suggest key support and resistance levels to watch.",
          "Volume patterns indicate potential breakout opportunities in the next 24-48 hours."
        ],
        'nft collector': [
          "NFT marketplace activity is showing signs of consolidation with quality projects gaining traction.",
          "Utility-based NFTs are outperforming profile picture collections in recent weeks.",
          "New blockchain ecosystems are launching innovative NFT use cases."
        ]
      };
      
      const userType = user.investorType?.toLowerCase() || 'hodler';
      const relevantInsights = fallbackInsights[userType] || fallbackInsights['hodler'];
      return relevantInsights[Math.floor(Math.random() * relevantInsights.length)];
    }
  };

  const fetchCryptoMeme = async () => {
    try {
      console.log('Fetching crypto meme from backend (Reddit)...');
      const response = await fetch('http://localhost:8080/api/auth/crypto-meme');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Crypto meme response:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching crypto meme from Reddit:', error);
      
      // Fallback to static memes if Reddit API fails
      const fallbackMemes = [
        {
          url: "https://i.imgflip.com/2/1bij.jpg",
          title: "HODL Strong",
          alt: "Crypto HODL meme",
          source: "Static",
          author: "System",
          score: 100
        },
        {
          url: "https://i.imgflip.com/2/30b1gx.jpg", 
          title: "Bitcoin Price Goes Brrr",
          alt: "Bitcoin price meme",
          source: "Static",
          author: "System",
          score: 150
        },
        {
          url: "https://i.imgflip.com/2/1ur9b0.jpg",
          title: "Crypto Trading Life",
          alt: "Crypto trading meme",
          source: "Static",
          author: "System",
          score: 200
        }
      ];
      
      return fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
    }
  };

  const handleVote = async (section, vote) => {
    try {
      await fetch(`http://localhost:8080/api/auth/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          section,
          vote,
          timestamp: new Date().toISOString()
        })
      });
      
      // Enhanced feedback with better UX
      const button = document.querySelector(`#${section}-${vote}`);
      const originalText = button.innerHTML;
      button.innerHTML = vote === 'up' ? '👍 Thanks!' : '👎 Noted!';
      button.disabled = true;
      button.style.opacity = '0.6';
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        button.style.opacity = '1';
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Show error feedback to user
      const button = document.querySelector(`#${section}-${vote}`);
      const originalText = button.innerHTML;
      button.innerHTML = '❌ Error';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    }
  };

  const refreshAIInsight = async () => {
    setDashboardData(prev => ({ ...prev, aiLoading: true }));
    
    try {
      const newInsight = await fetchAIInsight();
      setDashboardData(prev => ({ 
        ...prev, 
        aiInsight: newInsight, 
        aiLoading: false 
      }));
    } catch (error) {
      console.error('Error refreshing AI insight:', error);
      setDashboardData(prev => ({ ...prev, aiLoading: false }));
    }
  };

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading your personalized dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Your Crypto Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.name}</span>
          {user.investorType && <span className="user-type">({user.investorType})</span>}
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* New NewsSection Component with individual article voting */}
        <NewsSection user={user} />

        {/* Enhanced Coin Prices Section */}
        <div className="dashboard-card">
          <h2>💰 Coin Prices</h2>
          <div className="prices-list">
            {dashboardData.prices.map(coin => (
              <div key={coin.name} className="price-item">
                <span className="coin-name">{coin.name}</span>
                <div className="price-data">
                  <span className="coin-price">{coin.price}</span>
                  <span className={`coin-change ${parseFloat(coin.change) >= 0 ? 'positive' : 'negative'}`}>
                    {parseFloat(coin.change) >= 0 ? '↗️ +' : '↘️ '}{coin.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="vote-buttons">
            <button 
              id="prices-up"
              onClick={() => handleVote('prices', 'up')}
              className="vote-btn up"
              title="This section is helpful"
            >
              👍
            </button>
            <button 
              id="prices-down"
              onClick={() => handleVote('prices', 'down')}
              className="vote-btn down"
              title="This section needs improvement"
            >
              👎
            </button>
          </div>
        </div>

        {/* Enhanced AI Insight Section */}
        <div className="dashboard-card">
          <h2>🤖 AI Insight of the Day</h2>
          {dashboardData.aiLoading ? (
            <div className="ai-loading">
              <div className="loading-spinner"></div>
              <p>Generating personalized AI insight...</p>
            </div>
          ) : (
            <>
              <p className="ai-insight">{dashboardData.aiInsight}</p>
              <div className="insight-meta">
                <small>Personalized for {user.investorType || 'your profile'}</small>
                <button 
                  onClick={refreshAIInsight} 
                  className="refresh-insight-btn"
                  disabled={dashboardData.aiLoading}
                  title="Generate new AI insight"
                >
                  {dashboardData.aiLoading ? '⏳' : '🔄'} New Insight
                </button>
              </div>
            </>
          )}
          <div className="vote-buttons">
            <button 
              id="ai-up"
              onClick={() => handleVote('ai', 'up')}
              className="vote-btn up"
              title="This insight is valuable"
              disabled={dashboardData.aiLoading}
            >
              👍
            </button>
            <button 
              id="ai-down"
              onClick={() => handleVote('ai', 'down')}
              className="vote-btn down"
              title="This insight needs improvement"
              disabled={dashboardData.aiLoading}
            >
              👎
            </button>
          </div>
        </div>

        {/* Enhanced Fun Crypto Meme Section */}
        <div className="dashboard-card">
          <h2>😂 Fun Crypto Meme</h2>
          {dashboardData.meme ? (
            <div className="meme-container">
              <div className="meme-header">
                {dashboardData.meme.title && (
                  <h4 className="meme-title">{dashboardData.meme.title}</h4>
                )}
                <div className="meme-meta">
                  {dashboardData.meme.source && (
                    <span className="meme-source">📍 {dashboardData.meme.source}</span>
                  )}
                  {dashboardData.meme.score && (
                    <span className="meme-score">👍 {dashboardData.meme.score}</span>
                  )}
                </div>
              </div>
              <img 
                src={dashboardData.meme.url} 
                alt={dashboardData.meme.alt || dashboardData.meme.title}
                className="crypto-meme"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/300x200?text=Meme+Not+Available";
                }}
              />
              {dashboardData.meme.reddit_url && (
                <div className="meme-footer">
                  <a 
                    href={dashboardData.meme.reddit_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="reddit-link"
                  >
                    💬 View on Reddit
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">No meme available right now 😔</div>
          )}
          <div className="vote-buttons">
            <button 
              id="meme-up"
              onClick={() => handleVote('meme', 'up')}
              className="vote-btn up"
              title="This meme is funny"
            >
              👍
            </button>
            <button 
              id="meme-down"
              onClick={() => handleVote('meme', 'down')}
              className="vote-btn down"
              title="This meme needs improvement"
            >
              👎
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={fetchDashboardData} className="refresh-btn">
          🔄 Refresh Dashboard
        </button>
        <div className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;