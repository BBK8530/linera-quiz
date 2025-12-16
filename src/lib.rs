// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Quiz Application */

use async_graphql::{InputObject, OutputType, SimpleObject, Union};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub mod state;

/// Quiz不存在错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuizNotFoundError {
    pub quiz_id: u64,
}

/// Quiz尚未开始错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuizNotStartedError {
    pub quiz_id: u64,
}

/// Quiz已经结束错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuizEndedError {
    pub quiz_id: u64,
}

/// 用户已经提交过该Quiz错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct AlreadySubmittedError {
    pub user: String,
    pub quiz_id: u64,
}

/// 用户未认证错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct UnauthorizedError {
    pub message: String,
}

/// 输入参数无效错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct InvalidInputError {
    pub message: String,
}

/// 答案格式错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct InvalidAnswerFormatError {
    pub message: String,
}

/// 时间戳格式错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct InvalidTimestampFormatError {
    pub message: String,
}

/// 时间范围错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct InvalidTimeRangeError {
    pub message: String,
}

/// 存储操作失败错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct StorageError {
    pub message: String,
}

/// 其他未知错误
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct OtherError {
    pub message: String,
}

/// 应用可能返回的错误类型联合
#[derive(Debug, Serialize, Deserialize, Union)]
pub enum QuizError {
    /// Quiz不存在
    QuizNotFound(QuizNotFoundError),
    /// Quiz尚未开始
    QuizNotStarted(QuizNotStartedError),
    /// Quiz已经结束
    QuizEnded(QuizEndedError),
    /// 用户已经提交过该Quiz
    AlreadySubmitted(AlreadySubmittedError),
    /// 用户未认证
    Unauthorized(UnauthorizedError),
    /// 输入参数无效
    InvalidInput(InvalidInputError),
    /// 答案格式错误
    InvalidAnswerFormat(InvalidAnswerFormatError),
    /// 时间戳格式错误
    InvalidTimestampFormat(InvalidTimestampFormatError),
    /// 时间范围错误
    InvalidTimeRange(InvalidTimeRangeError),
    /// 存储操作失败
    StorageError(StorageError),
    /// 其他未知错误
    Other(OtherError),
}

/// 带错误处理的响应类型
#[derive(Debug, Serialize, Deserialize)]
pub struct QuizResult<T> {
    /// 成功时的结果数据
    pub data: Option<T>,
    /// 错误信息
    pub error: Option<QuizError>,
}

#[async_graphql::Object]
impl<T: OutputType + Send + Sync> QuizResult<T> {
    async fn data(&self) -> Option<&T> {
        self.data.as_ref()
    }
    
    async fn error(&self) -> Option<&QuizError> {
        self.error.as_ref()
    }
}

impl<T> QuizResult<T> {
    /// 创建成功响应
    pub fn success(data: T) -> Self {
        QuizResult {
            data: Some(data),
            error: None,
        }
    }
    
    /// 创建错误响应
    pub fn from_error(error: QuizError) -> Self {
        QuizResult {
            data: None,
            error: Some(error),
        }
    }
    
    /// 创建Quiz不存在错误
    pub fn quiz_not_found(quiz_id: u64) -> Self {
        QuizResult::from_error(QuizError::QuizNotFound(QuizNotFoundError {
            quiz_id,
        }))
    }
    
    /// 创建Quiz尚未开始错误
    pub fn quiz_not_started(quiz_id: u64) -> Self {
        QuizResult::from_error(QuizError::QuizNotStarted(QuizNotStartedError {
            quiz_id,
        }))
    }
    
    /// 创建Quiz已经结束错误
    pub fn quiz_ended(quiz_id: u64) -> Self {
        QuizResult::from_error(QuizError::QuizEnded(QuizEndedError {
            quiz_id,
        }))
    }
    
    /// 创建用户已经提交过该Quiz错误
    pub fn already_submitted(user: String, quiz_id: u64) -> Self {
        QuizResult::from_error(QuizError::AlreadySubmitted(AlreadySubmittedError {
            user,
            quiz_id,
        }))
    }
    
    /// 创建用户未认证错误
    pub fn unauthorized() -> Self {
        QuizResult::from_error(QuizError::Unauthorized(UnauthorizedError {
            message: "User is not authenticated".to_string(),
        }))
    }
    
    /// 创建输入参数无效错误
    pub fn invalid_input(message: String) -> Self {
        QuizResult::from_error(QuizError::InvalidInput(InvalidInputError {
            message,
        }))
    }
    
    /// 创建答案格式错误
    pub fn invalid_answer_format(message: String) -> Self {
        QuizResult::from_error(QuizError::InvalidAnswerFormat(InvalidAnswerFormatError {
            message,
        }))
    }
    
