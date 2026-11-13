use serde::{Deserialize, Serialize};

/// Phase of an interactive step. Polls go through `POLL_PHASES`, game rounds through `GAME_PHASES`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Phase {
    Waiting,
    Open,
    Closed,
    Revealed,
    Intro,
    Playing,
    Heatmap,
    Leaderboard,
}

pub const POLL_PHASES: &[Phase] = &[Phase::Waiting, Phase::Open, Phase::Closed, Phase::Revealed];
pub const GAME_PHASES: &[Phase] = &[
    Phase::Intro,
    Phase::Playing,
    Phase::Heatmap,
    Phase::Revealed,
    Phase::Leaderboard,
];

impl Phase {
    pub fn is_revealed(&self) -> bool {
        matches!(self, Phase::Revealed | Phase::Leaderboard)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Theme {
    Part1,
    Part2,
}

/// Who a socket is, stored in its extensions once it joined.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Role {
    Player(String),
    Screen,
    Host,
}
