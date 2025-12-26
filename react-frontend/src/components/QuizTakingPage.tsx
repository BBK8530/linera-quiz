import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnection } from '../contexts/ConnectionContext';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

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

interface Ranking {
  nickname: string;
  score: number;
  completedAt: string;
  rank: number;
}

const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { primaryWallet } = useDynamicContext();
  const { queryApplication, onNewBlock, offNewBlock } = useConnection();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Fetch quiz details
  const fetchQuizDetails = useCallback(async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch quiz details using ConnectionContext
      const quizQuery = `
        query GetQuiz($quizId: String!) {
          quiz(id: $quizId) {
            id
            title
            description
            duration
            creatorNickname
            isStarted
            isEnded
            registeredCount
            questions {
              id
              text
              options
              correctAnswer
            }
            createdAt
          }
        }
      `;

      const quizResult = await queryApplication({
        query: quizQuery,
        variables: { quizId },
      });

      if (
        quizResult &&
        typeof quizResult === 'object' &&
        'data' in quizResult &&
        quizResult.data &&
        typeof quizResult.data === 'object' &&
        'quiz' in quizResult.data
      ) {
        const quizData = quizResult.data.quiz as Quiz;
        setQuiz(quizData);
        setTimeRemaining(quizData.duration * 60); // Convert minutes to seconds
      } else {
        setError('Quiz not found');
      }
    } catch (err) {
      console.error('Failed to fetch quiz details:', err);
      setError('Failed to fetch quiz details');
    } finally {
      setLoading(false);
    }
  }, [quizId, queryApplication]);

  // Fetch quiz rankings
  const fetchQuizRankings = useCallback(async () => {
    if (!quizId) return;

    try {
      const rankingsQuery = `
        query GetQuizRankings($quizId: String!) {
          quizRankings(quizId: $quizId) {
            nickname
            score
            completedAt
            rank
          }
        }
      `;

      const rankingsResult = await queryApplication({
        query: rankingsQuery,
        variables: { quizId },
      });

      if (
        rankingsResult &&
        typeof rankingsResult === 'object' &&
        'data' in rankingsResult &&
        rankingsResult.data &&
        typeof rankingsResult.data === 'object' &&
        'quizRankings' in rankingsResult.data
      ) {
        setRankings(rankingsResult.data.quizRankings as Ranking[]);
      }
    } catch (err) {
      console.error('Failed to fetch quiz rankings:', err);
    }
  }, [quizId, queryApplication]);

  // Handle quiz submission
  const handleQuizSubmit = useCallback(async () => {
    if (!quiz || !primaryWallet?.address) return;

    try {
      setLoading(true);

      // Calculate score
      let score = 0;
      quiz.questions.forEach(question => {
        if (selectedAnswers[question.id] === question.correctAnswer) {
          score += 1;
        }
      });

      // Submit score to Linera
      const mutation = `
        mutation SubmitQuizAnswer($quizId: String!, $answers: [QuizAnswerInput!]!) {
          submitQuizAnswer(quizId: $quizId, answers: $answers) {
            success
            message
          }
        }
      `;

      const answers = Object.entries(selectedAnswers).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
        }),
      );

      await queryApplication({
        query: mutation,
        variables: {
          quizId: quiz.id,
          answers,
        },
      });

      setFinalScore(score);
      setIsQuizCompleted(true);

      // Refresh rankings
      fetchQuizRankings();
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  }, [
    quiz,
    primaryWallet,
    selectedAnswers,
    fetchQuizRankings,
    queryApplication,
  ]);

  // Handle new block event - refresh data
  const handleNewBlock = useCallback(() => {
    console.log(
      '🔄 New block received, refreshing quiz details and rankings...',
    );
    fetchQuizRankings();
  }, [fetchQuizRankings]);

  // Register new block listener
  useEffect(() => {
    onNewBlock(handleNewBlock);
    return () => {
      offNewBlock(handleNewBlock);
    };
  }, [onNewBlock, offNewBlock, handleNewBlock]);

  // Initial data fetch
  useEffect(() => {
    fetchQuizDetails();
    fetchQuizRankings();
  }, [fetchQuizDetails, fetchQuizRankings]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isQuizStarted && timeRemaining > 0 && !isQuizCompleted) {
      timer = setInterval(() => {
        setTimeRemaining(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isQuizStarted && !isQuizCompleted) {
      handleQuizSubmit();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isQuizStarted, timeRemaining, isQuizCompleted, handleQuizSubmit]);

  const handleStartQuiz = () => {
    setIsQuizStarted(true);
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="quiz-taking-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-taking-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button
            className="action-button primary"
            onClick={() => navigate('/')}
          >
            Back to All Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-taking-page">
        <div className="error-container">
          <p className="error-message">Quiz not found</p>
          <button
            className="action-button primary"
            onClick={() => navigate('/')}
          >
            Back to All Quizzes
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="quiz-taking-page">
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>{quiz.title}</h2>
          <p className="quiz-description">{quiz.description}</p>
          <div className="quiz-meta">
            <span>Creator: {quiz.creatorNickname}</span>
            <span>Questions: {quiz.questions.length}</span>
            {isQuizStarted && (
              <span className="timer">Time: {formatTime(timeRemaining)}</span>
            )}
          </div>
        </div>

        {!isQuizStarted && (
          <div className="quiz-start-section">
            <h3>Ready to start the quiz?</h3>
            <p>
              You have {quiz.duration} minutes to complete{' '}
              {quiz.questions.length} questions.
            </p>
            <button
              className="action-button primary large"
              onClick={handleStartQuiz}
              disabled={!primaryWallet?.address}
            >
              {!primaryWallet?.address
                ? 'Please connect wallet first'
                : 'Start Quiz'}
            </button>
          </div>
        )}

        {isQuizStarted && !isQuizCompleted && (
          <div className="quiz-content">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
              <span className="progress-text">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>

            <div className="question-section">
              <h3 className="question-text">{currentQuestion.text}</h3>
              <div className="options-container">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`option ${
                      selectedAnswers[currentQuestion.id] === option
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      handleAnswerSelect(currentQuestion.id, option)
                    }
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                className="action-button secondary"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </button>

              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <button
                  className="action-button primary"
                  onClick={handleQuizSubmit}
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  className="action-button primary"
                  onClick={handleNextQuestion}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}

        {isQuizCompleted && (
          <div className="quiz-result-section">
            <h3>Quiz Completed!</h3>
            <div className="result-card">
              <p className="score">
                Your Score: {finalScore} out of {quiz.questions.length}
              </p>
              <p className="percentage">
                {((finalScore / quiz.questions.length) * 100).toFixed(2)}%
              </p>
            </div>
            <button
              className="action-button primary"
              onClick={() => navigate('/')}
            >
              Back to All Quizzes
            </button>
          </div>
        )}
      </div>

      <div className="rankings-sidebar">
        <h3>Quiz Rankings</h3>
        {rankings.length > 0 ? (
          <div className="rankings-list">
            {rankings.slice(0, 10).map((ranking, index) => (
              <div key={index} className="ranking-item">
                <span className="rank">#{ranking.rank}</span>
                <span className="nickname">{ranking.nickname}</span>
                <span className="score">
                  {ranking.score}/{quiz.questions.length}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-rankings">No rankings available yet</p>
        )}
      </div>
    </div>
  );
};

export default QuizTakingPage;
