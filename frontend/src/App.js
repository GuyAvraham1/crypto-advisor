import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import RegistrationSuccess from './components/RegistrationSuccess';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing token on app startup
  useEffect(() => {
    const checkAuthToken = () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setShowLogin(false);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuthToken();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setShowRegistrationSuccess(false);
    setShowLogin(false);
    console.log('Logged in:', userData);
  };

  const handleRegister = (userData) => {
    setShowRegistrationSuccess(true);
    console.log('Registered:', userData);
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setUser(null);
    setShowRegistrationSuccess(false);
    setShowLogin(true);
  };

  const handleOnboardingComplete = (userData) => {
    // Update localStorage with new user data
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleBackToLogin = () => {
    setShowRegistrationSuccess(false);
    setShowLogin(true);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Show registration success page
  if (showRegistrationSuccess) {
    return (
      <div className="App">
        <RegistrationSuccess onBackToLogin={handleBackToLogin} />
      </div>
    );
  }

  // Show onboarding if user logged in but hasn't completed onboarding
  if (user && !user.onboardingCompleted) {
    return (
      <div className="App">
        <Onboarding user={user} onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // If user is logged in and completed onboarding, show dashboard
  if (user) {
    return (
      <div className="App">
        <Dashboard user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // Show login or register
  return (
    <div className="App">
      {showLogin ? (
        <Login 
          onLogin={handleLogin}
          switchToRegister={() => setShowLogin(false)}
        />
      ) : (
        <Register 
          onRegister={handleRegister}
          switchToLogin={() => setShowLogin(true)}
        />
      )}
    </div>
  );
}

export default App;