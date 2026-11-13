//! Every change to the session. Pure over `&mut Session`: no sockets, no clock reads except `now` args.

use super::model::{Player, Question, Session, StepState};
use crate::config::enums::Phase;
use crate::features::content::model::{Round, Step, Talk};
use presentation_api::utils::{
    general::generate_rand_str,
    scoring::{Lock, add_points, score_round},
};
use std::time::{Duration, Instant};

pub type Res<T> = Result<T, String>;

/// Error of a join with a token the host removed; the phone shows "host removed you".
pub const REMOVED: &str = "removed";
pub const COUNTDOWN_MS: i64 = 3_000;
pub const GRACE_MS: i64 = 500;
const NICKNAME_MAX: usize = 16;
const QUESTION_MAX: usize = 200;
const QUESTIONS_PER_MINUTE: usize = 3;
// ponytail: substring list, catches the obvious; the host can still rename or remove
const PROFANITY: &[&str] = &[
    "fuck", "shit", "bitch", "cunt", "nigg", "faggot", "asshole", "whore", "slut", "nazi",
    "merde", "salope", "connard", "encul",
];

pub fn current_step<'a>(talk: &'a Talk, s: &Session) -> &'a Step {
    &talk.steps[s.current_step]
}

// ---- Players ----

pub fn clean_nickname(raw: &str) -> Res<String> {
    let n = raw.trim();
    if n.is_empty() {
        return Err("Pick a nickname".into());
    }
    if n.chars().count() > NICKNAME_MAX {
        return Err(format!("{NICKNAME_MAX} characters max"));
    }
    if n.chars().any(char::is_control) {
        return Err("Invalid characters".into());
    }
    let lower = n.to_lowercase();
    if PROFANITY.iter().any(|w| lower.contains(w)) {
        return Err("Pick another nickname".into());
    }
    Ok(n.to_string())
}

/// `wanted`, or `wanted2`, `wanted3`… when another player has it (case-insensitive).
fn unique_nickname(s: &Session, wanted: &str, except_id: &str) -> String {
    let taken = |n: &str| {
        let n = n.to_lowercase();
        s.players.values().any(|p| p.id != except_id && p.nickname.to_lowercase() == n)
    };
    if !taken(wanted) {
        return wanted.to_string();
    }
    (2..)
        .map(|i| {
            let suffix = i.to_string();
            let base: String = wanted.chars().take(NICKNAME_MAX - suffix.len()).collect();
            format!("{base}{suffix}")
        })
        .find(|n| !taken(n))
        .expect("infinite range")
}

/// A known token restores the player (nickname, score, answers); otherwise a new player.
pub fn join(s: &mut Session, room: &str, nickname: &str, token: Option<&str>) -> Res<Player> {
    if let Some(token) = token.filter(|t| !t.is_empty()) {
        if s.removed_tokens.contains(token) {
            return Err(REMOVED.into());
        }
        if let Some(p) = s.players.values().find(|p| p.token == token) {
            return Ok(p.clone());
        }
    }
    if !room.trim().eq_ignore_ascii_case(&s.room) {
        return Err("Room not found".into());
    }
    let nickname = unique_nickname(s, &clean_nickname(nickname)?, "");
    let player = Player {
        id: generate_rand_str(12),
        token: generate_rand_str(32),
        nickname,
    };
    s.players.insert(player.id.clone(), player.clone());
    Ok(player)
}

pub fn rename_player(s: &mut Session, player_id: &str, nickname: &str) -> Res<()> {
    let nickname = unique_nickname(s, &clean_nickname(nickname)?, player_id);
    let p = s.players.get_mut(player_id).ok_or("Unknown player")?;
    p.nickname = nickname;
    Ok(())
}

pub fn remove_player(s: &mut Session, player_id: &str) -> Res<()> {
    let p = s.players.remove(player_id).ok_or("Unknown player")?;
    s.removed_tokens.insert(p.token);
    s.online.remove(player_id);
    Ok(())
}

// ---- Polls ----

