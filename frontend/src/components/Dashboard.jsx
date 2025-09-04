import React, { useState, useEffect } from 'react';
import NewsSection from './NewsSection';
import './Dashboard.css';
import Lottie from 'react-lottie';
import animationData from './loading-animation.json';

function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState({
    prices: [],
    aiInsight: '',
    meme: null,
    loading: true,
    aiLoading: false
  });

  const lottieOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const [sectionVotes, setSectionVotes] = useState({});
  const [votingLoading, setVotingLoading] = useState({});

  // Helper function to get authorization headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Helper function to handle token expiration
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSectionVotes();
  }, []);

  const fetchDashboardData = async () => {
    setDashboardData(prev => ({ ...prev, loading: true }));
    
    try {
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

  const fetchSectionVotes = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/auth/section-votes/${user.userId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      
      if (response.ok) {
        const votes = await response.json();
        setSectionVotes(votes);
      }
    } catch (error) {
      console.error('Error fetching section votes:', error);
    }
  };

  const fetchCryptoPrices = async () => {
    try {
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
      const response = await fetch(`http://localhost:8080/api/auth/ai-insight/${user.userId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        handleUnauthorized();
        return 'Authentication required';
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI insight response:', data);
      
      return data.insight || 'AI insight unavailable';
    } catch (error) {
      console.error('Error fetching AI insight:', error);
      
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
      const response = await fetch('http://localhost:8080/api/auth/crypto-meme', {
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Crypto meme response:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching crypto meme from Reddit:', error);
      
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
    setVotingLoading(prev => ({ ...prev, [section]: true }));

    try {
      const response = await fetch(`http://localhost:8080/api/auth/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: user.userId,
          section,
          vote,
          timestamp: new Date().toISOString()
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        setSectionVotes(prev => ({
          ...prev,
          [section]: vote
        }));
      } else {
        console.error('Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setVotingLoading(prev => ({ ...prev, [section]: false }));
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
      
      setSectionVotes(prev => ({
        ...prev,
        ai: undefined
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
          <Lottie options={lottieOptions} height={150} width={80} />
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
        <NewsSection user={user} />

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
              className={`vote-btn up ${sectionVotes['prices'] === 'up' ? 'voted' : ''}`}
              onClick={() => handleVote('prices', 'up')}
              disabled={votingLoading['prices']}
              title="This section is helpful"
            >
              👍
            </button>
            <button 
              className={`vote-btn down ${sectionVotes['prices'] === 'down' ? 'voted' : ''}`}
              onClick={() => handleVote('prices', 'down')}
              disabled={votingLoading['prices']}
              title="This section needs improvement"
            >
              👎
            </button>
          </div>
        </div>

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
              className={`vote-btn up ${sectionVotes['ai'] === 'up' ? 'voted' : ''}`}
              onClick={() => handleVote('ai', 'up')}
              disabled={dashboardData.aiLoading || votingLoading['ai']}
              title="This insight is valuable"
            >
              👍
            </button>
            <button 
              className={`vote-btn down ${sectionVotes['ai'] === 'down' ? 'voted' : ''}`}
              onClick={() => handleVote('ai', 'down')}
              disabled={dashboardData.aiLoading || votingLoading['ai']}
              title="This insight needs improvement"
            >
              👎
            </button>
          </div>
        </div>

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
              className={`vote-btn up ${sectionVotes['meme'] === 'up' ? 'voted' : ''}`}
              onClick={() => handleVote('meme', 'up')}
              disabled={votingLoading['meme']}
              title="This meme is funny"
            >
              👍
            </button>
            <button 
              className={`vote-btn down ${sectionVotes['meme'] === 'down' ? 'voted' : ''}`}
              onClick={() => handleVote('meme', 'down')}
              disabled={votingLoading['meme']}
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