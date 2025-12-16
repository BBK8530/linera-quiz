import { gql } from '@apollo/client';

// Create new quiz set
export const CREATE_QUIZ = gql`
  mutation CreateQuiz($field0: CreateQuizParams!) {
    createQuiz(field0: $field0) {
      data
      error {
        unauthorized {
          message
        }
        invalidInput {
          message
        }
        invalidTimestampFormat {
          message
        }
        invalidTimeRange {
          message
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

// Submit quiz answers
export const SUBMIT_ANSWERS = gql`
  mutation SubmitAnswers($field0: SubmitAnswersParams!) {
    submitAnswers(field0: $field0) {
      data
      error {
        quizNotFound {
          quiz_id
        }
        quizNotStarted {
          quiz_id
        }
        quizEnded {
          quiz_id
        }
        alreadySubmitted {
          user
          quiz_id
        }
        invalidAnswerFormat {
          message
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

// Set user nickname
export const SET_NICKNAME = gql`
  mutation SetNickname($field0: SetNicknameParams!) {
    setNickname(field0: $field0) {
      data
      error {
        quizNotFound {
          value
        }
        quizNotStarted {
          value
        }
        quizEnded {
          value
        }
        alreadySubmitted {
          value
          user
        }
        unauthorized
        invalidInput {
          value
        }
        invalidAnswerFormat {
          value
        }
        invalidTimestampFormat {
          value
        }
        invalidTimeRange {
          value
        }
        storageError {
          value
        }
        other {
          value
        }
      }
    }
  }
`;
