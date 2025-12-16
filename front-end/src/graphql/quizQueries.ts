import { gql } from '@apollo/client';

// Get all quiz sets
export const GET_ALL_QUIZ_SETS = gql`
  query GetAllQuizSets {
    quizSets {
      data {
        id
        title
        description
        creator
        startTime
        endTime
        createdAt
        questions {
          id
          text
          options
          points
        }
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get single quiz set details
export const GET_QUIZ_SET = gql`
  query GetQuizSet($quizId: ID!) {
    quizSet(quizId: $quizId) {
      data {
        id
        title
        description
        creator
        startTime
        endTime
        createdAt
        questions {
          id
          text
          options
          points
        }
      }
      error {
        quizNotFound {
          quiz_id
        }
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get user quiz attempt records
export const GET_USER_ATTEMPTS = gql`
  query GetUserAttempts($user: String!) {
    userAttempts(user: $user) {
      data {
        quizId
        attempt {
          quizId
          user
          answers
          score
          timeTaken
          completedAt
        }
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get global leaderboard
export const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    leaderboard {
      data {
        user
        score
        timeTaken
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get leaderboard for a single quiz
export const GET_QUIZ_LEADERBOARD = gql`
  query GetQuizLeaderboard($quizId: ID!) {
    quizLeaderboard(quizId: $quizId) {
      data {
        quizId
        user
        score
        completedAt
        timeTaken
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get user profile
export const GET_USER_PROFILE = gql`
  query GetUserProfile($user: String!) {
    userProfile(user: $user) {
      data {
        nickname
        account
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get quizzes created by user
export const GET_USER_CREATED_QUIZZES = gql`
  query GetUserCreatedQuizzes($nickname: String!) {
    getUserCreatedQuizzes(nickname: $nickname) {
      data {
        id
        title
        description
        creator
        startTime
        endTime
        createdAt
        questions {
          id
          text
          options
          points
        }
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;

// Get quizzes participated by user
export const GET_USER_PARTICIPATED_QUIZZES = gql`
  query GetUserParticipatedQuizzes($user: String!) {
    userParticipatedQuizzes(user: $user) {
      data {
        id
        title
        description
        creator
        startTime
        endTime
        createdAt
        questions {
          id
          text
          options
          points
        }
      }
      error {
        storageError {
          message
        }
        other {
          message
        }
      }
    }
  }
`;