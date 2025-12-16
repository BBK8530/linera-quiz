// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::linera_base_types::TimeDelta;
use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};

use crate::state::{Question, QuizSet, QuizState, UserAttempt};
use quiz::{CreateQuizParams, LeaderboardEntry, Operation, SubmitAnswersParams, QuizResult};

pub struct QuizContract {
    state: QuizState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(QuizContract);

impl WithContractAbi for QuizContract {
    type Abi = quiz::QuizAbi;
}

impl Contract for QuizContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = QuizState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load QuizState");
        QuizContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // 初始化下一个Quiz ID为1
        let current_value = self.state.next_quiz_id.get();
        if *current_value == 0 {
            self.state.next_quiz_id.set(1);
        }
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::CreateQuiz(params) => {
                self.create_quiz(params).await
            }
            Operation::SubmitAnswers(params) => {
                self.submit_answers(params).await
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }

    async fn execute_message(&mut self, _message: ()) {
        // Not implemented yet
    }
}

impl QuizContract {
    async fn create_quiz(&mut self, params: CreateQuizParams) -> QuizResult<()> {
        let current_time = self.runtime.system_time();

        // 验证测验时间范围
        let start_time_millis = match params.start_time.parse::<u64>() {
            Ok(millis) => millis,
            Err(_) => return QuizResult::invalid_timestamp_format("Start time is not a valid number".to_string()),
        };

        // 检查时间戳长度是否合理（毫秒级时间戳应该是13位左右）
        if start_time_millis.to_string().len() < 10 || start_time_millis.to_string().len() > 14 {
            return QuizResult::invalid_timestamp_format("Start time seems invalid (should be a millisecond timestamp)".to_string());
        }

        let start_time: linera_sdk::linera_base_types::Timestamp = match start_time_millis.checked_mul(1000) {
            Some(micros) => micros.into(),
            None => return QuizResult::invalid_timestamp_format("Start time overflow when converting to microseconds".to_string()),
        };

        let end_time_millis = match params.end_time.parse::<u64>() {
            Ok(millis) => millis,
            Err(_) => return QuizResult::invalid_timestamp_format("End time is not a valid number".to_string()),
        };

        // 检查时间戳长度是否合理（毫秒级时间戳应该是13位左右）
        if end_time_millis.to_string().len() < 10 || end_time_millis.to_string().len() > 14 {
            return QuizResult::invalid_timestamp_format("End time seems invalid (should be a millisecond timestamp)".to_string());
        }

        let end_time: linera_sdk::linera_base_types::Timestamp = match end_time_millis.checked_mul(1000) {
            Some(micros) => micros.into(),
            None => return QuizResult::invalid_timestamp_format("End time overflow when converting to microseconds".to_string()),
        };

        if start_time <= current_time {
            return QuizResult::invalid_time_range("Start time must be in the future".to_string());
        }
        
        if end_time <= start_time {
            return QuizResult::invalid_time_range("End time must be after start time".to_string());
        }
        
        // 检查时间范围是否合理（不超过100年）
        if end_time.delta_since(start_time) > TimeDelta::from_secs(3600 * 24 * 365 * 100) {
            return QuizResult::invalid_time_range("Time range is too long (maximum 100 years)".to_string());
        }

        // 检查用户是否认证
        if self.runtime.authenticated_signer().is_none() {
            return QuizResult::unauthorized();
        }
        
        let quiz_id = *self.state.next_quiz_id.get();
        let creator = params.nick_name.clone();

        // 验证问题和选项
        for (i, q) in params.questions.iter().enumerate() {
            if q.text.trim().is_empty() {
                return QuizResult::invalid_input(format!("Question {} text cannot be empty", i + 1));
            }
            
            if q.options.len() < 2 {
                return QuizResult::invalid_input(format!("Question {} must have at least 2 options", i + 1));
            }
            
            if q.correct_options.is_empty() {
                return QuizResult::invalid_input(format!("Question {} must have at least one correct option", i + 1));
            }
            
            for (j, option) in q.options.iter().enumerate() {
                if option.trim().is_empty() {
                    return QuizResult::invalid_input(format!("Question {} option {} text cannot be empty", i + 1, j + 1));
                }
            }
        }

        let quiz_set = QuizSet {
            id: quiz_id,
            title: params.title,
            description: params.description,
            creator,
            questions: params
                .questions
                .into_iter()
                .enumerate()
                .map(|(i, q)| Question {
                    id: i as u32,
                    text: q.text,
                    options: q.options,
                    correct_options: q.correct_options,
                    points: q.points,
                })
                .collect(),
            time_limit: params.time_limit,
            start_time,
            end_time,
            created_at: current_time,
        };

        // 存储新Quiz
        if let Err(e) = self.state.quiz_sets.insert(&quiz_id, quiz_set) {
            return QuizResult::storage_error(format!("Failed to store quiz: {:?}", e));
        }
        
        // 更新下一个Quiz ID
        let next_id = match quiz_id.checked_add(1) {
            Some(id) => id,
            None => return QuizResult::other_error("Quiz ID overflow".to_string()),
        };
        
        self.state.next_quiz_id.set(next_id);
        
        QuizResult::success(())
    }

