# Quiz Application GraphQL API

## 枚举类型

### QuizError
```graphql
enum QuizError {
  # 昵称已被使用
  NicknameAlreadyTaken
  # 无效的Quiz模式
  InvalidQuizMode
  # 无效的开始模式
  InvalidStartMode
  # Quiz尚未开始
  QuizNotStarted
  # 用户已经尝试过该Quiz
  UserAlreadyAttempted
  # 用户未注册该Quiz
  UserNotRegistered
  # 用户已经注册该Quiz
  UserAlreadyRegistered
  # Quiz未找到
  QuizNotFound
  # 用户未找到
  UserNotFound
  # 权限不足
  InsufficientPermissions
  # 参数错误
  InvalidParameters
  # 内部错误
  InternalError
}
```

### SortDirection
```graphql
enum SortDirection {
  # 升序
  ASC
  # 降序
  DESC
}
```

### QuizMode
```graphql
enum QuizMode {
  # 公开模式
  public
  # 注册模式
  registration
}
```

### QuizStartMode
```graphql
enum QuizStartMode {
  # 自动开始
  auto
  # 手动开始
  manual
}
```

## 输入类型

### SetNicknameParams
```graphql
input SetNicknameParams {
  nickname: String!
}
```

### CreateQuizParams
```graphql
input CreateQuizParams {
  title: String!
  description: String!
  questions: [QuestionParamsInput!]!
  time_limit: Int!
  start_time: String!
  end_time: String!
  nickname: String!
  mode: String!
  start_mode: String!
}
```

### QuestionParamsInput
```graphql
input QuestionParamsInput {
  text: String!
  options: [String!]!
  correct_options: [Int!]!
  points: Int!
  type: String!
  id: String!
}
```

### AnswerOption
```graphql
input AnswerOption {
  question_id: String!
  selected_answers: [Int!]!
}
```

### SubmitAnswersParams
```graphql
input SubmitAnswersParams {
  quiz_id: ID!
  answers: [AnswerOption!]!
  time_taken: Int!
  nickname: String!
}
```

### PaginationParams
```graphql
input PaginationParams {
  limit: Int
  offset: Int
}
```

### SortParams
```graphql
input SortParams {
  sort_by: String
  sort_direction: SortDirection
}
```

## 对象类型

### UserView
```graphql
type UserView {
  wallet_address: String!
  nickname: String!
  created_at: String!
}
```

### UserAttemptView
```graphql
type UserAttemptView {
  quiz_id: ID!
  user: String!
  nickname: String!
  answers: [[Int!]!]!
  score: Int!
  time_taken: Int!
  completed_at: String!
}
```

### QuizAttempt
```graphql
type QuizAttempt {
  quiz_id: ID!
  attempt: UserAttemptView!
}
```

### QuizSetView
```graphql
type QuizSetView {
  id: ID!
  title: String!
  description: String!
  creator: String!
  creator_nickname: String!
  questions: [QuestionView!]!
  start_time: String!
  end_time: String!
  created_at: String!
  mode: String!
  start_mode: String!
  is_started: Boolean!
  registered_users: [String!]!
  participant_count: Int!
}
```

### QuestionView
```graphql
type QuestionView {
  id: String!
  text: String!
  options: [String!]!
  points: Int!
  type: String!
}
```

### LeaderboardEntry
```graphql
type LeaderboardEntry {
  user: String!
  score: Int!
  time_taken: Int!
}
```

## 查询

