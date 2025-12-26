import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { lineraAdapter } from '../providers/LineraAdapter';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import useNotification from '../hooks/useNotification';

interface ConnectionState {
  isWalletConnected: boolean;
  isLineraConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  connectionError: string | null;
}

interface ConnectionContextValue extends ConnectionState {
  // 连接方法
  connectToLinera: () => Promise<void>;
  disconnectFromLinera: () => Promise<void>;
  // 连接状态查询
  isConnectedWithWallet: (address: string) => boolean;
  getConnectionStatus: () => 'disconnected' | 'connecting' | 'connected';
  // 查询方法
  queryApplication: (params: { query: string; variables?: Record<string, unknown> }) => Promise<unknown>;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

interface ConnectionProviderProps {
  children: React.ReactNode;
}

const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const { primaryWallet, user } = useDynamicContext();
  const { success, error } = useNotification();
  
  const [state, setState] = useState<ConnectionState>({
    isWalletConnected: false,
    isLineraConnected: false,
    isConnecting: false,
    walletAddress: null,
    connectionError: null,
  });

  const [connectPromise, setConnectPromise] = useState<Promise<void> | null>(null);

  // 统一连接方法
  const connectToLinera = useCallback(async () => {
    if (!primaryWallet?.address) {
      setState(prev => ({ ...prev, connectionError: 'No wallet connected' }));
      return;
    }

    // 如果正在连接中，返回现有Promise
    if (state.isConnecting && connectPromise) {
      return connectPromise;
    }

    // 检查是否已连接
    if (state.isLineraConnected && state.walletAddress === primaryWallet.address) {
      console.log('🔗 Already connected to Linera with current wallet');
      return;
    }

    console.log('🚀 Starting unified Linera connection process...');
    
    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
    }));

    const connectionPromise = (async () => {
      try {
        // 连接钱包
        await lineraAdapter.connect(primaryWallet);
        
        // 设置应用
        if (!lineraAdapter.isApplicationSet()) {
          await lineraAdapter.setApplication();
        }

        setState(prev => ({
          ...prev,
          isWalletConnected: !!primaryWallet?.address,
          isLineraConnected: true,
          isConnecting: false,
          walletAddress: primaryWallet.address,
          connectionError: null,
        }));

        console.log('✅ Successfully connected to Linera network');
        success('Successfully connected to Linera Conway network');
      } catch (err) {
        console.error('❌ Failed to connect to Linera network:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        setState(prev => ({
          ...prev,
          isConnecting: false,
          connectionError: errorMessage,
        }));
        
        error('Failed to connect to Linera Conway network');
      }
    })();

    setConnectPromise(connectionPromise);
    
    try {
      await connectionPromise;
    } finally {
      setConnectPromise(null);
    }
  }, [primaryWallet, state.isConnecting, state.isLineraConnected, state.walletAddress, connectPromise, success, error]);

  // 断开连接方法
  const disconnectFromLinera = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLineraConnected: false,
      walletAddress: null,
      connectionError: null,
    }));
    
    console.log('🔌 Disconnected from Linera network');
  }, []);

  // 监听钱包变化，自动连接
  useEffect(() => {
    const handleWalletChange = async () => {
      if (primaryWallet?.address && user) {
        // 钱包变化时重新连接
        await connectToLinera();
      } else {
        // 钱包断开时清理状态
        await disconnectFromLinera();
      }
    };

    handleWalletChange();
  }, [primaryWallet?.address, user, connectToLinera, disconnectFromLinera]);

  // 定期检查连接状态
  useEffect(() => {
    const checkConnectionStatus = () => {
      if (primaryWallet?.address) {
        const isConnected = lineraAdapter.isConnectedWithWallet(primaryWallet.address);
        setState(prev => ({
          ...prev,
          isLineraConnected: isConnected,
          walletAddress: primaryWallet.address,
        }));
      }
    };

    // 初始检查
    checkConnectionStatus();

    // 定期检查
    const interval = setInterval(checkConnectionStatus, 3000);
    
    return () => clearInterval(interval);
  }, [primaryWallet?.address]);

  // 包装的查询方法
  const isConnectedWithWallet = useCallback((address: string) => {
    return lineraAdapter.isConnectedWithWallet(address);
  }, []);

  const getConnectionStatus = useCallback(() => {
    return lineraAdapter.getConnectionStatus();
  }, []);

  const queryApplication = useCallback((params: { query: string; variables?: Record<string, unknown> }) => {
    return new Promise((resolve, reject) => {
      const executeQuery = async () => {
        try {
          // 确保已连接后再查询
          if (!state.isLineraConnected || !state.walletAddress) {
            console.log('⚠️ Not connected to Linera, attempting to connect first...');
            await connectToLinera();
          }

          // 执行查询
          const result = await lineraAdapter.queryApplication(params);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      executeQuery();
    });
  }, [state.isLineraConnected, state.walletAddress, connectToLinera]);

  const contextValue: ConnectionContextValue = {
    ...state,
    connectToLinera,
    disconnectFromLinera,
    isConnectedWithWallet,
    getConnectionStatus,
    queryApplication,
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionProvider;