pub fn answer_poll(talk: &Talk, s: &mut Session, player_id: &str, step_id: &str, option_id: &str) -> Res<()> {
    let step = current_step(talk, s);
    let poll = step.poll().filter(|_| step.id == step_id).ok_or("This poll is not open")?;
    let st = s.steps.entry(step.id.clone()).or_default();
    if st.phase != Some(Phase::Open) {
        return Err("This poll is not open".into());
    }
    if !poll.options.iter().any(|o| o.id == option_id) {
        return Err("Unknown option".into());
    }
    if st.answers.contains_key(player_id) {
        return Err("Already answered".into());
    }
    st.answers.insert(player_id.to_string(), option_id.to_string());
    Ok(())
}

// ---- Game ----

/// The player has used all their locks (or said "No pattern here").
pub fn is_done(round: &Round, locks: &[Lock]) -> bool {
    locks.len() >= round.max_selections || locks.iter().any(|l| l.element.is_none())
}

fn end_round(round: &Round, st: &mut StepState) {
    let rules = round.rules();
    st.results = st
        .locks
        .iter()
        .map(|(id, locks)| (id.clone(), score_round(&rules, locks)))
        .collect();
    st.phase = Some(Phase::Heatmap);
}

/// Records a lock. `Ok(true)` when it was the last online player and the round ended.
#[allow(clippy::too_many_arguments)]
pub fn lock(
    talk: &Talk,
    s: &mut Session,
    player_id: &str,
    step_id: &str,
    element_id: &str,
    x: Option<f64>,
    y: Option<f64>,
    now: i64,
) -> Res<bool> {
    let step = current_step(talk, s);
    let round = step.round().filter(|_| step.id == step_id).ok_or("This round is not running")?;
    let st = s.steps.entry(step.id.clone()).or_default();
    if st.phase != Some(Phase::Playing) {
        return Err("This round is not running".into());
    }
    let (start, end) = (st.round_started_at.unwrap_or(0), st.round_ends_at.unwrap_or(0));
    if now < start {
        return Err("The round hasn't started".into());
    }
    if now > end + GRACE_MS {
        return Err("Time's up".into());
    }
    if [x, y].into_iter().flatten().any(|v| !(0.0..=1.0).contains(&v)) {
        return Err("x and y must be between 0 and 1".into());
    }
    let element = match element_id {
        "none" => None,
        id if round.elements.iter().any(|e| e.id == id) => Some(id.to_string()),
        _ => return Err("Unknown element".into()),
    };

    let locks = st.locks.entry(player_id.to_string()).or_default();
    if is_done(round, locks) {
        return Err("Already locked in".into());
    }
    if element.is_none() && !locks.is_empty() {
        return Err("You already locked an element".into());
    }
    if element.is_some() && locks.iter().any(|l| l.element == element) {
        return Err("Already locked this element".into());
    }
    locks.push(Lock {
        element,
        x,
        y,
        elapsed: (now - start) as f64 / 1000.0,
    });

    let online: Vec<&String> = s.players.keys().filter(|id| s.online.get(*id).is_some_and(|n| *n > 0)).collect();
    let everyone_done = !online.is_empty()
        && online.iter().all(|id| st.locks.get(*id).is_some_and(|l| is_done(round, l)));
    if everyone_done {
        end_round(round, st);
    }
    Ok(everyone_done)
}

/// Called by the round timer: ends the round if it's still the same play.
pub fn timeout_round(talk: &Talk, s: &mut Session, step_id: &str, started_at: i64) -> bool {
    let (Some(round), Some(st)) = (talk.step(step_id).and_then(Step::round), s.steps.get_mut(step_id)) else {
        return false;
    };
    if st.phase != Some(Phase::Playing) || st.round_started_at != Some(started_at) {
        return false;
    }
    end_round(round, st);
    true
}

// ---- Host: navigation and phases ----

fn init_step(talk: &Talk, s: &mut Session) {
    let step = current_step(talk, s);
    if let Some(phases) = step.phases() {
        s.steps.entry(step.id.clone()).or_insert_with(|| StepState::new(phases[0]));
    }
}

/// Moves to a step; a finished poll or round keeps its result.
pub fn goto(talk: &Talk, s: &mut Session, index: usize, now: i64) -> Res<()> {
    if index >= talk.steps.len() {
        return Err("No such step".into());
    }
    if index != s.current_step {
        if let Some(start) = s.step_started_at {
            let left = current_step(talk, s).id.clone();
            *s.step_time.entry(left).or_default() += (now - start).max(0);
        }
        s.step_started_at = Some(now);
    }
    if index > 0 && s.talk_started_at.is_none() {
        s.talk_started_at = Some(now);
    }
    s.current_step = index;
    init_step(talk, s);
    Ok(())
}

