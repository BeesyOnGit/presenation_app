use crate::config::enums::Phase;
use presentation_api::utils::{
    general::generate_room_code,
    scoring::{Lock, RoundScore},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    time::Instant,
};

/// All live state of the talk. Serialized as is to the snapshot file.
#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub room: String,
    pub current_step: usize,
    /// By player id
    pub players: HashMap<String, Player>,
    /// Tokens of players the host removed; they can't come back with them
    pub removed_tokens: HashSet<String>,
    /// By step id; absent = never visited (or reset)
    pub steps: HashMap<String, StepState>,
    pub questions: Vec<Question>,
    pub highlighted_question: Option<u64>,
    /// Unix ms the host first left the lobby, for the talk clock
    #[serde(default)]
    pub talk_started_at: Option<i64>,
    /// Unix ms the current step was entered, for its time budget
    #[serde(default)]
    pub step_started_at: Option<i64>,
    /// Ms spent on each step id, added when the host leaves it
    #[serde(default)]
    pub step_time: HashMap<String, i64>,
    /// Open sockets per player id
    #[serde(skip)]
    pub online: HashMap<String, usize>,
    /// When each player asked their recent questions (3 per minute)
    #[serde(skip)]
    pub asked: HashMap<String, Vec<Instant>>,
}

impl Session {
    pub fn new() -> Self {
        Session {
            room: generate_room_code(),
            current_step: 0,
            players: HashMap::new(),
            removed_tokens: HashSet::new(),
            steps: HashMap::new(),
            questions: vec![],
            highlighted_question: None,
            talk_started_at: None,
            step_started_at: None,
            step_time: HashMap::new(),
            online: HashMap::new(),
            asked: HashMap::new(),
        }
    }

    pub fn is_online(&self, player_id: &str) -> bool {
        self.online.get(player_id).is_some_and(|n| *n > 0)
    }

    pub fn online_count(&self) -> usize {
        self.players.keys().filter(|id| self.is_online(id)).count()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    /// Secret kept in the phone's localStorage to come back after a refresh
    pub token: String,
    pub nickname: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct StepState {
    pub phase: Option<Phase>,
    /// Poll: option id by player id
    pub answers: HashMap<String, String>,
    /// Game round: locks by player id
    pub locks: HashMap<String, Vec<Lock>>,
    /// Unix ms; play starts after the 3 s countdown
    pub round_started_at: Option<i64>,
    pub round_ends_at: Option<i64>,
    /// Filled when the round ends, counted in totals from the reveal on
    pub results: HashMap<String, RoundScore>,
}

impl StepState {
    pub fn new(phase: Phase) -> Self {
        StepState {
            phase: Some(phase),
            ..Default::default()
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Question {
    pub id: u64,
    pub text: String,
    /// Player ids, one upvote each; the author isn't stored
    pub voters: HashSet<String>,
    pub hidden: bool,
}
