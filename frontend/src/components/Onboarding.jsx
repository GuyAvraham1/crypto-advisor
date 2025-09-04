import React, { useState } from 'react';
import './Onboarding.css';

function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    cryptoInterests: [],
    investorType: '',
    contentPreferences: []
  });
  const [loading, setLoading] = useState(false);

  const cryptoOptions = ['Bitcoin', 'Ethereum', 'Cardano', 'Solana', 'Polygon', 'Chainlink', 'Dogecoin', 'Shiba Inu'];
  const investorTypes = ['HODLer', 'Day Trader', 'NFT Collector', 'DeFi Enthusiast'];
  const contentTypes = ['Market News', 'Charts', 'Social', 'Fun'];

  const handleArrayChange = (value, field) => {
    const current = formData[field];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    
    setFormData({ ...formData, [field]: updated });
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
        const response = await fetch(`http://localhost:8080/api/auth/onboarding/${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onComplete({ ...user, onboardingCompleted: true });
      } else {
        alert('Failed to save preferences');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>
        
        <h2>Welcome, {user.name}!</h2>
        <p>Let's personalize your crypto experience</p>

        {step === 1 && (
          <div className="step">
            <h3>What crypto assets interest you?</h3>
            <div className="options-grid">
              {console.log('cryptoOptions:', cryptoOptions)}
              {cryptoOptions.map(crypto => {
                console.log('Rendering crypto:', crypto);
                return (
                  <button
                    key={crypto}
                    className={`option ${formData.cryptoInterests.includes(crypto) ? 'selected' : ''}`}
                    onClick={() => handleArrayChange(crypto, 'cryptoInterests')}
                  >
                    {crypto}
                  </button>
                );
              })}
            </div>
            <button 
              className="next-btn"
              onClick={() => setStep(2)}
              disabled={formData.cryptoInterests.length === 0}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <h3>What type of investor are you?</h3>
            <div className="options-list">
              {investorTypes.map(type => (
                <button
                  key={type}
                  className={`option ${formData.investorType === type ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, investorType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="nav-buttons">
              <button className="back-btn" onClick={() => setStep(1)}>Back</button>
              <button 
                className="next-btn"
                onClick={() => setStep(3)}
                disabled={!formData.investorType}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <h3>What content would you like to see?</h3>
            <div className="options-list">
              {contentTypes.map(content => (
                <button
                  key={content}
                  className={`option ${formData.contentPreferences.includes(content) ? 'selected' : ''}`}
                  onClick={() => handleArrayChange(content, 'contentPreferences')}
                >
                  {content}
                </button>
              ))}
            </div>
            <div className="nav-buttons">
              <button className="back-btn" onClick={() => setStep(2)}>Back</button>
              <button 
                className="finish-btn"
                onClick={handleSubmit}
                disabled={formData.contentPreferences.length === 0 || loading}
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;