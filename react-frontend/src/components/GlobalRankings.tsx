import React, { useState, useEffect, useCallback } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface UserRanking {
  nickname: string;
  totalScore: number;
  quizzesCompleted: number;
  averageScore: number;
  rank: number;
}

const GlobalRankings: React.FC = () => {
  const { primaryWallet } = useDynamicContext();
  const { connectToLinera, queryApplication, onNewBlock, offNewBlock } =
    useConnection();

  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const pageSize = 10;

  // Fetch global rankings
  const fetchGlobalRankings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure connected to Linera
      await connectToLinera();

      // Fetch global rankings
      const query = `
        query GetGlobalRankings {
          globalRankings {
            nickname
            totalScore
            quizzesCompleted
            averageScore
            rank
          }
        }
      `;

      const result = (await queryApplication({
        query,
      })) as { data?: { globalRankings: UserRanking[] } };

      if (result.data?.globalRankings) {
        setRankings(result.data.globalRankings);
      }
    } catch (err) {
      console.error('Failed to fetch global rankings:', err);
      setError('Failed to fetch global rankings');
    } finally {
      setLoading(false);
    }
  }, [connectToLinera, queryApplication]);

  // Handle new block event - refresh global rankings
  const handleNewBlock = useCallback(() => {
    console.log('🔄 New block received, refreshing global rankings...');
    fetchGlobalRankings();
  }, [fetchGlobalRankings]);

  // Register new block listener
  useEffect(() => {
    onNewBlock(handleNewBlock);
    return () => {
      offNewBlock(handleNewBlock);
    };
  }, [onNewBlock, offNewBlock, handleNewBlock]);

  // Initial data fetch when wallet is connected
  useEffect(() => {
    if (primaryWallet?.address) {
      fetchGlobalRankings();
    }
  }, [primaryWallet?.address, fetchGlobalRankings]);

  // Sort rankings
  const sortedRankings = [...rankings].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'totalScore':
        comparison = a.totalScore - b.totalScore;
        break;
      case 'quizzesCompleted':
        comparison = a.quizzesCompleted - b.quizzesCompleted;
        break;
      case 'averageScore':
        comparison = a.averageScore - b.averageScore;
        break;
      case 'nickname':
        comparison = a.nickname.localeCompare(b.nickname);
        break;
      default:
        comparison = a.rank - b.rank;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Pagination
  const totalPages = Math.ceil(sortedRankings.length / pageSize);
  const paginatedRankings = sortedRankings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="global-rankings">
        <div className="rankings-header">
          <h2>Leadboard</h2>
          <div
            className="skeleton-text"
            style={{ height: '44px', width: '200px' }}
          ></div>
        </div>
        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="rank-column">
                  <div
                    className="skeleton-text"
                    style={{ width: '40px', height: '20px' }}
                  ></div>
                </th>
                <th className="nickname-column">
                  <div
                    className="skeleton-text"
                    style={{ width: '150px', height: '20px' }}
                  ></div>
                </th>
                <th className="score-column">
                  <div
                    className="skeleton-text"
                    style={{ width: '100px', height: '20px' }}
                  ></div>
                </th>
                <th className="quizzes-column">
                  <div
                    className="skeleton-text"
                    style={{ width: '100px', height: '20px' }}
                  ></div>
                </th>
                <th className="average-column">
                  <div
                    className="skeleton-text"
                    style={{ width: '100px', height: '20px' }}
                  ></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array(pageSize)
                .fill(0)
                .map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td>
                      <div
                        className="skeleton-text"
                        style={{ width: '40px', height: '20px' }}
                      ></div>
                    </td>
                    <td>
                      <div
                        className="skeleton-text"
                        style={{ width: '150px', height: '20px' }}
                      ></div>
                    </td>
                    <td>
                      <div
                        className="skeleton-text"
                        style={{ width: '100px', height: '20px' }}
                      ></div>
                    </td>
                    <td>
                      <div
                        className="skeleton-text"
                        style={{ width: '100px', height: '20px' }}
                      ></div>
                    </td>
                    <td>
                      <div
                        className="skeleton-text"
                        style={{ width: '100px', height: '20px' }}
                      ></div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="global-rankings">
        <div className="rankings-header">
          <h2>Leadboard</h2>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button
            className="action-button primary"
            onClick={fetchGlobalRankings}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="global-rankings">
      <div className="rankings-header">
        <h2>Leadboard</h2>
        <div className="sort-controls">
          <label>Sort by: </label>
          <select
            className="sort-select"
            value={sortBy}
            onChange={e => handleSort(e.target.value)}
          >
            <option value="totalScore">Total Score</option>
            <option value="quizzesCompleted">Quizzes Completed</option>
            <option value="averageScore">Average Score</option>
            <option value="nickname">Nickname</option>
          </select>
          <button
            className="sort-order-button"
            onClick={() => handleSort(sortBy)}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="rankings-table-container">
        {rankings.length > 0 ? (
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="rank-column">Rank</th>
                <th className="nickname-column">Nickname</th>
                <th className="score-column">Total Score</th>
                <th className="quizzes-column">Quizzes Completed</th>
                <th className="average-column">Average Score</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRankings.map(ranking => (
                <tr key={ranking.nickname} className="ranking-row">
                  <td className="rank-column">
                    <span className={`rank-badge rank-${ranking.rank}`}>
                      #{ranking.rank}
                    </span>
                  </td>
                  <td className="nickname-column">
                    <span className="nickname">{ranking.nickname}</span>
                  </td>
                  <td className="score-column">
                    <span className="total-score">{ranking.totalScore}</span>
                  </td>
                  <td className="quizzes-column">
                    <span className="quizzes-count">
                      {ranking.quizzesCompleted}
                    </span>
                  </td>
                  <td className="average-column">
                    <span className="average-score">
                      {ranking.averageScore.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-container">
            <div className="empty-icon">🏆</div>
            <h3>No rankings available yet</h3>
            <p>
              Be the first to complete a quiz and appear on the global rankings!
            </p>
          </div>
        )}
      </div>

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

      <div className="rankings-stats">
        <p>Total users ranked: {rankings.length}</p>
        {rankings.length > 0 && (
          <div className="top-stats">
            <h4>Top Performers:</h4>
            <ul className="top-users">
              {rankings.slice(0, 3).map((ranking, index) => (
                <li key={index} className="top-user-item">
                  <span className="medal">{['🥇', '🥈', '🥉'][index]}</span>
                  <span className="user-info">
                    {ranking.nickname} - {ranking.totalScore} points
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalRankings;
