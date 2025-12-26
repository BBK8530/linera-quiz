import React, { useState, useEffect, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useConnection } from '../contexts/ConnectionContext';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  creatorNickname: string;
  isStarted: boolean;
  isEnded: boolean;
  registeredCount: number;
  questions: Question[];
  createdAt: string;
}

const QuizList: React.FC = () => {
  const { primaryWallet } = useDynamicContext();
  const { isLineraConnected, connectToLinera, queryApplication } = useConnection();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [currentPage, setCurrentPage] = useState(1);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新增：查询去重和防抖相关状态
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryCache, setQueryCache] = useState<Map<string, Quiz[]>>(new Map());
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const pageSize = 6;
  const sortOptions = [
    { value: 'createdAt', label: 'Recently Created' },
    { value: 'title', label: 'Sort by Title' },
    { value: 'questions', label: 'Number of Questions' },
  ];

  // Process quiz data with search and sorting
  const processQuizData = useCallback(
    (quizzes: Quiz[]) => {
      let processed = [...quizzes];

      // Search functionality
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        processed = processed.filter(
          quiz =>
            quiz.title.toLowerCase().includes(term) ||
            quiz.description.toLowerCase().includes(term),
        );
      }

      // Sort functionality
      processed.sort((a, b) => {
        if (sortBy === 'createdAt') {
          return Number(b.createdAt) - Number(a.createdAt);
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'questions') {
          return b.questions.length - a.questions.length;
        }
        return 0;
      });

      setFilteredQuizzes(processed);
    },
    [searchTerm, sortBy],
  );

  // 生成查询缓存键
  const generateCacheKey = useCallback((walletAddress: string, page: number, limit: number) => {
    return `${walletAddress}_page_${page}_limit_${limit}`;
  }, []);

  // Fetch quizzes with strict deduplication and debouncing
  const fetchQuizzes = useCallback(async (immediate = false) => {
    const walletAddress = primaryWallet?.address;
    if (!walletAddress) {
      console.log('⏭️ No wallet address, skipping query');
      return;
    }

    // 生成缓存键
    const cacheKey = generateCacheKey(walletAddress, currentPage, pageSize);
    
    // 严格检查：是否已在查询中
    if (isQuerying) {
      console.log('🔄 Query already in progress, skipping...');
      return;
    }

    // 严格检查：缓存命中
    if (queryCache.has(cacheKey)) {
      console.log('📋 Using cached quiz data for key:', cacheKey);
      const cachedData = queryCache.get(cacheKey);
      if (cachedData) {
        setAllQuizzes(cachedData);
        return;
      }
    }

    // 防抖逻辑：如果不是立即执行，设置延迟
    if (!immediate && debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const executeQuery = async () => {
      console.log(`🚀 Starting query execution for wallet: ${walletAddress}, page: ${currentPage}`);
      
      try {
        setIsQuerying(true);
        if (!immediate) setLoading(true);

        // 再次检查钱包地址是否仍然有效
        if (!primaryWallet?.address || primaryWallet.address !== walletAddress) {
          console.log('⚠️ Wallet changed during query, aborting');
          return;
        }

        // 确保已连接到 Linera（使用统一的连接管理）
        if (!isLineraConnected) {
          console.log('🔗 Connecting to Linera via unified connection...');
          await connectToLinera();
        } else {
          console.log('🔗 Using existing Linera connection');
        }

        const query = `query GetQuizSets($limit: Int, $offset: Int) {
          quizSets(limit: $limit, offset: $offset, sortBy: "created_at", sortDirection: DESC) {
            id
            title
            description
            creatorNickname
            startTime
            endTime
            mode
            isStarted
            participantCount
          }
        }`;
        
        console.log(`📡 Executing GraphQL query for page ${currentPage}...`);
        const result = await queryApplication({
          query,
          variables: {
            limit: pageSize,
            offset: (currentPage - 1) * pageSize,
          },
        });

        // 再次检查钱包地址
        if (!primaryWallet?.address || primaryWallet.address !== walletAddress) {
          console.log('⚠️ Wallet changed after query, ignoring result');
          return;
        }

        if (result.data?.quizSets) {
          console.log(`✅ Successfully fetched ${result.data.quizSets.length} quizzes`);
          setAllQuizzes(result.data.quizSets);
          
          // 缓存结果
          setQueryCache(prev => new Map(prev.set(cacheKey, result.data.quizSets)));
        } else {
          console.log('ℹ️ No quiz data received');
        }
      } catch (err) {
        console.error('❌ Failed to fetch quizzes:', err);
      } finally {
        setIsQuerying(false);
        if (!immediate) setLoading(false);
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          setDebounceTimer(null);
        }
      }
    };

    if (immediate) {
      await executeQuery();
    } else {
      // 设置防抖延迟
      const timer = setTimeout(executeQuery, 500); // 增加防抖时间到500ms
      setDebounceTimer(timer);
    }
  }, [primaryWallet?.address, currentPage, pageSize, isQuerying, queryCache, debounceTimer, generateCacheKey, isLineraConnected, connectToLinera, queryApplication]);

  // 主要查询逻辑 - 钱包变化时立即执行
  useEffect(() => {
    if (primaryWallet?.address) {
      fetchQuizzes(true); // 立即执行，不防抖
    }
  }, [primaryWallet?.address, fetchQuizzes]);

  // 分页变化时防抖执行
  useEffect(() => {
    if (primaryWallet?.address && currentPage > 1) {
      fetchQuizzes(false); // 使用防抖
    }
  }, [currentPage, primaryWallet?.address, fetchQuizzes]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  useEffect(() => {
    // Re-process data when search/sort changes
    if (allQuizzes.length > 0) {
      processQuizData(allQuizzes);
    }
  }, [searchTerm, sortBy, currentPage, allQuizzes, processQuizData]);

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(Number(timestamp) / 1000); // Convert from microseconds to milliseconds
      return date.toLocaleDateString('en-US');
    } catch {
      return 'Invalid date';
    }
  };

  const copyQuizLink = (quizId: string) => {
    const link = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert('Quiz link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        alert(`Failed to copy link. Please try again: ${link}`);
      });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading)
    return (
      <div className="quiz-list">
        <div className="quiz-list-filters">
          <div className="search-bar">
            <div className="skeleton-text" style={{ height: '44px' }}></div>
          </div>
          <div className="sort-dropdown">
            <div
              className="skeleton-text"
              style={{ height: '44px', width: '200px' }}
            ></div>
          </div>
        </div>
        <div className="quiz-grid">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="quiz-card skeleton skeleton-card">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-button"></div>
              </div>
            ))}
        </div>
      </div>
    );

  const totalPages = Math.ceil(filteredQuizzes.length / pageSize);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="quiz-list">
      {/* Search and Filter */}
      <div className="quiz-list-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search all quizzes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="sort-dropdown">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="sort-select"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz Grid */}
      {paginatedQuizzes.length > 0 ? (
        <div className="quiz-grid">
          {paginatedQuizzes.map((quiz: Quiz) => (
            <div key={quiz.id} className="quiz-card">
              <h3>{quiz.title}</h3>
              <p className="quiz-description">{quiz.description}</p>
              <div className="quiz-meta">
                <span className="meta-item">
                  <strong>Questions:</strong> {quiz.questions.length}
                </span>
                <span className="meta-item">
                  <strong>Created at:</strong> {formatDate(quiz.createdAt)}
                </span>
              </div>
              <div className="quiz-status">
                {quiz.isEnded && <span className="status ended">已结束</span>}
                {quiz.isStarted && !quiz.isEnded && (
                  <span className="status started">进行中</span>
                )}
                {!quiz.isStarted && !quiz.isEnded && (
                  <span className="status pending">待开始</span>
                )}
              </div>
              <div className="quiz-actions">
                <button
                  className="action-button primary"
                  onClick={() =>
                    (window.location.href = `/quiz-rank/${quiz.id}`)
                  }
                >
                  View Rankings
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => copyQuizLink(quiz.id)}
                >
                  Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-container">
          <div className="empty-icon">📄</div>
          <h3>No matching quizzes found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-button ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizList;
