import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { lineraAdapter } from '../providers/LineraAdapter';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import useNotification from '../hooks/useNotification';

interface Block {
  height: number;
  hash: string;
  event_stream: unknown;
}

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
  queryApplication: (params: {
    query: string;
    variables?: Record<string, unknown>;
  }) => Promise<unknown>;
  // 数据刷新回调
  onNewBlock: (callback: () => void) => void;
  offNewBlock: (callback?: () => void) => void;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(
  undefined,
);

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

const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
  children,
}) => {
  const { primaryWallet, user } = useDynamicContext();
  const { success, error } = useNotification();

  const [state, setState] = useState<ConnectionState>({
    isWalletConnected: false,
    isLineraConnected: false,
    isConnecting: false,
    walletAddress: null,
    connectionError: null,
  });

  // 用于存储Linera provider引用
  const providerRef = useRef<any>(null);
  // 存储新区块事件的回调函数
  const newBlockCallbacks = useRef<Array<() => void>>([]);
  // 存储上次处理的区块高度
  const lastBlockHeight = useRef<number | null>(null);
  // 存储上次处理区块的时间戳
  const lastBlockProcessTime = useRef<number | null>(null);

  // 统一连接方法
  const connectToLinera = useCallback(async () => {
    const walletAddress = primaryWallet?.address;
    if (!walletAddress) {
      setState(prev => ({ ...prev, connectionError: 'No wallet connected' }));
      return;
    }

    // 使用LineraAdapter直接检查连接状态，避免依赖组件内部状态
    const isAlreadyConnected =
      lineraAdapter.isConnectedWithWallet(walletAddress);
    if (isAlreadyConnected) {
      // 更新内部状态以确保同步
      setState(prev => ({
        ...prev,
        isLineraConnected: true,
        walletAddress: walletAddress,
        connectionError: null,
      }));
      return;
    }

    // 直接使用LineraAdapter的连接状态检查，避免使用组件内部状态
    const connectionStatus = lineraAdapter.getConnectionStatus();
    if (connectionStatus === 'connecting') {
      // 这里可以选择等待连接完成，或者直接返回
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
    }));

    try {
      // 连接钱包
      if (!primaryWallet) {
        throw new Error('Primary wallet not available');
      }
      await lineraAdapter.connect(primaryWallet);

      // 设置应用
      if (!lineraAdapter.isApplicationSet()) {
        await lineraAdapter.setApplication();
      }

      setState(prev => ({
        ...prev,
        isWalletConnected: !!walletAddress,
        isLineraConnected: true,
        isConnecting: false,
        walletAddress: walletAddress,
        connectionError: null,
      }));

      // 设置providerRef引用
      try {
        providerRef.current = lineraAdapter.getProvider();
      } catch (getProviderError) {
        // Provider ref获取失败，忽略警告
      }

      success('Successfully connected to Linera Conway network');
    } catch (err) {
      // 连接失败，已通过状态和通知处理
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isConnecting: false,
        connectionError: errorMessage,
      }));

      error('Failed to connect to Linera Conway network');
    }
  }, [primaryWallet?.address, primaryWallet, success, error]);

  // 断开连接方法
  const disconnectFromLinera = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLineraConnected: false,
      walletAddress: null,
      connectionError: null,
    }));
  }, []);

  // 统一的钱包状态管理
  useEffect(() => {
    const handleWalletChange = async () => {
      if (primaryWallet?.address && user) {
        // 钱包连接时自动连接Linera
        await connectToLinera();
      } else {
        // 钱包断开时清理状态
        await disconnectFromLinera();
      }
    };

    handleWalletChange();
  }, [primaryWallet?.address, user, connectToLinera, disconnectFromLinera]);

  // 定期检查连接状态 - 只在状态不一致时更新，避免频繁更新
  useEffect(() => {
    const checkConnectionStatus = () => {
      if (primaryWallet?.address) {
        const isConnected = lineraAdapter.isConnectedWithWallet(
          primaryWallet.address,
        );
        const connectionStatus = lineraAdapter.getConnectionStatus();

        // 只有当状态发生变化时才更新，避免频繁触发重渲染
        setState(prev => {
          if (
            prev.isLineraConnected !== isConnected ||
            prev.isConnecting !== (connectionStatus === 'connecting')
          ) {
            return {
              ...prev,
              isLineraConnected: isConnected,
              isConnecting: connectionStatus === 'connecting',
              walletAddress: primaryWallet.address,
            };
          }
          return prev; // 状态未变化，不更新
        });
      } else {
        // 当没有钱包地址时，只在需要时重置连接状态
        setState(prev => {
          if (prev.isWalletConnected || prev.isLineraConnected) {
            return {
              ...prev,
              isWalletConnected: false,
              isLineraConnected: false,
              isConnecting: false,
              walletAddress: null,
            };
          }
          return prev; // 状态未变化，不更新
        });
      }
    };

    // 初始检查
    checkConnectionStatus();

    // 减少检查频率，避免频繁状态更新
    const interval = setInterval(checkConnectionStatus, 5000); // 改为5秒检查一次

    return () => clearInterval(interval);
  }, [primaryWallet?.address]);

  // 监听Linera连接状态，设置新区块通知监听器
  useEffect(() => {
    // 只有当Linera已连接时才设置监听器
    if (!state.isLineraConnected || !providerRef.current?.client) {
      return;
    }

    const client = providerRef.current.client;
    if (!client) return;

    // 定义通知处理函数
    const handleNotification = (notification: unknown) => {
      const newBlock = (notification as { reason: { NewBlock: Block } })?.reason
        ?.NewBlock;
      if (newBlock) {
        // 使用收到区块的时间作为时间戳
        const receiveTime = Date.now();

        // 计算与上次处理区块的时间差
        const timeDiff = lastBlockProcessTime.current
          ? Math.abs(receiveTime - lastBlockProcessTime.current)
          : Infinity;

        // 只有当时间差大于100毫秒时才处理，或者是第一个区块
        if (timeDiff > 100 || lastBlockProcessTime.current === null) {
          // 更新上次处理的区块高度和时间戳
          lastBlockHeight.current = newBlock.height;
          lastBlockProcessTime.current = receiveTime;

          // 调用所有注册的新区块事件回调函数
          newBlockCallbacks.current.forEach(callback => {
            try {
              callback();
            } catch (err) {
              // 忽略回调执行错误
            }
          });
        } else {
          // 100毫秒内收到的区块，跳过处理
        }
      }
    };

    // 设置监听器
    client.onNotification(handleNotification);

    // 清理函数
    return () => {
      client.offNotification?.(handleNotification) ||
        client.onNotification(() => {});
    };
  }, [state.isLineraConnected]);

  // 包装的查询方法
  const isConnectedWithWallet = useCallback((address: string) => {
    return lineraAdapter.isConnectedWithWallet(address);
  }, []);

  const getConnectionStatus = useCallback(() => {
    return lineraAdapter.getConnectionStatus();
  }, []);

  // 注册新区块事件回调
  const onNewBlock = useCallback((callback: () => void) => {
    newBlockCallbacks.current.push(callback);
  }, []);

  // 注销新区块事件回调
  const offNewBlock = useCallback((callback?: () => void) => {
    if (callback) {
      newBlockCallbacks.current = newBlockCallbacks.current.filter(
        cb => cb !== callback,
      );
    } else {
      newBlockCallbacks.current = [];
    }
  }, []);

  const queryApplication = useCallback(
    async (
      params: { query: string; variables?: Record<string, unknown> },
      retryCount: number = 0,
    ) => {
      try {
        // 确保钱包已连接
        const walletAddress = primaryWallet?.address;
        if (!walletAddress) {
          throw new Error('No wallet connected');
        }

        // 确保已连接到Linera
        const isConnected = lineraAdapter.isConnectedWithWallet(walletAddress);
        if (!isConnected) {
          // 检查是否正在连接中
          const connectionStatus = lineraAdapter.getConnectionStatus();
          if (connectionStatus === 'connecting') {
            // 等待连接完成，最长等待5秒
            const MAX_WAIT_TIME = 5000;
            const WAIT_INTERVAL = 500;
            let waitTime = 0;

            while (waitTime < MAX_WAIT_TIME) {
              await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));
              if (lineraAdapter.isConnectedWithWallet(walletAddress)) {
                break;
              }
              waitTime += WAIT_INTERVAL;
            }

            if (!lineraAdapter.isConnectedWithWallet(walletAddress)) {
              throw new Error('Connection timeout');
            }
          } else {
            await connectToLinera();
          }
        }

        // 确保应用已设置
        if (!lineraAdapter.isApplicationSet()) {
          await lineraAdapter.setApplication();
        }

        // 执行查询
        const result = await lineraAdapter.queryApplication(params);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';

        // 针对连接相关错误，进行有限次数的重试
        if (
          (errorMessage.includes('Connection') ||
            errorMessage.includes('connection')) &&
          retryCount < 2
        ) {
          // 等待一段时间后重试
          await new Promise(resolve =>
            setTimeout(resolve, 1000 * (retryCount + 1)),
          );
          return queryApplication(params, retryCount + 1);
        }

        throw err;
      }
    },
    [primaryWallet?.address, connectToLinera],
  );

  const contextValue: ConnectionContextValue = {
    ...state,
    connectToLinera,
    disconnectFromLinera,
    isConnectedWithWallet,
    getConnectionStatus,
    queryApplication,
    onNewBlock,
    offNewBlock,
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionProvider;
