#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{Request, Response, Schema};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{ChainId, WithServiceAbi};
use linera_sdk::views::View;
use linera_sdk::{Service, ServiceRuntime};
use log::{error, info};
use quiz::state::{QuizEvent as InternalQuizEvent, QuizState};
use quiz::LeaderboardEntry;
use quiz::QuizParticipation;
use quiz::{
    Operation, QuestionView, QuizAttempt, QuizEvent, QuizSetView, UserAttemptView, UserView,
};
use std::sync::Arc;

linera_sdk::service!(QuizService);

pub struct QuizService {
    state: Arc<QuizState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

struct QueryRoot {
    state: Arc<QuizState>,
}

#[async_graphql::Object]
impl QueryRoot {
    async fn quiz_set(&self, quiz_id: u64) -> Option<QuizSetView> {
        info!("Querying quiz_set with ID: {}", quiz_id);
        match self.state.quiz_sets.get(&quiz_id).await {
            Ok(option) => {
                info!("Quiz_set {} found: {}", quiz_id, option.is_some());
                option.map(|quiz| {
                    let mode_str = match quiz.mode {
                        quiz::state::QuizMode::Public => "public",
                        quiz::state::QuizMode::Registration => "registration",
                    };
                    let start_mode_str = match quiz.start_mode {
                        quiz::state::QuizStartMode::Auto => "auto",
                        quiz::state::QuizStartMode::Manual => "manual",
                    };
                    QuizSetView {
                        id: quiz.id,
                        title: quiz.title.clone(),
                        description: quiz.description.clone(),
                        creator: quiz.creator,
                        creator_nickname: quiz.creator_nickname.clone(),
                        questions: quiz
                            .questions
                            .iter()
                            .map(|q| QuestionView {
                                id: q.id.clone(),
                                text: q.text.clone(),
                                options: q.options.clone(),
                                points: q.points,
                                question_type: q.question_type.clone(),
                            })
                            .collect(),
                        start_time: quiz.start_time.micros().to_string(),
                        end_time: quiz.end_time.micros().to_string(),
                        created_at: quiz.created_at.micros().to_string(),
                        mode: mode_str.to_string(),
                        start_mode: start_mode_str.to_string(),
                        is_started: quiz.is_started,
                        registered_users: quiz.registered_users.clone(),
                        participant_count: quiz.participant_count,
                    }
                })
            }
            Err(e) => {
                error!("Failed to query quiz_set {}: {:?}", quiz_id, e);
                None
            }
        }
    }

