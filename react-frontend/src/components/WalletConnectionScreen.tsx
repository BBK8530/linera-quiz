import React from 'react';
import LoginButton from './LoginButton';

const WalletConnectionScreen: React.FC = () => {
  return (
    <div className="wallet-connection-screen">
      <div className="connection-content">
        <h1 className="project-name">Quiz Challenge</h1>
        <p className="connection-instruction">
          Connect your wallet to get started
        </p>
        <div className="login-button-container">
          <LoginButton />
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionScreen;
