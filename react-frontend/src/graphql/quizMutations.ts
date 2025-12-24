import { gql } from '@apollo/client';

export const SET_NICKNAME = gql`
  mutation SetNickname($nickname: String!) {
    set_nickname(params: { nickname: $nickname }) {
      success
    }
  }
`;

export const CREATE_QUIZ = gql`
  mutation CreateQuiz($title: String!, $description: String!, $duration: Int!, $questions: [CreateQuestionInput!]!) {
    create_quiz(params: { title: $title, description: $description, duration: $duration, questions: $questions }) {
      success
      quiz_id
    }
  }
`;

export const START_QUIZ = gql`
  mutation StartQuiz($quizId: ID!) {
    start_quiz(params: { quiz_id: $quizId }) {
      success
    }
  }
`;

export const SUBMIT_ANSWERS = gql`
  mutation SubmitAnswers($quizId: ID!, $answers: [SubmitAnswerInput!]!) {
    submit_answers(params: { quiz_id: $quizId, answers: $answers }) {
      success
      score
      time_used
    }
  }
`;

export const REGISTER_FOR_QUIZ = gql`
  mutation RegisterForQuiz($quizId: ID!) {
    register_for_quiz(params: { quiz_id: $quizId }) {
      success
    }
  }
`;
