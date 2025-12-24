import React, { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../graphql/quizQueries';
import { lineraAdapter } from '../providers/LineraAdapter';

const LoginButton: React.FC = () => {
  const { user, primaryWallet, setShowAuthFlow, handleLogOut, showAuthFlow } = useDynamicContext();
  const { data } = useQuery(GET_USER);
  const [isLineraConnected, setIsLineraConnected] = useState(false);
  const [isConnectingLinera, setIsConnectingLinera] = useState(false);

  // 当primaryWallet变化时，自动连接到Linera网络
  useEffect(() => {
    const connectToLinera = async () => {
      if (!primaryWallet) return;

      setIsConnectingLinera(true);
      try {
        await lineraAdapter.connect(primaryWallet);
        await lineraAdapter.setApplication();
        setIsLineraConnected(true);
        console.log('✅ Successfully connected to Linera network');
      } catch (error) {
        console.error('❌ Failed to connect to Linera network:', error);
        setIsLineraConnected(false);
      } finally {
        setIsConnectingLinera(false);
      }
    };

    if (primaryWallet && user) {
      connectToLinera();
    } else {
      // 当钱包断开连接时，重置Linera连接
      lineraAdapter.reset();
      setIsLineraConnected(false);
    }
  }, [primaryWallet]);

  if (showAuthFlow) {
    return <button className="login-button">Loading...</button>;
  }

  if (user && primaryWallet) {
    return (
      <div className="user-section">
        <div className="user-info">
          <p>已连接: {primaryWallet.address.substring(0, 10)}...</p>
          <p>Linera: {isLineraConnected ? '✅ 已连接' : isConnectingLinera ? '🔄 连接中...' : '❌ 未连接'}</p>
          {data && data.user && (
            <p>昵称: {data.user.nickname}</p>
          )}
        </div>
        <button className="login-button logout" onClick={async () => {
          lineraAdapter.reset();
          await handleLogOut();
        }}>
          登出
        </button>
      </div>
    );
  }

  return (
    <button className="login-button" onClick={() => setShowAuthFlow(true)}>
      连接钱包
    </button>
  );
};

export default LoginButton;
