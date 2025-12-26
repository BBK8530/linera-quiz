import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2 className="loading-text">Connecting to Linera network...</h2>
      </div>
    </div>
  );
};

export default LoadingScreen;
