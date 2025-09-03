import React, { useState } from 'react';
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

  const handleLogin = (userData) => {
    setUser(userData);
    setShowRegistrationSuccess(false); // Hide registration success if showing
    console.log('Logged in:', userData);
  };

  const handleRegister = (userData) => {
    // Don't set user immediately - show success page first
    setShowRegistrationSuccess(true);
    console.log('Registered:', userData);
  };

  const handleLogout = () => {
    setUser(null);
    setShowRegistrationSuccess(false);
    setShowLogin(true);
  };

  const handleOnboardingComplete = (userData) => {
    setUser(userData);
  };

  const handleBackToLogin = () => {
    setShowRegistrationSuccess(false);
    setShowLogin(true);
  };

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