    async fn quiz_sets(
        &self,
        limit: Option<u32>,
        offset: Option<u32>,
        sort_by: Option<String>,
        sort_direction: Option<quiz::SortDirection>,
    ) -> Vec<QuizSetView> {
        info!(
            "Fetching quiz_sets with limit: {:?}, offset: {:?}",
            limit, offset
        );
        let mut quiz_sets = Vec::new();

        let _ = self
            .state
            .quiz_sets
            .for_each_index_value(|_key, quiz| {
                let quiz = quiz.into_owned();
                let mode_str = match quiz.mode {
                    quiz::state::QuizMode::Public => "public",
                    quiz::state::QuizMode::Registration => "registration",
                };
                let start_mode_str = match quiz.start_mode {
                    quiz::state::QuizStartMode::Auto => "auto",
                    quiz::state::QuizStartMode::Manual => "manual",
                };
                let quiz_view = QuizSetView {
                    id: quiz.id,
                    title: quiz.title.clone(),
                    description: quiz.description.clone(),
                    creator: quiz.creator,
                    creator_nickname: quiz.creator_nickname.clone(),
                    questions: quiz
                        .questions
                        .iter()
                        .map(|q| QuestionView {
                            id: q.id.clone(),
                            text: q.text.clone(),
                            options: q.options.clone(),
                            points: q.points,
                            question_type: q.question_type.clone(),
                        })
                        .collect(),
                    start_time: quiz.start_time.micros().to_string(),
                    end_time: quiz.end_time.micros().to_string(),
                    created_at: quiz.created_at.micros().to_string(),
                    mode: mode_str.to_string(),
                    start_mode: start_mode_str.to_string(),
                    is_started: quiz.is_started,
                    registered_users: quiz.registered_users.clone(),
                    participant_count: quiz.participant_count,
                };
                quiz_sets.push(quiz_view);
                Ok(())
            })
            .await;

        info!(
            "Fetched {} quiz_sets before sorting and pagination",
            quiz_sets.len()
        );
        // 排序
        if let Some(sort_by) = sort_by {
            let direction = sort_direction.unwrap_or(quiz::SortDirection::Asc);
            info!("Sorting quiz_sets by {} {:?}", sort_by, direction);
            match sort_by.as_str() {
                "id" => quiz_sets.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.id.cmp(&b.id),
                    quiz::SortDirection::Desc => b.id.cmp(&a.id),
                }),
                "title" => quiz_sets.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.title.cmp(&b.title),
                    quiz::SortDirection::Desc => b.title.cmp(&a.title),
                }),
                "created_at" => quiz_sets.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.created_at.cmp(&b.created_at),
                    quiz::SortDirection::Desc => b.created_at.cmp(&a.created_at),
                }),
                _ => info!("No valid sort_by parameter: {}", sort_by),
            }
        }

        // 分页
        let start = offset.unwrap_or(0) as usize;
        let end = if let Some(limit) = limit {
            (start + limit as usize).min(quiz_sets.len())
        } else {
            quiz_sets.len()
        };
        info!(
            "Returning quiz_sets from index {} to {} (total: {})
",
            start,
            end,
            quiz_sets.len()
        );

        quiz_sets[start..end].to_vec()
    }

    async fn user_attempts(
        &self,
        user: String,
        limit: Option<u32>,
        offset: Option<u32>,
        sort_by: Option<String>,
        sort_direction: Option<quiz::SortDirection>,
    ) -> Vec<QuizAttempt> {
        info!(
            "Fetching user_attempts for user: {}, limit: {:?}, offset: {:?}",
            user, limit, offset
        );
        let mut attempts = Vec::new();

        let _ = self
            .state
            .user_attempts
            .for_each_index_value(|(quiz_id, u), attempt| {
                if u == user {
                    let attempt = attempt.into_owned();
                    let attempt_view = UserAttemptView {
                        quiz_id: attempt.quiz_id,
                        user: attempt.user,
                        nickname: attempt.nickname,
                        answers: attempt.answers,
                        score: attempt.score,
                        time_taken: attempt.time_taken,
                        completed_at: attempt.completed_at.micros().to_string(),
                    };
                    attempts.push(QuizAttempt {
                        quiz_id,
                        attempt: attempt_view,
                    });
                    info!("Found attempt for user {} in quiz {}", user, quiz_id);
                }
                Ok(())
            })
            .await;

        info!(
            "Fetched {} attempts for user before sorting and pagination",
            attempts.len()
        );
        // 排序
        if let Some(sort_by) = sort_by {
            let direction = sort_direction.unwrap_or(quiz::SortDirection::Asc);
            info!("Sorting attempts by {} {:?}", sort_by, direction);
            match sort_by.as_str() {
                "quiz_id" => attempts.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.quiz_id.cmp(&b.quiz_id),
                    quiz::SortDirection::Desc => b.quiz_id.cmp(&a.quiz_id),
                }),
                "score" => attempts.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.attempt.score.cmp(&b.attempt.score),
                    quiz::SortDirection::Desc => b.attempt.score.cmp(&a.attempt.score),
                }),
                "completed_at" => attempts.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.attempt.completed_at.cmp(&b.attempt.completed_at),
                    quiz::SortDirection::Desc => {
                        b.attempt.completed_at.cmp(&a.attempt.completed_at)
                    }
                }),
                "time_taken" => attempts.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.attempt.time_taken.cmp(&b.attempt.time_taken),
                    quiz::SortDirection::Desc => b.attempt.time_taken.cmp(&a.attempt.time_taken),
                }),
                _ => info!("No valid sort_by parameter: {}", sort_by),
            }
        }

        // 分页
        let start = offset.unwrap_or(0) as usize;
        let end = if let Some(limit) = limit {
            (start + limit as usize).min(attempts.len())
        } else {
            attempts.len()
        };
        info!(
            "Returning attempts from index {} to {} (total: {})
",
            start,
            end,
            attempts.len()
        );

        attempts[start..end].to_vec()
    }

    async fn quiz_leaderboard(&self, quiz_id: u64) -> Vec<LeaderboardEntry> {
        info!("Fetching leaderboard for quiz ID: {}", quiz_id);
        let mut entries = Vec::new();

        let _ = self
            .state
            .user_attempts
            .for_each_index_value(|(q_id, user), attempt| {
                if q_id == quiz_id {
                    let attempt = attempt.into_owned();
                    entries.push(LeaderboardEntry {
                        user: attempt.user.clone(),
                        nickname: attempt.nickname.clone(),
                        score: attempt.score,
                        time_taken: attempt.time_taken,
                        completed_at: attempt.completed_at.micros().to_string(),
                    });
                    info!(
                        "Added leaderboard entry for user {} in quiz {}",
                        user, quiz_id
                    );
                }
                Ok(())
            })
            .await;

        // 按分数降序排序，分数相同则按完成时间升序
        entries.sort_by(|a, b| {
            b.score
                .cmp(&a.score)
                .then_with(|| a.time_taken.cmp(&b.time_taken))
        });
        info!(
            "Leaderboard for quiz {} sorted with {} entries",
            quiz_id,
            entries.len()
        );

        entries
    }

    async fn user_participations(&self, user: String) -> Vec<QuizParticipation> {
        info!("Fetching participations for user: {}", user);
        let mut participations = Vec::new();
        let participation_map = self.state.user_participations.get(&user);
        if let Some(map) = participation_map {
            let entries: Vec<_> = map.iter().collect();
            for (quiz_id, _) in entries {
                if let Ok(Some(quiz)) = self.state.quiz_sets.get(quiz_id).await {
                    participations.push(QuizParticipation {
                        quiz_id: *quiz_id,
                        quiz_title: quiz.title.clone(),
                        participated_at: chrono::Utc::now().to_string(),
                    });
                }
            }
        }
        info!(
            "Found {} participations for user {}",
            participations.len(),
            user
        );
        participations
    }

    async fn user(&self, address: String) -> Option<UserView> {
        info!("Fetching user profile for address: {}", address);
        match self.state.users.get(&address).await {
            Ok(option) => {
                info!("User profile found for {}: {}", address, option.is_some());
                option.map(|user| UserView {
                    address: user.address.clone(),
                    wallet_address: user.wallet_address.clone(),
                    nickname: user.nickname.clone(),
                    created_at: user.created_at.clone(),
                })
            }
            Err(e) => {
                error!("Failed to fetch user profile {}: {:?}", address, e);
                None
            }
        }
    }

    async fn user_by_nickname(&self, nickname: String) -> Option<UserView> {
        info!("Searching for user with nickname: {}", nickname);
        let mut found_user = None;

        let _ = self
            .state
            .users
            .for_each_index_value(|wallet_address, user| {
                if user.nickname == nickname {
                    found_user = Some(UserView {
                        wallet_address: user.wallet_address.clone(),
                        nickname: user.nickname.clone(),
                        created_at: user.created_at.micros().to_string(),
                    });
                    info!("Found user with nickname {}: {}", nickname, wallet_address);
                }
                Ok(())
            })
            .await;

        found_user
    }

    async fn get_quiz_participants(&self, quiz_id: u64) -> Vec<String> {
        info!("Fetching participants for quiz ID: {}", quiz_id);
        match self.state.quiz_sets.get(&quiz_id).await {
            Ok(Some(quiz)) => {
                let participants = quiz.registered_users.clone();
                info!(
                    "Found {} participants for quiz {}",
                    participants.len(),
                    quiz_id
                );
                participants
            }
            Ok(None) => {
                info!("Quiz {} not found when fetching participants", quiz_id);
                Vec::new()
            }
            Err(e) => {
                error!("Failed to fetch participants for quiz {}: {:?}", quiz_id, e);
                Vec::new()
            }
        }
    }

    async fn is_user_participated(&self, quiz_id: u64, user: String) -> bool {
        info!("Checking participation: user {} in quiz {}", user, quiz_id);
        let mut participated = false;

        let _ = self
            .state
            .user_attempts
            .for_each_index_value(|(q_id, u), _| {
                if q_id == quiz_id && u == user {
                    participated = true;
                    info!("User {} has participated in quiz {}", user, quiz_id);
                }
                Ok(())
            })
            .await;

        participated
    }

    async fn get_user_created_quizzes(&self, creator: String) -> Vec<QuizSetView> {
        info!("Fetching created quizzes for creator: {}", creator);
        let mut quizzes = Vec::new();

        let _ = self
            .state
            .quiz_sets
            .for_each_index_value(|_id, quiz| {
                let quiz = quiz.into_owned();
                if quiz.creator == creator {
                    let mode_str = match quiz.mode {
                        quiz::state::QuizMode::Public => "public",
                        quiz::state::QuizMode::Registration => "registration",
                    };
                    let start_mode_str = match quiz.start_mode {
                        quiz::state::QuizStartMode::Auto => "auto",
                        quiz::state::QuizStartMode::Manual => "manual",
                    };
                    quizzes.push(QuizSetView {
                        id: quiz.id,
                        title: quiz.title.clone(),
                        description: quiz.description.clone(),
                        creator: quiz.creator,
                        creator_nickname: quiz.creator_nickname.clone(),
                        questions: quiz
                            .questions
                            .iter()
                            .map(|q| QuestionView {
                                id: q.id.clone(),
                                text: q.text.clone(),
                                options: q.options.clone(),
                                points: q.points,
                                question_type: q.question_type.clone(),
                            })
                            .collect(),
                        start_time: quiz.start_time.micros().to_string(),
                        end_time: quiz.end_time.micros().to_string(),
                        created_at: quiz.created_at.micros().to_string(),
                        mode: mode_str.to_string(),
                        start_mode: start_mode_str.to_string(),
                        is_started: quiz.is_started,
                        registered_users: quiz.registered_users.clone(),
                        participant_count: quiz.participant_count,
                    });
                    info!("Added created quiz {} by creator {}", quiz.id, creator);
                }
                Ok(())
            })
            .await;

        // 按创建时间降序排序
        quizzes.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        info!(
            "Found {} created quizzes for creator {}",
            quizzes.len(),
            creator
        );

        quizzes
    }

    async fn get_user_participated_quizzes(
        &self,
        wallet_address: String,
        _limit: Option<u32>,
        _offset: Option<u32>,
        _sort_by: Option<String>,
        _sort_direction: Option<quiz::SortDirection>,
    ) -> Vec<QuizSetView> {
        let mut participated_quizzes = Vec::new();
        let quiz_ids = self
            .state
            .user_participations
            .get(&wallet_address)
            .await
            .unwrap_or_default();
        for &quiz_id in &quiz_ids {
            if let Some(quiz_set) = self.state.quiz_sets.get(&quiz_id).await.unwrap() {
                let mode_str = match quiz_set.mode {
                    quiz::state::QuizMode::Public => "public",
                    quiz::state::QuizMode::Registration => "registration",
                };
                let start_mode_str = match quiz_set.start_mode {
                    quiz::state::QuizStartMode::Auto => "auto",
                    quiz::state::QuizStartMode::Manual => "manual",
                };
                participated_quizzes.push(QuizSetView {
                    id: quiz_set.id,
                    title: quiz_set.title.clone(),
                    description: quiz_set.description.clone(),
                    creator: quiz_set.creator.clone(),
                    creator_nickname: quiz_set.creator_nickname.clone(),
                    questions: quiz_set
                        .questions
                        .iter()
                        .map(|q| QuestionView {
                            id: q.id.clone(),
                            text: q.text.clone(),
                            options: q.options.clone(),
                            points: q.points,
                            question_type: q.question_type.clone(),
                        })
                        .collect(),
                    start_time: quiz_set.start_time.micros().to_string(),
                    end_time: quiz_set.end_time.micros().to_string(),
                    created_at: quiz_set.created_at.micros().to_string(),
                    mode: mode_str.to_string(),
                    start_mode: start_mode_str.to_string(),
                    is_started: quiz_set.is_started,
                    registered_users: quiz_set.registered_users.clone(),
                    participant_count: quiz_set.participant_count,
                });
            }
        }

        // 排序
        if let Some(sort_by) = _sort_by {
            let direction = _sort_direction.unwrap_or(quiz::SortDirection::Asc);
            match sort_by.as_str() {
                "id" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.id.cmp(&b.id),
                    quiz::SortDirection::Desc => b.id.cmp(&a.id),
                }),
                "title" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.title.cmp(&b.title),
                    quiz::SortDirection::Desc => b.title.cmp(&a.title),
                }),
                "created_at" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.created_at.cmp(&b.created_at),
                    quiz::SortDirection::Desc => b.created_at.cmp(&a.created_at),
                }),
                _ => {} // 默认不排序
            }
        }

        // 分页
        let start = _offset.unwrap_or(0) as usize;
        let end = if let Some(limit) = _limit {
            (start + limit as usize).min(participated_quizzes.len())
        } else {
            participated_quizzes.len()
        };

        participated_quizzes[start..end].to_vec()
    }
}

