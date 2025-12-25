import React, { useEffect, useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { lineraAdapter } from '../providers/LineraAdapter';
import {
  FaSignOutAlt,
  FaCog,
  FaCheckCircle,
  FaCircleNotch,
  FaTimesCircle,
} from 'react-icons/fa';
import useNotification from '../hooks/useNotification';
import NicknameSetting from './NicknameSetting';

const UserInfo: React.FC = () => {
  const { user, primaryWallet, handleLogOut } = useDynamicContext();
  const [isLineraConnected, setIsLineraConnected] = useState(false);
  const [isConnectingLinera, setIsConnectingLinera] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { success, error, info } = useNotification();

  // 稳定onNicknameSet函数引用
  const handleNicknameSet = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 当primaryWallet变化时，自动连接到Linera网络
  useEffect(() => {
    const connectToLinera = async () => {
      if (!primaryWallet || isLineraConnected || isConnectingLinera) return;

      setIsConnectingLinera(true);
      try {
        await lineraAdapter.connect(primaryWallet);
        await lineraAdapter.setApplication();
        setIsLineraConnected(true);
        console.log('✅ Successfully connected to Linera network');
        success('Successfully connected to Linera Conway network');
      } catch (err) {
        console.error('❌ Failed to connect to Linera network:', err);
        setIsLineraConnected(false);
        error('Failed to connect to Linera Conway network');
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
  }, [
    primaryWallet,
    user,
    isLineraConnected,
    isConnectingLinera,
    success,
    error,
  ]);

  // Handle logout
  const handleLogout = async () => {
    lineraAdapter.reset();
    await handleLogOut();
    info('Logged out successfully');
  };

  return (
    <div className="user-section">
      <div className="user-info">
        <div className="address-container">
          <span className="address-text">
            {primaryWallet?.address.substring(2, 10)}
          </span>
        </div>
        <p>
          Conway:{' '}
          {isLineraConnected ? (
            <FaCheckCircle className="connected-icon" />
          ) : isConnectingLinera ? (
            <FaCircleNotch className="connecting-icon spin" />
          ) : (
            <FaTimesCircle className="disconnected-icon" />
          )}
        </p>
      </div>
      <button
        className="settings-icon-button"
        onClick={() => setIsModalOpen(true)}
        title="设置昵称"
      >
        <FaCog size={20} />
      </button>
      <button
        className="logout-icon-button"
        onClick={handleLogout}
        title="登出"
      >
        <FaSignOutAlt size={20} />
      </button>

      {/* 昵称设置模态框 */}
      <div
        className={`modal-overlay ${isModalOpen ? 'visible' : ''}`}
        onClick={e => {
          // 只在点击遮罩层本身时关闭弹窗
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
          }
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">设置昵称</h3>
            <button
              className="modal-close-button"
              onClick={() => setIsModalOpen(false)}
              title="关闭"
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            <NicknameSetting onNicknameSet={handleNicknameSet} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
