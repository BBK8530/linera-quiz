import React, { useEffect, useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useConnection } from '../contexts/ConnectionContext';
// import { useNotifications } from '../contexts/NotificationContext'; // 移除旧的导入
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
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { 
    isLineraConnected, 
    isConnecting, 
    disconnectFromLinera 
  } = useConnection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { info } = useNotification();

  // 稳定onNicknameSet函数引用
  const handleNicknameSet = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 监听钱包地址变化，显示连接状态信息
  useEffect(() => {
    if (!primaryWallet?.address) {
      info('Please connect your wallet first');
    }
  }, [primaryWallet?.address, info]);

  // Handle logout
  const handleLogout = async () => {
    console.log('🔄 User logging out, disconnecting from Linera');
    await disconnectFromLinera();
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
        <div className="connection-status">
          Conway:{' '}
          {isLineraConnected ? (
            <FaCheckCircle className="connected-icon" />
          ) : isConnecting ? (
            <FaCircleNotch className="connecting-icon spin" />
          ) : (
            <FaTimesCircle className="disconnected-icon" />
          )}
        </div>
      </div>
      <button
        className="settings-icon-button"
        onClick={() => setIsModalOpen(true)}
        title="设置昵称"
      >
        <FaCog size={16} />
      </button>
      <button
        className="logout-icon-button"
        onClick={handleLogout}
        title="登出"
      >
        <FaSignOutAlt size={16} />
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