struct SubscriptionRoot {
    state: Arc<QuizState>,
}

#[async_graphql::Subscription]
impl SubscriptionRoot {
    async fn notifications(
        &self,
        #[graphql(name = "chainId")] _chain_id: ChainId,
    ) -> impl futures::Stream<Item = QuizEvent> {
        let state = self.state.clone();
        futures::stream::unfold(0, move |last_index| {
            let state = state.clone();
            async move {
                // 获取事件总数
                let total_count = state.app_events.count() as usize;

                if total_count > last_index {
                    // 获取指定索引的事件
                    let event = match state.app_events.get(last_index).await {
                        Ok(Some(event)) => event,
                        _ => return None,
                    };

                    // 转换事件类型
                    let converted_event = match event {
                        InternalQuizEvent::QuizCreated(quiz_set) => {
                            // 转换为QuizSetView
                            let mode_str = match quiz_set.mode {
                                quiz::state::QuizMode::Public => "public",
                                quiz::state::QuizMode::Registration => "registration",
                            };
                            let start_mode_str = match quiz_set.start_mode {
                                quiz::state::QuizStartMode::Auto => "auto",
                                quiz::state::QuizStartMode::Manual => "manual",
                            };
                            let quiz_set_view = QuizSetView {
                                id: quiz_set.id,
                                title: quiz_set.title.clone(),
                                description: quiz_set.description.clone(),
                                creator: quiz_set.creator,
                                creator_nickname: quiz_set.creator_nickname.clone(),
                                questions: quiz_set
                                    .questions
                                    .iter()
                                    .map(|q| QuestionView {
                                        id: q.id.clone(),
                                        text: q.text.clone(),
                                        options: q.options.clone(),
                                        points: q.points,
                                        question_type: q.question_type.clone(),
                                    })
                                    .collect(),
                                start_time: quiz_set.start_time.micros().to_string(),
                                end_time: quiz_set.end_time.micros().to_string(),
                                created_at: quiz_set.created_at.micros().to_string(),
                                mode: mode_str.to_string(),
                                start_mode: start_mode_str.to_string(),
                                is_started: quiz_set.is_started,
                                registered_users: quiz_set.registered_users.clone(),
                                participant_count: quiz_set.participant_count,
                            };
                            QuizEvent::QuizCreated(quiz_set_view)
                        }
                        InternalQuizEvent::AnswerSubmitted(attempt) => {
                            // 转换为UserAttemptView
                            let attempt_view = UserAttemptView {
                                quiz_id: attempt.quiz_id,
                                user: attempt.user,
                                nickname: attempt.nickname,
                                answers: attempt.answers,
                                score: attempt.score,
                                time_taken: attempt.time_taken,
                                completed_at: attempt.completed_at.micros().to_string(),
                            };
                            QuizEvent::AnswerSubmitted(attempt_view)
                        }
                    };

                    // 返回事件和新的索引
                    Some((converted_event, last_index + 1))
                } else {
                    // 没有新事件，等待后重试
                    futures::future::ready(()).await;
                    // 返回一个空事件继续下一次迭代
                    Some((
                        QuizEvent::AnswerSubmitted(UserAttemptView {
                            quiz_id: 0,
                            user: "".to_string(),
                            nickname: "".to_string(),
                            answers: Vec::new(),
                            score: 0,
                            time_taken: 0,
                            completed_at: "".to_string(),
                        }),
                        last_index,
                    ))
                }
            }
        })
    }
}