```graphql
type Query {
  # 获取单个Quiz集合详情
  quiz_set(quiz_id: ID!): QuizSetView
  
  # 获取所有Quiz集合（支持分页和排序）
  quiz_sets(
    limit: Int,
    offset: Int,
    sort_by: String,
    sort_direction: SortDirection
  ): [QuizSetView!]!
  
  # 获取用户的Quiz尝试记录（支持分页和排序）
  user_attempts(
    user: String!,
    limit: Int,
    offset: Int,
    sort_by: String,
    sort_direction: SortDirection
  ): [QuizAttempt!]!
  
  # 获取全局排行榜
  leaderboard: [UserAttemptView!]!
  
  # 获取单个Quiz的排行榜
  quiz_leaderboard(quiz_id: ID!): [UserAttemptView!]!
  
  # 获取用户参与的测验集合ID列表
  user_participations(user: String!): [ID!]!
  
  # 根据钱包地址获取用户信息
  user(wallet_address: String!): UserView
  
  # 根据昵称获取用户信息
  user_by_nickname(nickname: String!): UserView
  
  # 获取测验的参与者列表
  get_quiz_participants(quiz_id: ID!): [String!]!
  
  # 检查用户是否参与过某个测验
  is_user_participated(quiz_id: ID!, wallet_address: String!): Boolean!
  
  # 获取用户创建的测验集合（支持分页和排序）
  get_user_created_quizzes(
    nickname: String!,
    limit: Int,
    offset: Int,
    sort_by: String,
    sort_direction: SortDirection
  ): [QuizSetView!]!
  
  # 获取用户参与的测验集合（支持分页和排序）
  get_user_participated_quizzes(
    wallet_address: String!,
    limit: Int,
    offset: Int,
    sort_by: String,
    sort_direction: SortDirection
  ): [QuizSetView!]!
}
```

## 变更

```graphql
type Mutation {
  # 用户设置昵称
  SetNickname(field0: SetNicknameParams!): Boolean
  
  # 创建新的Quiz集合
  CreateQuiz(field0: CreateQuizParams!): Boolean
  
  # 提交Quiz答案
  SubmitAnswers(field0: SubmitAnswersParams!): Boolean
  
  # 开始Quiz（仅创建者可调用）
  StartQuiz(quiz_id: ID!): Boolean
  
  # 报名参与Quiz
  RegisterForQuiz(quiz_id: ID!): Boolean
}
```

## 示例查询

### 获取单个测验详情
```graphql
query GetQuizSet($quizId: ID!) {
  quiz_set(quiz_id: $quizId) {
    id
    title
    description
    creator_nickname
    questions {
      id
      text
      options
      points
      type
    }
    start_time
    end_time
    mode
    is_started
  }
}
```

### 获取测验列表
```graphql
query GetQuizSets($limit: Int, $offset: Int) {
  quiz_sets(limit: $limit, offset: $offset, sort_by: "created_at", sort_direction: DESC) {
    id
    title
    description
    creator_nickname
    start_time
    end_time
    mode
    is_started
    participant_count
  }
}
```

### 获取用户尝试记录
```graphql
query GetUserAttempts($user: String!) {
  user_attempts(user: $user, sort_by: "completed_at", sort_direction: DESC) {
    quiz_id
    attempt {
      score
      time_taken
      completed_at
    }
  }
}
```

### 获取测验排行榜
```graphql
query GetQuizLeaderboard($quizId: ID!) {
  quiz_leaderboard(quiz_id: $quizId) {
    nickname
    score
    time_taken
  }
}
```

## 示例变更

### 设置用户昵称
```graphql
mutation SetNickname($params: SetNicknameParams!) {
  SetNickname(field0: $params)
}
```

### 创建测验
```graphql
mutation CreateQuiz($params: CreateQuizParams!) {
  CreateQuiz(field0: $params)
}
```

### 提交答案
```graphql
mutation SubmitAnswers($params: SubmitAnswersParams!) {
  SubmitAnswers(field0: $params)
}
```

### 报名参与测验
```graphql
mutation RegisterForQuiz($quizId: ID!) {
  RegisterForQuiz(quiz_id: $quizId)
}
```

### 开始测验
```graphql
mutation StartQuiz($quizId: ID!) {
  StartQuiz(quiz_id: $quizId)
}
```