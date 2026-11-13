//! Shape of `content/talk.json`. Field names are camelCase in the file and on the wire.

use crate::config::enums::{GAME_PHASES, POLL_PHASES, Phase, Theme};
use presentation_api::utils::scoring::RoundRules;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Talk {
    /// Real dependency count of the team's project, shown at the left-pad reveal
    pub dependency_count: u32,
    pub steps: Vec<Step>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
    pub id: String,
    /// Shown on the big screen and as the step name on /host
    pub title: String,
    /// Markdown
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    pub theme: Theme,
    /// Phone text while this step is on (default on the client: "Watch the big screen")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    /// Speaker notes, markdown; only the host ever receives them
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub notes: String,
    /// Planned seconds on this step, for the host's timer
    #[serde(default, rename = "budgetSec", skip_serializing_if = "Option::is_none")]
    pub budget_sec: Option<u32>,
    #[serde(flatten)]
    pub kind: StepKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case", rename_all_fields = "camelCase")]
pub enum StepKind {
    Lobby,
    Slide,
    Poll(Poll),
    /// Shows the result of `poll_id` with its correct answer
    Reveal { poll_id: String },
    GameRound(Round),
    Leaderboard,
    /// A poll shown next to the result of an earlier one
    Compare {
        #[serde(flatten)]
        poll: Poll,
        before_poll_id: String,
    },
    Qna,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Choice {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Poll {
    pub question: String,
    pub options: Vec<Choice>,
    /// None = opinion poll
    #[serde(default)]
    pub correct_option_id: Option<String>,
    /// Answers are never sent by name anyway; kept for the client's wording
    #[serde(default)]
    pub anonymous: bool,
    /// Big screen shows only the answer count until the reveal
    #[serde(default)]
    pub hide_results: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Round {
    pub round: u32,
    pub product: String,
    /// Name of the fake screen component in `client/src/screens/`
    pub screen_component: String,
    pub context: String,
    /// Tappable zones (`data-zone` ids)
    pub elements: Vec<Choice>,
    /// One entry per pattern to find; any id in an entry counts. Empty = clean screen.
    pub answers: Vec<Vec<String>>,
    #[serde(default = "one")]
    pub max_selections: usize,
    #[serde(default = "yes")]
    pub scored: bool,
    #[serde(default = "thirty")]
    pub duration_sec: u32,
    pub pattern_name: String,
    pub explanation: String,
}

fn one() -> usize {
    1
}
fn yes() -> bool {
    true
}
fn thirty() -> u32 {
    30
}

/// Keys hidden from players and the big screen until the reveal.
pub const SECRET_KEYS: &[&str] = &["correctOptionId", "answers", "patternName", "explanation"];

/// Keys never sent to players or the big screen.
pub const HOST_KEYS: &[&str] = &["notes"];

impl Talk {
    pub fn step(&self, id: &str) -> Option<&Step> {
        self.steps.iter().find(|s| s.id == id)
    }
}

impl Step {
    /// The `type` tag as written in the content file.
    pub fn kind_name(&self) -> &'static str {
        match self.kind {
            StepKind::Lobby => "lobby",
            StepKind::Slide => "slide",
            StepKind::Poll(_) => "poll",
            StepKind::Reveal { .. } => "reveal",
            StepKind::GameRound(_) => "game-round",
            StepKind::Leaderboard => "leaderboard",
            StepKind::Compare { .. } => "compare",
            StepKind::Qna => "qna",
        }
    }

    pub fn poll(&self) -> Option<&Poll> {
        match &self.kind {
            StepKind::Poll(p) | StepKind::Compare { poll: p, .. } => Some(p),
            _ => None,
        }
    }

    pub fn round(&self) -> Option<&Round> {
        match &self.kind {
            StepKind::GameRound(r) => Some(r),
            _ => None,
        }
    }

    /// The phases this step goes through; None for content-only steps.
    pub fn phases(&self) -> Option<&'static [Phase]> {
        if self.poll().is_some() {
            Some(POLL_PHASES)
        } else if self.round().is_some() {
            Some(GAME_PHASES)
        } else {
            None
        }
    }
}

impl Round {
    pub fn rules(&self) -> RoundRules<'_> {
        RoundRules {
            answers: &self.answers,
            scored: self.scored,
            duration_sec: self.duration_sec as f64,
        }
    }
}