    /// 创建时间戳格式错误
    pub fn invalid_timestamp_format(message: String) -> Self {
        QuizResult::from_error(QuizError::InvalidTimestampFormat(InvalidTimestampFormatError {
            message,
        }))
    }
    
    /// 创建时间范围错误
    pub fn invalid_time_range(message: String) -> Self {
        QuizResult::from_error(QuizError::InvalidTimeRange(InvalidTimeRangeError {
            message,
        }))
    }
    
    /// 创建存储操作失败错误
    pub fn storage_error(message: String) -> Self {
        QuizResult::from_error(QuizError::StorageError(StorageError {
            message,
        }))
    }
    
    /// 创建其他未知错误
    pub fn other_error(message: String) -> Self {
        QuizResult::from_error(QuizError::Other(OtherError {
            message,
        }))
    }
}

pub struct QuizAbi;

/// 创建Quiz集合的参数
#[derive(Debug, Serialize, Deserialize, InputObject)]
pub struct CreateQuizParams {
    pub title: String,
    pub description: String,
    pub questions: Vec<QuestionParams>,
    pub time_limit: u64,    // 秒
    pub start_time: String, // 毫秒时间戳字符串
    pub end_time: String,   // 毫秒时间戳字符串
    pub nick_name: String,
}

/// 问题参数
#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, InputObject)]
#[graphql(input_name = "QuestionParamsInput")]
pub struct QuestionParams {
    pub text: String,
    pub options: Vec<String>,
    pub correct_options: Vec<u32>,
    pub points: u32,
}

/// 提交答案的参数
#[derive(Debug, Serialize, Deserialize, InputObject)]
pub struct SubmitAnswersParams {
    pub quiz_id: u64,
    pub answers: Vec<Vec<u32>>, // 每个问题的答案选项索引列表，支持多选
    pub time_taken: u64,        // 毫秒
    pub nick_name: String,
}

/// 排行榜条目
#[derive(Debug, Serialize, Deserialize, SimpleObject, Clone)]
pub struct LeaderboardEntry {
    pub user: String,
    pub score: u32,
    pub time_taken: u64,
}

/// 应用支持的操作
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// 创建新的Quiz集合
    CreateQuiz(CreateQuizParams),
    /// 提交Quiz答案
    SubmitAnswers(SubmitAnswersParams),
}

/// 应用支持的查询
#[derive(Debug, Serialize, Deserialize)]
pub enum Query {
    /// 获取所有Quiz集合
    GetQuizSets,
    /// 获取Quiz集合详情
    GetQuizSet(u64),
    /// 获取用户的Quiz尝试记录
    GetUserAttempts(String),
    /// 获取Quiz排行榜
    GetLeaderboard,
    /// 获取单个Quiz的排行榜
    GetQuizLeaderboard(u64),
    /// 获取用户参与的测验集合
    GetUserParticipations(String),
    /// 获取用户创建的测验集合
    GetUserCreatedQuizzes(String),
    /// 获取用户参与的测验集合详情
    GetUserParticipatedQuizzes(String),
}

/// 用户答题尝试视图
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct UserAttemptView {
    pub quiz_id: u64,
    pub user: String,
    pub answers: Vec<Vec<u32>>,
    pub score: u32,
    pub time_taken: u64,
    pub completed_at: String, // 微秒时间戳字符串
}

/// 测验尝试记录
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuizAttempt {
    pub quiz_id: u64,
    pub attempt: UserAttemptView,
}

/// Quiz集合视图
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuizSetView {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub creator: String,
    pub questions: Vec<QuestionView>,
    pub start_time: String, // 微秒时间戳字符串
    pub end_time: String,   // 微秒时间戳字符串
    pub created_at: String, // 微秒时间戳字符串
}

/// 问题视图
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QuestionView {
    pub id: u32,
    pub text: String,
    pub options: Vec<String>,
    pub points: u32,
}

/// 查询响应
#[derive(Debug, Serialize, Deserialize)]
pub enum QueryResponse {
    /// 所有Quiz集合
    QuizSets(Vec<QuizSetView>),
    /// Quiz集合详情
    QuizSet(Option<QuizSetView>),
    /// 用户尝试记录列表
    UserAttempts(Vec<QuizAttempt>),
    Leaderboard(Vec<UserAttemptView>),
    QuizLeaderboard(Vec<UserAttemptView>),
    UserParticipations(Vec<u64>),
    /// 用户创建的测验集合
    UserCreatedQuizzes(Vec<QuizSetView>),
    /// 用户参与的测验集合
    UserParticipatedQuizzes(Vec<QuizSetView>),
}

impl ContractAbi for QuizAbi {
    type Operation = Operation;
    type Response = QuizResult<()>;
}

impl ServiceAbi for QuizAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}