/// Wipes the current step's answers and starts it over.
pub fn reset_step(talk: &Talk, s: &mut Session) {
    let id = current_step(talk, s).id.clone();
    s.steps.remove(&id);
    init_step(talk, s);
}

/// Moves the current step forward to `target`, skipping phases if needed.
pub fn set_phase(talk: &Talk, s: &mut Session, target: Phase, now: i64) -> Res<StepStateTimes> {
    let step = current_step(talk, s);
    let phases = step.phases().ok_or("This step has no phases")?;
    let st = s.steps.entry(step.id.clone()).or_insert_with(|| StepState::new(phases[0]));
    let cur = st.phase.unwrap_or(phases[0]);
    let pos = |p: Phase| phases.iter().position(|x| *x == p);
    let target_pos = pos(target).ok_or("Not a phase of this step")?;
    if target_pos <= pos(cur).unwrap_or(0) {
        return Err("Phases only move forward; use Reset step to start over".into());
    }
    if let Some(round) = step.round() {
        if target == Phase::Leaderboard && !round.scored {
            return Err("The debate round has no leaderboard".into());
        }
        if target == Phase::Playing {
            let start = now + COUNTDOWN_MS;
            st.round_started_at = Some(start);
            st.round_ends_at = Some(start + round.duration_sec as i64 * 1000);
        } else if matches!(cur, Phase::Intro | Phase::Playing) {
            end_round(round, st);
        }
    }
    st.phase = Some(target);
    Ok(StepStateTimes {
        step_id: step.id.clone(),
        started_at: st.round_started_at,
        ends_at: st.round_ends_at,
    })
}

/// What the controller needs to arm the round timer after `set_phase`.
pub struct StepStateTimes {
    pub step_id: String,
    pub started_at: Option<i64>,
    pub ends_at: Option<i64>,
}

pub fn end_session(s: &mut Session) {
    *s = Session::new();
}

// ---- Scores ----

pub struct Standing {
    pub player_id: String,
    pub score: i64,
    /// Seconds spent on correct answers, the tie-break (faster wins)
    pub time: f64,
}

/// Every player's total over the revealed rounds among the first `upto` steps, best first.
pub fn standings(talk: &Talk, s: &Session, upto: usize) -> Vec<Standing> {
    let mut table: Vec<Standing> = s
        .players
        .keys()
        .map(|id| Standing { player_id: id.clone(), score: 0, time: 0.0 })
        .collect();
    for step in talk.steps.iter().take(upto) {
        let Some(st) = s.steps.get(&step.id).filter(|_| step.round().is_some()) else {
            continue;
        };
        if !st.phase.is_some_and(|p| p.is_revealed()) {
            continue;
        }
        for row in &mut table {
            if let Some(r) = st.results.get(&row.player_id) {
                row.score = add_points(row.score, r.points);
                row.time += r.correct_time;
            }
        }
    }
    let nick = |id: &str| s.players[id].nickname.to_lowercase();
    table.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then(a.time.total_cmp(&b.time))
            .then_with(|| nick(&a.player_id).cmp(&nick(&b.player_id)))
    });
    table
}

// ---- Q&A ----

pub fn ask(s: &mut Session, player_id: &str, text: &str, now: Instant) -> Res<()> {
    let text = text.trim();
    if text.is_empty() {
        return Err("Type a question".into());
    }
    if text.chars().count() > QUESTION_MAX {
        return Err(format!("{QUESTION_MAX} characters max"));
    }
    let recent = s.asked.entry(player_id.to_string()).or_default();
    recent.retain(|t| now.duration_since(*t) < Duration::from_secs(60));
    if recent.len() >= QUESTIONS_PER_MINUTE {
        return Err("Max 3 questions per minute".into());
    }
    recent.push(now);
    s.questions.push(Question {
        id: s.questions.len() as u64 + 1,
        text: text.to_string(),
        voters: Default::default(),
        hidden: false,
    });
    Ok(())
}