impl WithServiceAbi for QuizService {
    type Abi = quiz::QuizAbi;
}

impl Service for QuizService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = QuizState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load QuizState");
        QuizService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            Operation::mutation_root(self.runtime.clone()),
            SubscriptionRoot {
                state: self.state.clone(),
            },
        )
        .finish();
        schema.execute(request).await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct UserView {
    wallet_address: String,
    nickname: String,
    created_at: String,
}

    async fn get_user_profile(
        &self,
        wallet_address: String,
    ) -> Option<UserView> {
        info!("Fetching profile for user: {}", wallet_address);
        if let Some(user) = self.state.users.get(&wallet_address).await.unwrap() {
            Some(UserView {
                wallet_address: user.wallet_address.clone(),
                nickname: user.nickname.clone(),
                created_at: user.created_at.micros().to_string(),
            })
        } else {
            info!("User {} not found", wallet_address);
            None
        }
    }

    async fn user_by_nickname(&self, nickname: String) -> Option<UserView> {
        info!("Searching for user with nickname: {}", nickname);
        let mut found_user = None;

        let _ = self
            .state
            .users
            .for_each_index_value(|wallet_address, user| {
                if user.nickname == nickname {
                    found_user = Some(UserView {
                        wallet_address: user.wallet_address.clone(),
                        nickname: user.nickname.clone(),
                        created_at: user.created_at.micros().to_string(),
                    });
                    info!("Found user with nickname {}: {}", nickname, wallet_address);
                }
                Ok(())
            })
            .await;

        found_user
    }

    async fn get_quiz_participants(&self, quiz_id: u64) -> Vec<String> {
        info!("Fetching participants for quiz ID: {}", quiz_id);
        match self.state.quiz_sets.get(&quiz_id).await {
            Ok(Some(quiz)) => {
                let participants = quiz.registered_users.clone();
                info!(
                    "Found {} participants for quiz {}",
                    participants.len(),
                    quiz_id
                );
                participants
            }
            Ok(None) => {
                info!("Quiz {} not found when fetching participants", quiz_id);
                Vec::new()
            }
            Err(e) => {
                error!("Failed to fetch participants for quiz {}: {:?}", quiz_id, e);
                Vec::new()
            }
        }
    }

    async fn is_user_participated(&self, quiz_id: u64, user: String) -> bool {
        info!("Checking participation: user {} in quiz {}", user, quiz_id);
        let mut participated = false;

        let _ = self
            .state
            .user_attempts
            .for_each_index_value(|(q_id, u), _| {
                if q_id == quiz_id && u == user {
                    participated = true;
                    info!("User {} has participated in quiz {}", user, quiz_id);
                }
                Ok(())
            })
            .await;

        participated
    }

    async fn get_user_created_quizzes(&self, creator: String) -> Vec<QuizSetView> {
        info!("Fetching created quizzes for creator: {}", creator);
        let mut quizzes = Vec::new();

        let _ = self
            .state
            .quiz_sets
            .for_each_index_value(|_id, quiz| {
                let quiz = quiz.into_owned();
                if quiz.creator == creator {
                    let mode_str = match quiz.mode {
                        quiz::state::QuizMode::Public => "public",
                        quiz::state::QuizMode::Registration => "registration",
                    };
                    let start_mode_str = match quiz.start_mode {
                        quiz::state::QuizStartMode::Auto => "auto",
                        quiz::state::QuizStartMode::Manual => "manual",
                    };
                    quizzes.push(QuizSetView {
                        id: quiz.id,
                        title: quiz.title.clone(),
                        description: quiz.description.clone(),
                        creator: quiz.creator,
                        creator_nickname: quiz.creator_nickname.clone(),
                        questions: quiz
                            .questions
                            .iter()
                            .map(|q| QuestionView {
                                id: q.id.clone(),
                                text: q.text.clone(),
                                options: q.options.clone(),
                                points: q.points,
                                question_type: q.question_type.clone(),
                            })
                            .collect(),
                        start_time: quiz.start_time.micros().to_string(),
                        end_time: quiz.end_time.micros().to_string(),
                        created_at: quiz.created_at.micros().to_string(),
                        mode: mode_str.to_string(),
                        start_mode: start_mode_str.to_string(),
                        is_started: quiz.is_started,
                        registered_users: quiz.registered_users.clone(),
                        participant_count: quiz.participant_count,
                    });
                    info!("Added created quiz {} by creator {}", quiz.id, creator);
                }
                Ok(())
            })
            .await;

        // 按创建时间降序排序
        quizzes.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        info!(
            "Found {} created quizzes for creator {}",
            quizzes.len(),
            creator
        );

        quizzes
    }

    async fn get_user_participated_quizzes(
        &self,
        wallet_address: String,
        _limit: Option<u32>,
        _offset: Option<u32>,
        _sort_by: Option<String>,
        _sort_direction: Option<quiz::SortDirection>,
    ) -> Vec<QuizSetView> {
        let mut participated_quizzes = Vec::new();
        let quiz_ids = self
            .state
            .user_participations
            .get(&wallet_address)
            .await
            .unwrap_or_default();
        for &quiz_id in &quiz_ids {
            if let Some(quiz_set) = self.state.quiz_sets.get(&quiz_id).await.unwrap() {
                let mode_str = match quiz_set.mode {
                    quiz::state::QuizMode::Public => "public",
                    quiz::state::QuizMode::Registration => "registration",
                };
                let start_mode_str = match quiz_set.start_mode {
                    quiz::state::QuizStartMode::Auto => "auto",
                    quiz::state::QuizStartMode::Manual => "manual",
                };
                participated_quizzes.push(QuizSetView {
                    id: quiz_set.id,
                    title: quiz_set.title.clone(),
                    description: quiz_set.description.clone(),
                    creator: quiz_set.creator.clone(),
                    creator_nickname: quiz_set.creator_nickname.clone(),
                    questions: quiz_set
                        .questions
                        .iter()
                        .map(|q| QuestionView {
                            id: q.id.clone(),
                            text: q.text.clone(),
                            options: q.options.clone(),
                            points: q.points,
                            question_type: q.question_type.clone(),
                        })
                        .collect(),
                    start_time: quiz_set.start_time.micros().to_string(),
                    end_time: quiz_set.end_time.micros().to_string(),
                    created_at: quiz_set.created_at.micros().to_string(),
                    mode: mode_str.to_string(),
                    start_mode: start_mode_str.to_string(),
                    is_started: quiz_set.is_started,
                    registered_users: quiz_set.registered_users.clone(),
                    participant_count: quiz_set.participant_count,
                });
            }
        }

        // 排序
        if let Some(sort_by) = _sort_by {
            let direction = _sort_direction.unwrap_or(quiz::SortDirection::Asc);
            match sort_by.as_str() {
                "id" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.id.cmp(&b.id),
                    quiz::SortDirection::Desc => b.id.cmp(&a.id),
                }),
                "title" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.title.cmp(&b.title),
                    quiz::SortDirection::Desc => b.title.cmp(&a.title),
                }),
                "created_at" => participated_quizzes.sort_by(|a, b| match direction {
                    quiz::SortDirection::Asc => a.created_at.cmp(&b.created_at),
                    quiz::SortDirection::Desc => b.created_at.cmp(&a.created_at),
                }),
                _ => {} // 默认不排序
            }
        }

        // 分页
        let start = _offset.unwrap_or(0) as usize;
        let end = if let Some(limit) = _limit {
            (start + limit as usize).min(participated_quizzes.len())
        } else {
            participated_quizzes.len()
        };

        participated_quizzes[start..end].to_vec()
    }
}

