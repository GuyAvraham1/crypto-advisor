import React from 'react';
import './RegistrationSuccess.css';

function RegistrationSuccess({ onBackToLogin }) {
  return (
    <div className="registration-success-container">
      <div className="success-card">
        <div className="success-icon">
          ✓
        </div>
        <h2>Registration Successful!</h2>
        <p>
          Your account has been created successfully. 
          Please log in to continue and complete your personalization.
        </p>
        <button 
          className="login-button"
          onClick={onBackToLogin}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

export default RegistrationSuccess;