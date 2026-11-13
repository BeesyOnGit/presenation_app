//! What each role sees. Players and the big screen never get an answer before its reveal.

use super::model::{Session, StepState};
use super::service::{Standing, current_step, is_done, standings};
use crate::config::enums::Phase;
use crate::features::content::model::{HOST_KEYS, Poll, Round, SECRET_KEYS, Step, StepKind, Talk};
use serde_json::{Map, Value, json};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Audience {
    Player,
    Screen,
    Host,
}

fn public_step(step: &Step, revealed: bool) -> Value {
    let mut v = serde_json::to_value(step).unwrap_or_default();
    if let Some(o) = v.as_object_mut() {
        let secret = if revealed { &[][..] } else { SECRET_KEYS };
        for key in HOST_KEYS.iter().chain(secret) {
            o.remove(*key);
        }
    }
    v
}

/// Answers per option id.
fn counts(s: &Session, step_id: &str) -> Map<String, Value> {
    let mut out = Map::new();
    for option in s.steps.get(step_id).into_iter().flat_map(|st| st.answers.values()) {
        let n = out.get(option).and_then(Value::as_u64).unwrap_or(0);
        out.insert(option.clone(), json!(n + 1));
    }
    out
}

fn poll_block(s: &Session, step_id: &str, poll: &Poll, show_counts: bool, revealed: bool) -> Value {
    json!({
        "answerCount": s.steps.get(step_id).map_or(0, |st| st.answers.len()),
        "counts": show_counts.then(|| counts(s, step_id)),
        "correctOptionId": if revealed { poll.correct_option_id.as_deref() } else { None },
    })
}

/// Top `n` after the first `upto` steps, with places gained since the step before.
fn top(talk: &Talk, s: &Session, upto: usize, n: usize) -> Vec<Value> {
    let before = standings(talk, s, upto.saturating_sub(1));
    let rank_before = |id: &str| before.iter().position(|r| r.player_id == id).unwrap_or(0) as i64 + 1;
    standings(talk, s, upto)
        .iter()
        .take(n)
        .enumerate()
        .map(|(i, row)| {
            json!({
                "rank": i + 1,
                "nickname": s.players[&row.player_id].nickname,
                "score": row.score,
                "change": rank_before(&row.player_id) - (i as i64 + 1),
            })
        })
        .collect()
}

fn pct(part: usize, total: usize) -> usize {
    (part * 100 + total / 2).checked_div(total).unwrap_or(0)
}

fn game_block(talk: &Talk, s: &Session, round: &Round, st: &StepState, who: Audience) -> Value {
    let mut g = json!({
        "roundStartedAt": st.round_started_at,
        "roundEndsAt": st.round_ends_at,
        "lockedCount": st.locks.values().filter(|l| is_done(round, l)).count(),
    });
    let Some(phase) = st.phase.filter(|p| !matches!(p, Phase::Intro | Phase::Playing)) else {
        return g;
    };
    // Heatmap on
    let answered = st.locks.len();
    let mut element_counts = Map::new();
    for id in st.locks.values().flatten().filter_map(|l| l.element.as_ref()) {
        let n = element_counts.get(id).and_then(Value::as_u64).unwrap_or(0);
        element_counts.insert(id.clone(), json!(n + 1));
    }
    g["answered"] = json!(answered);
    g["noneCount"] = json!(st.locks.values().filter(|l| l.iter().any(|l| l.element.is_none())).count());
    g["elementCounts"] = Value::Object(element_counts);
    if who != Audience::Player {
        let taps: Vec<[f64; 2]> = st.locks.values().flatten().filter_map(|l| Some([l.x?, l.y?])).collect();
        g["taps"] = json!(taps);
    }
    if phase.is_revealed() {
        let correct = st.results.values().filter(|r| r.correct).count();
        g["correctPct"] = json!(pct(correct, answered));
        g["fooledPct"] = json!(pct(answered - correct, answered));
    }
    if phase == Phase::Leaderboard {
        g["leaderboard"] = json!(top(talk, s, s.current_step + 1, 5));
    }
    g
}