    async fn submit_answers(&mut self, params: SubmitAnswersParams) -> QuizResult<()> {
        let user = params.nick_name.clone();

        let quiz_id = params.quiz_id;
        let now = self.runtime.system_time();

        // 检查Quiz是否存在
        let quiz_set = match self.state.quiz_sets.get(&quiz_id).await {
            Ok(Some(quiz)) => quiz,
            Ok(None) => return QuizResult::quiz_not_found(quiz_id),
            Err(e) => return QuizResult::storage_error(format!("Failed to retrieve quiz: {:?}", e)),
        };

        // 检查测验时间范围
        if now < quiz_set.start_time {
            return QuizResult::quiz_not_started(quiz_id);
        }
        
        if now > quiz_set.end_time {
            return QuizResult::quiz_ended(quiz_id);
        }

        // 检查用户是否已提交过该Quiz
        match self.state.user_attempts.get(&(quiz_id, user.clone())).await {
            Ok(Some(_)) => return QuizResult::already_submitted(user, quiz_id),
            Ok(None) => (),
            Err(e) => return QuizResult::storage_error(format!("Failed to check user attempt: {:?}", e)),
        }

        // 验证答案数量是否匹配问题数量
        if params.answers.len() != quiz_set.questions.len() {
            return QuizResult::invalid_answer_format(
                format!("Answer count mismatch: expected {} answers, got {}", quiz_set.questions.len(), params.answers.len())
            );
        }

        // 验证答案格式
        for (i, user_answers) in params.answers.iter().enumerate() {
            let question = &quiz_set.questions[i];
            
            // 检查是否有重复答案
            let mut unique_answers = user_answers.clone();
            unique_answers.sort();
            unique_answers.dedup();
            
            if unique_answers.len() != user_answers.len() {
                return QuizResult::invalid_answer_format(
                    format!("Question {} has duplicate answers", i + 1)
                );
            }
            
            // 检查答案索引是否有效
            for &answer_index in user_answers {
                if answer_index as usize >= question.options.len() {
                    return QuizResult::invalid_answer_format(
                        format!("Question {} has invalid answer index: {}", i + 1, answer_index)
                    );
                }
            }
        }

        // 计算得分
        let mut score = 0;
        for (i, user_answers) in params.answers.iter().enumerate() {
            let question = &quiz_set.questions[i];

            // 检查用户选择的答案是否与所有正确选项完全匹配（顺序无关）
            let mut user_answers_sorted = user_answers.clone();
            user_answers_sorted.sort();
            let mut correct_options_sorted = question.correct_options.clone();
            correct_options_sorted.sort();

            if user_answers_sorted == correct_options_sorted {
                score += question.points;
            }
        }

        // 创建答题记录
        let attempt = UserAttempt {
            quiz_id,
            user: user.clone(),
            answers: params.answers,
            score,
            time_taken: params.time_taken,
            completed_at: now,
        };

        // 存储答题记录
        if let Err(e) = self.state.user_attempts.insert(&(quiz_id, user.clone()), attempt.clone()) {
            return QuizResult::storage_error(format!("Failed to store user attempt: {:?}", e));
        }
        
        // 记录答题事件
        self.state.quiz_events.push(attempt);

        // 记录用户参与
        let participations = match self.state.user_participations.get(&user).await {
            Ok(Some(parts)) => parts.to_vec(),
            Ok(None) => Vec::new(),
            Err(e) => return QuizResult::storage_error(format!("Failed to get user participations: {:?}", e)),
        };
        
        let mut new_participations = participations;
        if !new_participations.contains(&quiz_id) {
            new_participations.push(quiz_id);
        }
        
        if let Err(e) = self.state.user_participations.insert(&user, new_participations) {
            return QuizResult::storage_error(format!("Failed to update user participations: {:?}", e));
        }

        // 更新排行榜
        self.update_leaderboard(quiz_id, user, score).await
    }

    async fn update_leaderboard(&mut self, quiz_id: u64, user: String, score: u32) -> QuizResult<()> {
        // 这里简单实现一个排行榜更新逻辑
        // 实际项目中可能需要更复杂的排序和存储策略
        let mut entries = match self.state.leaderboard.get(&quiz_id).await {
            Ok(Some(leaderboard)) => leaderboard,
            Ok(None) => Vec::new(),
            Err(e) => return QuizResult::storage_error(format!("Failed to get leaderboard: {:?}", e)),
        };

        // 查找用户是否已有条目
        let existing_index = entries.iter().position(|entry| entry.user == user);

        if let Some(index) = existing_index {
            // 更新现有条目
            entries[index].score = score;
        } else {
            // 添加新条目
            entries.push(LeaderboardEntry {
                user,
                score,
                time_taken: 0, // 这里可以从attempt中获取time_taken
            });
        }

        // 按分数排序（从高到低）
        entries.sort_by(|a, b| b.score.cmp(&a.score));

        // 保存更新后的排行榜
        if let Err(e) = self.state.leaderboard.insert(&quiz_id, entries) {
            return QuizResult::storage_error(format!("Failed to update leaderboard: {:?}", e));
        }
        
        QuizResult::success(())
    }
}