pub fn upvote(s: &mut Session, player_id: &str, question_id: u64) -> Res<()> {
    let q = s
        .questions
        .iter_mut()
        .find(|q| q.id == question_id && !q.hidden)
        .ok_or("Unknown question")?;
    if !q.voters.insert(player_id.to_string()) {
        return Err("Already upvoted".into());
    }
    Ok(())
}

pub fn moderate(s: &mut Session, question_id: u64, action: &str) -> Res<()> {
    let q = s.questions.iter_mut().find(|q| q.id == question_id).ok_or("Unknown question")?;
    match action {
        "hide" => q.hidden = true,
        "show" => q.hidden = false,
        "highlight" => s.highlighted_question = Some(question_id),
        "unhighlight" => s.highlighted_question = None,
        _ => return Err("Unknown action".into()),
    }
    if s.highlighted_question == Some(question_id) && action == "hide" {
        s.highlighted_question = None;
    }
    Ok(())
}

// ---- Export ----

/// Anonymized poll results: one row per option.
pub fn export_csv(talk: &Talk, s: &Session) -> String {
    let cell = |v: &str| format!("\"{}\"", v.replace('"', "\"\""));
    let mut out = String::from("step,question,option,votes\n");
    for step in &talk.steps {
        let Some(poll) = step.poll() else { continue };
        let answers = s.steps.get(&step.id).map(|st| &st.answers);
        for o in &poll.options {
            let votes = answers.map_or(0, |a| a.values().filter(|v| **v == o.id).count());
            out += &format!("{},{},{},{votes}\n", cell(&step.id), cell(&poll.question), cell(&o.label));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::content::service::load_talk;
    use std::path::Path;

    fn setup() -> (Talk, Session, String) {
        let talk = load_talk(Path::new("content/talk.json")).unwrap();
        let mut s = Session::new();
        let room = s.room.clone();
        let p = join(&mut s, &room, "Ada", None).unwrap();
        s.online.insert(p.id.clone(), 1);
        (talk, s, p.id)
    }
    fn index(talk: &Talk, id: &str) -> usize {
        talk.steps.iter().position(|s| s.id == id).unwrap()
    }

    #[test]
    fn nicknames() {
        let (_, mut s, _) = setup();
        let room = s.room.clone();
        assert_eq!(join(&mut s, &room, " ada ", None).unwrap().nickname, "ada2");
        assert!(join(&mut s, "ZZZZ", "Bob", None).is_err());
        assert!(join(&mut s, &room, "12345678901234567", None).is_err());
        assert!(join(&mut s, &room, "Shithead", None).is_err());
        let p = join(&mut s, &room, "Bob", None).unwrap();
        assert_eq!(join(&mut s, "", "", Some(&p.token)).unwrap().id, p.id);
        remove_player(&mut s, &p.id).unwrap();
        assert_eq!(join(&mut s, &room, "Bob", Some(&p.token)).unwrap_err(), REMOVED);
    }

    #[test]
    fn poll_flow() {
        let (talk, mut s, pid) = setup();
        goto(&talk, &mut s, index(&talk, "knight-cause"), 0).unwrap();
        assert!(answer_poll(&talk, &mut s, &pid, "knight-cause", "typo").is_err()); // waiting
        set_phase(&talk, &mut s, Phase::Open, 0).unwrap();
        assert!(answer_poll(&talk, &mut s, &pid, "knight-cause", "nope").is_err());
        answer_poll(&talk, &mut s, &pid, "knight-cause", "typo").unwrap();
        assert!(answer_poll(&talk, &mut s, &pid, "knight-cause", "hacker").is_err());
        set_phase(&talk, &mut s, Phase::Revealed, 0).unwrap();
        assert!(set_phase(&talk, &mut s, Phase::Open, 0).is_err());
        // Going away and back keeps the result
        goto(&talk, &mut s, 0, 0).unwrap();
        goto(&talk, &mut s, index(&talk, "knight-cause"), 0).unwrap();
        assert_eq!(s.steps["knight-cause"].phase, Some(Phase::Revealed));
        reset_step(&talk, &mut s);
        assert_eq!(s.steps["knight-cause"].phase, Some(Phase::Waiting));
        assert!(s.steps["knight-cause"].answers.is_empty());
    }

    #[test]
    fn round_flow_and_scores() {
        let (talk, mut s, pid) = setup();
        goto(&talk, &mut s, index(&talk, "round-1"), 0).unwrap();
        let t = set_phase(&talk, &mut s, Phase::Playing, 0).unwrap();
        let start = t.started_at.unwrap();
        assert!(lock(&talk, &mut s, &pid, "round-1", "urgency-banner", None, None, start - 1).is_err());
        // Only online player locks in: round ends right away, 15 s → 100 + 25
        assert!(lock(&talk, &mut s, &pid, "round-1", "urgency-banner", Some(0.5), Some(0.2), start + 15_000).unwrap());
        assert_eq!(s.steps["round-1"].phase, Some(Phase::Heatmap));
        assert_eq!(standings(&talk, &s, talk.steps.len())[0].score, 0); // not revealed yet
        set_phase(&talk, &mut s, Phase::Revealed, 0).unwrap();
        assert_eq!(standings(&talk, &s, talk.steps.len())[0].score, 125);

        // Debate round: no leaderboard phase
        goto(&talk, &mut s, index(&talk, "round-7"), 0).unwrap();
        set_phase(&talk, &mut s, Phase::Playing, 0).unwrap();
        set_phase(&talk, &mut s, Phase::Revealed, 0).unwrap();
        assert!(set_phase(&talk, &mut s, Phase::Leaderboard, 0).is_err());

        // Bonus round: two locks, then done
        goto(&talk, &mut s, index(&talk, "round-8"), 0).unwrap();
        let start = set_phase(&talk, &mut s, Phase::Playing, 0).unwrap().started_at.unwrap();
        assert!(!lock(&talk, &mut s, &pid, "round-8", "continue-cancelling", None, None, start + 1000).unwrap());
        assert!(lock(&talk, &mut s, &pid, "round-8", "continue-cancelling", None, None, start + 2000).is_err());
        assert!(lock(&talk, &mut s, &pid, "round-8", "double-negative", None, None, start + 30_000).unwrap());
        assert!(lock(&talk, &mut s, &pid, "round-8", "keep-plan", None, None, start + 30_100).is_err());
        set_phase(&talk, &mut s, Phase::Revealed, 0).unwrap();
        assert_eq!(standings(&talk, &s, talk.steps.len())[0].score, 325);
    }

    #[test]
    fn timer_ends_only_its_own_play() {
        let (talk, mut s, _) = setup();
        goto(&talk, &mut s, index(&talk, "round-2"), 0).unwrap();
        let start = set_phase(&talk, &mut s, Phase::Playing, 0).unwrap().started_at.unwrap();
        assert!(!timeout_round(&talk, &mut s, "round-2", start + 1));
        assert!(timeout_round(&talk, &mut s, "round-2", start));
        assert_eq!(s.steps["round-2"].phase, Some(Phase::Heatmap));
    }

    #[test]
    fn step_time_adds_up_across_visits() {
        let (talk, mut s, _) = setup();
        goto(&talk, &mut s, 1, 1_000).unwrap();
        goto(&talk, &mut s, 2, 3_500).unwrap();
        goto(&talk, &mut s, 1, 4_000).unwrap();
        goto(&talk, &mut s, 1, 9_000).unwrap(); // same step: clock keeps running
        goto(&talk, &mut s, 2, 5_000 + 4_000).unwrap();
        assert_eq!(s.step_time[&talk.steps[1].id], 2_500 + 5_000);
        assert_eq!(s.step_time[&talk.steps[2].id], 500);
        assert_eq!(s.talk_started_at, Some(1_000));
    }

    #[test]
    fn qna_limits() {
        let (_, mut s, pid) = setup();
        let now = Instant::now();
        for _ in 0..3 {
            ask(&mut s, &pid, "Why?", now).unwrap();
        }
        assert!(ask(&mut s, &pid, "Why?", now).is_err());
        assert!(ask(&mut s, "other", &"x".repeat(201), now).is_err());
        upvote(&mut s, &pid, 1).unwrap();
        assert!(upvote(&mut s, &pid, 1).is_err());
        moderate(&mut s, 1, "hide").unwrap();
        assert!(upvote(&mut s, "other", 1).is_err());
    }
}