/// The part of `state` shared by everyone of one audience.
pub fn common_view(talk: &Talk, s: &Session, who: Audience, now: i64) -> Value {
    let step = current_step(talk, s);
    let st = s.steps.get(&step.id);
    let phase = st.and_then(|st| st.phase);
    let revealed = phase.is_none_or(|p| p.is_revealed());

    let mut questions: Vec<_> = s.questions.iter().filter(|q| who == Audience::Host || !q.hidden).collect();
    questions.sort_by(|a, b| b.voters.len().cmp(&a.voters.len()).then(a.id.cmp(&b.id)));
    let questions: Vec<Value> = questions
        .iter()
        .map(|q| json!({ "id": q.id, "text": q.text, "votes": q.voters.len(), "hidden": q.hidden }))
        .collect();

    let mut v = json!({
        "room": s.room,
        "stepIndex": s.current_step,
        "stepCount": talk.steps.len(),
        "step": public_step(step, revealed),
        "phase": phase,
        "serverNow": now,
        "playerCount": s.online_count(),
        "questions": questions,
        "highlightedQuestionId": s.highlighted_question,
    });

    match &step.kind {
        StepKind::Poll(poll) | StepKind::Compare { poll, .. } => {
            let show = match who {
                Audience::Host => true,
                Audience::Screen => revealed || !poll.hide_results,
                Audience::Player => revealed,
            };
            v["poll"] = poll_block(s, &step.id, poll, show, revealed);
            if let StepKind::Compare { before_poll_id, .. } = &step.kind {
                v["before"] = json!({ "counts": counts(s, before_poll_id) });
            }
        }
        StepKind::Reveal { poll_id } => {
            if let Some(poll) = talk.step(poll_id).and_then(Step::poll) {
                v["poll"] = poll_block(s, poll_id, poll, true, true);
                v["pollStep"] = public_step(talk.step(poll_id).expect("validated"), true);
            }
            v["dependencyCount"] = json!(talk.dependency_count);
        }
        StepKind::GameRound(round) => {
            if let Some(st) = st {
                v["game"] = game_block(talk, s, round, st, who);
            }
        }
        StepKind::Leaderboard => v["leaderboard"] = json!(top(talk, s, s.current_step, 10)),
        StepKind::Lobby => {
            let names: Vec<&str> = s.players.values().map(|p| p.nickname.as_str()).collect();
            v["lobby"] = json!(names);
        }
        StepKind::Slide | StepKind::Qna => {}
    }

    if who == Audience::Host {
        v["fullStep"] = json!(step);
        v["nextStep"] = json!(talk.steps.get(s.current_step + 1).map(|n| &n.title));
        // Every step for the host's outline; `done` = its poll or round already has a result
        let outline: Vec<Value> = talk
            .steps
            .iter()
            .map(|st| {
                let phase = s.steps.get(&st.id).and_then(|x| x.phase);
                json!({
                    "title": st.title,
                    "type": st.kind_name(),
                    "phase": phase,
                    "budgetSec": st.budget_sec,
                    "spentMs": s.step_time.get(&st.id).copied().unwrap_or(0),
                })
            })
            .collect();
        v["outline"] = json!(outline);
        v["talkStartedAt"] = json!(s.talk_started_at);
        v["stepStartedAt"] = json!(s.step_started_at);
        let table = standings(talk, s, talk.steps.len());
        let players: Vec<Value> = table
            .iter()
            .map(|row| {
                json!({
                    "id": row.player_id,
                    "nickname": s.players[&row.player_id].nickname,
                    "score": row.score,
                    "online": s.is_online(&row.player_id),
                })
            })
            .collect();
        v["players"] = json!(players);
    }
    v
}

/// Payload of `game:result`, also kept in `state.me.result` after the reveal.
pub fn game_result(s: &Session, step: &Step, round: &Round, player_id: &str, table: &[Standing]) -> Value {
    let r = s
        .steps
        .get(&step.id)
        .and_then(|st| st.results.get(player_id))
        .cloned()
        .unwrap_or_default();
    json!({
        "stepId": step.id,
        "points": r.points,
        "correct": r.correct,
        "correctElementIds": round.answers.concat(),
        "rank": table.iter().position(|row| row.player_id == player_id).map(|i| i + 1),
        "total": table.len(),
    })
}

/// `common` (built for `Audience::Player`) plus the player's own data under `me`.
pub fn player_view(talk: &Talk, s: &Session, player_id: &str, table: &[Standing], mut common: Value) -> Value {
    let Some(p) = s.players.get(player_id) else {
        return common;
    };
    let step = current_step(talk, s);
    let st = s.steps.get(&step.id);
    let poll_id = match &step.kind {
        StepKind::Reveal { poll_id } => poll_id.as_str(),
        _ => step.id.as_str(),
    };
    let answer = s.steps.get(poll_id).and_then(|st| st.answers.get(player_id));
    let locks: Vec<&str> = st
        .and_then(|st| st.locks.get(player_id))
        .map(|l| l.iter().map(|l| l.element.as_deref().unwrap_or("none")).collect())
        .unwrap_or_default();
    let result = match (step.round(), st.and_then(|st| st.phase)) {
        (Some(round), Some(phase)) if phase.is_revealed() => game_result(s, step, round, player_id, table),
        _ => Value::Null,
    };
    let upvoted: Vec<u64> = s.questions.iter().filter(|q| q.voters.contains(player_id)).map(|q| q.id).collect();
    let row = table.iter().position(|r| r.player_id == player_id);

    common["me"] = json!({
        "playerId": p.id,
        "nickname": p.nickname,
        "score": row.map_or(0, |i| table[i].score),
        "rank": row.map(|i| i + 1),
        "total": table.len(),
        "answer": answer,
        "locks": locks,
        "result": result,
        "upvoted": upvoted,
    });
    common
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::content::service::load_talk;
    use std::path::Path;

    #[test]
    fn notes_only_reach_the_host() {
        let talk = load_talk(Path::new("content/talk.json")).unwrap();
        let s = Session::new();
        for who in [Audience::Player, Audience::Screen] {
            let v = common_view(&talk, &s, who, 0);
            assert!(v["step"].get("notes").is_none());
            assert!(v.get("outline").is_none());
        }
        let host = common_view(&talk, &s, Audience::Host, 0);
        assert!(host["fullStep"].get("notes").is_some());
        let outline = host["outline"].as_array().unwrap();
        assert_eq!(outline.len(), talk.steps.len());
        assert!(outline.iter().all(|o| o["budgetSec"].as_u64().is_some_and(|b| b > 0)), "every step has a budget");
    }
}