struct SubscriptionRoot {
    state: Arc<QuizState>,
}

#[async_graphql::Subscription]
impl SubscriptionRoot {
    async fn notifications(
        &self,
        #[graphql(name = "chainId")] _chain_id: ChainId,
    ) -> impl futures::Stream<Item = QuizEvent> {
        let state = self.state.clone();
        futures::stream::unfold(0, move |last_index| {
            let state = state.clone();
            async move {
                // 获取事件总数
                let total_count = state.app_events.count() as usize;

                if total_count > last_index {
                    // 获取指定索引的事件
                    let event = match state.app_events.get(last_index).await {
                        Ok(Some(event)) => event,
                        _ => return None,
                    };

                    // 转换事件类型
                    let converted_event = match event {
                        InternalQuizEvent::QuizCreated(quiz_set) => {
                            // 转换为QuizSetView
                            let mode_str = match quiz_set.mode {
                                quiz::state::QuizMode::Public => "public",
                                quiz::state::QuizMode::Registration => "registration",
                            };
                            let start_mode_str = match quiz_set.start_mode {
                                quiz::state::QuizStartMode::Auto => "auto",
                                quiz::state::QuizStartMode::Manual => "manual",
                            };
                            let quiz_set_view = QuizSetView {
                                id: quiz_set.id,
                                title: quiz_set.title.clone(),
                                description: quiz_set.description.clone(),
                                creator: quiz_set.creator,
                                creator_nickname: quiz_set.creator_nickname.clone(),
                                questions: quiz_set
                                    .questions
                                    .iter()
                                    .map(|q| QuestionView {
                                        id: q.id.clone(),
                                        text: q.text.clone(),
                                        options: q.options.clone(),
                                        points: q.points,
                                        question_type: q.question_type.clone(),
                                    })
                                    .collect(),
                                start_time: quiz_set.start_time.micros().to_string(),
                                end_time: quiz_set.end_time.micros().to_string(),
                                created_at: quiz_set.created_at.micros().to_string(),
                                mode: mode_str.to_string(),
                                start_mode: start_mode_str.to_string(),
                                is_started: quiz_set.is_started,
                                registered_users: quiz_set.registered_users.clone(),
                                participant_count: quiz_set.participant_count,
                            };
                            QuizEvent::QuizCreated(quiz_set_view)
                        }
                        InternalQuizEvent::AnswerSubmitted(attempt) => {
                            // 转换为UserAttemptView
                            let attempt_view = UserAttemptView {
                                quiz_id: attempt.quiz_id,
                                user: attempt.user,
                                nickname: attempt.nickname,
                                answers: attempt.answers,
                                score: attempt.score,
                                time_taken: attempt.time_taken,
                                completed_at: attempt.completed_at.micros().to_string(),
                            };
                            QuizEvent::AnswerSubmitted(attempt_view)
                        }
                    };

                    // 返回事件和新的索引
                    Some((converted_event, last_index + 1))
                } else {
                    // 没有新事件，等待后重试
                    futures::future::ready(()).await;
                    // 返回一个空事件继续下一次迭代
                    Some((
                        QuizEvent::AnswerSubmitted(UserAttemptView {
                            quiz_id: 0,
                            user: "".to_string(),
                            nickname: "".to_string(),
                            answers: Vec::new(),
                            score: 0,
                            time_taken: 0,
                            completed_at: "".to_string(),
                        }),
                        last_index,
                    ))
                }
            }
        })
    }
}

impl WithServiceAbi for QuizService {
    type Abi = quiz::QuizAbi;
}

impl Service for QuizService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = QuizState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load QuizState");
        QuizService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            Operation::mutation_root(self.runtime.clone()),
            SubscriptionRoot {
                state: self.state.clone(),
            },
        )
        .finish();
        schema.execute(request).await
    }
}