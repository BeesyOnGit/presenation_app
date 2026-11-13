//! Socket.IO event handlers. They check who's asking, call the service, ack, and schedule a broadcast.

use super::repository::save_snapshot;
use super::service::{self, GRACE_MS, Res, current_step, standings};
use super::view::{Audience, common_view, game_result, player_view};
use crate::config::{
    app_state::{app, changed, session},
    enums::{Phase, Role},
};
use presentation_api::utils::{general::now_ms, response::reply};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use socketioxide::{
    extract::{AckSender, SocketRef, TryData},
    ParserError,
};
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tracing::info;

const EVENTS_PER_SECOND: u32 = 10;
const PIN_FAILS_PER_MINUTE: usize = 10;

// ---- Guards ----

/// Fixed one-second window of events per socket.
#[derive(Clone, Default)]
pub struct Limiter(Arc<Mutex<(Option<Instant>, u32)>>);

fn allowed(socket: &SocketRef) -> bool {
    let Some(limiter) = socket.extensions.get::<Limiter>() else {
        return true;
    };
    let mut window = limiter.0.lock().unwrap_or_else(|e| e.into_inner());
    let now = Instant::now();
    if window.0.is_none_or(|start| now.duration_since(start) >= Duration::from_secs(1)) {
        *window = (Some(now), 0);
    }
    window.1 += 1;
    window.1 <= EVENTS_PER_SECOND
}

fn as_player(socket: &SocketRef) -> Res<String> {
    if !allowed(socket) {
        return Err("Slow down".into());
    }
    match socket.extensions.get::<Role>() {
        Some(Role::Player(id)) => Ok(id),
        _ => Err("Join first".into()),
    }
}

fn as_host(socket: &SocketRef) -> Res<()> {
    match socket.extensions.get::<Role>() {
        Some(Role::Host) => Ok(()),
        _ => Err("Host only".into()),
    }
}

fn payload<T>(data: Result<T, ParserError>) -> Res<T> {
    data.map_err(|e| format!("Invalid payload: {e}"))
}

/// Acks and, on success, schedules a broadcast.
fn done<T: Serialize>(ack: AckSender, message: &str, result: Res<T>) {
    if result.is_ok() {
        changed();
    }
    reply(ack, message, result);
}

// ---- Broadcast ----

/// Pushes `state` to every socket that joined, built for its role.
pub fn broadcast() {
    let app = app();
    let now = now_ms();
    let sockets = app.io.sockets();
    let out: Vec<(SocketRef, Value)> = {
        let s = session();
        let table = standings(&app.talk, &s, app.talk.steps.len());
        let (mut player, mut screen, mut host) = (None, None, None);
        sockets
            .into_iter()
            .filter_map(|sock| {
                let view = match sock.extensions.get::<Role>()? {
                    Role::Player(id) => {
                        let common = player.get_or_insert_with(|| common_view(&app.talk, &s, Audience::Player, now));
                        player_view(&app.talk, &s, &id, &table, common.clone())
                    }
                    Role::Screen => screen
                        .get_or_insert_with(|| common_view(&app.talk, &s, Audience::Screen, now))
                        .clone(),
                    Role::Host => host
                        .get_or_insert_with(|| common_view(&app.talk, &s, Audience::Host, now))
                        .clone(),
                };
                Some((sock, view))
            })
            .collect()
    };
    for (sock, view) in out {
        let _ = sock.emit("state", &view);
    }
}

/// Coalesces bursts of changes (100 players locking in at once) into one push every ~50 ms.
pub async fn broadcast_loop() {
    loop {
        app().changed.notified().await;
        tokio::time::sleep(Duration::from_millis(50)).await;
        broadcast();
    }
}

/// Ends the round when its time is up (plus grace), unless it already ended or restarted.
pub fn spawn_round_timer(step_id: String, started_at: i64, ends_at: i64) {
    tokio::spawn(async move {
        let wait = (ends_at + GRACE_MS - now_ms()).max(0) as u64;
        tokio::time::sleep(Duration::from_millis(wait)).await;
        let ended = service::timeout_round(&app().talk, &mut session(), &step_id, started_at);
        if ended {
            changed();
        }
    });
}

fn emit_round_results() {
    let app = app();
    let sockets = app.io.sockets();
    let out: Vec<(SocketRef, Value)> = {
        let s = session();
        let step = current_step(&app.talk, &s);
        let Some(round) = step.round() else { return };
        let table = standings(&app.talk, &s, app.talk.steps.len());
        sockets
            .into_iter()
            .filter_map(|sock| match sock.extensions.get::<Role>()? {
                Role::Player(id) if s.players.contains_key(&id) => {
                    let result = game_result(&s, step, round, &id, &table);
                    Some((sock, result))
                }
                _ => None,
            })
            .collect()
    };
    for (sock, result) in out {
        let _ = sock.emit("game:result", &result);
    }
}

/// Sockets of one player, or of every player when `player_id` is None.
fn player_sockets(player_id: Option<&str>) -> Vec<SocketRef> {
    app()
        .io
        .sockets()
        .into_iter()
        .filter(|sock| match sock.extensions.get::<Role>() {
            Some(Role::Player(id)) => player_id.is_none_or(|p| p == id),
            _ => false,
        })
        .collect()
}

// ---- Everyone ----

/// Server clock in Unix ms, for the client's clock offset.
pub async fn time_sync(ack: AckSender) {
    reply(ack, "server time", Ok(now_ms()));
}

pub async fn screen_join(socket: SocketRef, ack: AckSender) {
    socket.extensions.insert(Role::Screen);
    done(ack, "screen joined", Ok(()));
}

pub async fn on_disconnect(socket: SocketRef) {
    if let Some(Role::Player(id)) = socket.extensions.get::<Role>() {
        if let Some(n) = session().online.get_mut(&id) {
            *n = n.saturating_sub(1);
        }
        changed();
    }
}

// ---- Players ----

#[derive(Deserialize)]
pub struct JoinPayload {
    room: String,
    nickname: String,
    token: Option<String>,
}

pub async fn player_join(socket: SocketRef, ack: AckSender, TryData(data): TryData<JoinPayload>) {
    let result = (|| {
        if !allowed(&socket) {
            return Err("Slow down".into());
        }
        let p = payload(data)?;
        let mut s = session();
        let player = service::join(&mut s, &p.room, &p.nickname, p.token.as_deref())?;
        if let Some(Role::Player(old)) = socket.extensions.get::<Role>()
            && let Some(n) = s.online.get_mut(&old)
        {
            *n = n.saturating_sub(1);
        }
        *s.online.entry(player.id.clone()).or_default() += 1;
        socket.extensions.insert(Role::Player(player.id.clone()));
        Ok(json!({ "playerId": player.id, "token": player.token, "nickname": player.nickname }))
    })();
    done(ack, "joined", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PollAnswerPayload {
    step_id: String,
    option_id: String,
}

pub async fn poll_answer(socket: SocketRef, ack: AckSender, TryData(data): TryData<PollAnswerPayload>) {
    let result = (|| {
        let id = as_player(&socket)?;
        let p = payload(data)?;
        service::answer_poll(&app().talk, &mut session(), &id, &p.step_id, &p.option_id)
    })();
    done(ack, "answer sent", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockPayload {
    step_id: String,
    /// An element id, or "none" for "No pattern here"
    element_id: String,
    x: Option<f64>,
    y: Option<f64>,
}

pub async fn game_lock(socket: SocketRef, ack: AckSender, TryData(data): TryData<LockPayload>) {
    let now = now_ms();
    let result = (|| {
        let id = as_player(&socket)?;
        let p = payload(data)?;
        service::lock(&app().talk, &mut session(), &id, &p.step_id, &p.element_id, p.x, p.y, now)
            .map(|_| ())
    })();
    done(ack, "locked in", result);
}

#[derive(Deserialize)]
pub struct AskPayload {
    text: String,
}

pub async fn qna_ask(socket: SocketRef, ack: AckSender, TryData(data): TryData<AskPayload>) {
    let result = (|| {
        let id = as_player(&socket)?;
        service::ask(&mut session(), &id, &payload(data)?.text, Instant::now())
    })();
    done(ack, "question sent", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpvotePayload {
    question_id: u64,
}

pub async fn qna_upvote(socket: SocketRef, ack: AckSender, TryData(data): TryData<UpvotePayload>) {
    let result = (|| {
        let id = as_player(&socket)?;
        service::upvote(&mut session(), &id, payload(data)?.question_id)
    })();
    done(ack, "upvoted", result);
}

// ---- Host ----

#[derive(Deserialize)]
pub struct AuthPayload {
    pin: String,
}

// ponytail: global failure window, a flood of wrong PINs locks /host for a minute; use a long HOST_PIN
static PIN_FAILS: Mutex<Vec<Instant>> = Mutex::new(Vec::new());

pub async fn host_auth(socket: SocketRef, ack: AckSender, TryData(data): TryData<AuthPayload>) {
    let result = (|| {
        let p = payload(data)?;
        let mut fails = PIN_FAILS.lock().unwrap_or_else(|e| e.into_inner());
        fails.retain(|t| t.elapsed() < Duration::from_secs(60));
        if fails.len() >= PIN_FAILS_PER_MINUTE {
            return Err("Too many tries, wait a minute".into());
        }
        if p.pin != app().host_pin {
            fails.push(Instant::now());
            return Err("Wrong PIN".to_string());
        }
        socket.extensions.insert(Role::Host);
        info!("Host connected ({})", socket.id);
        Ok(())
    })();
    done(ack, "host connected", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GotoPayload {
    step_index: usize,
}

pub async fn host_goto(socket: SocketRef, ack: AckSender, TryData(data): TryData<GotoPayload>) {
    let result = (|| {
        as_host(&socket)?;
        service::goto(&app().talk, &mut session(), payload(data)?.step_index, now_ms())
    })();
    if result.is_ok() {
        tokio::spawn(save_snapshot());
    }
    done(ack, "step changed", result);
}

#[derive(Deserialize)]
pub struct PhasePayload {
    phase: Phase,
}

pub async fn host_phase(socket: SocketRef, ack: AckSender, TryData(data): TryData<PhasePayload>) {
    let mut target = None;
    let result = (|| {
        as_host(&socket)?;
        let phase = payload(data)?.phase;
        target = Some(phase);
        service::set_phase(&app().talk, &mut session(), phase, now_ms())
    })();
    if let Ok(times) = &result {
        match (target, times.started_at, times.ends_at) {
            (Some(Phase::Playing), Some(start), Some(end)) => {
                spawn_round_timer(times.step_id.clone(), start, end)
            }
            (Some(Phase::Revealed), ..) => emit_round_results(),
            _ => {}
        }
    }
    done(ack, "phase changed", result.map(|_| ()));
}

pub async fn host_reset(socket: SocketRef, ack: AckSender) {
    let result = as_host(&socket).map(|_| service::reset_step(&app().talk, &mut session()));
    done(ack, "step reset", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerActionPayload {
    player_id: String,
    /// "rename" | "remove"
    action: String,
    nickname: Option<String>,
}

pub async fn host_player(socket: SocketRef, ack: AckSender, TryData(data): TryData<PlayerActionPayload>) {
    let result = (|| {
        as_host(&socket)?;
        let p = payload(data)?;
        match p.action.as_str() {
            "rename" => service::rename_player(&mut session(), &p.player_id, p.nickname.as_deref().unwrap_or("")),
            "remove" => {
                service::remove_player(&mut session(), &p.player_id)?;
                for sock in player_sockets(Some(&p.player_id)) {
                    let _ = sock.emit("player:removed", &());
                    sock.extensions.remove::<Role>();
                    let _ = sock.disconnect();
                }
                Ok(())
            }
            _ => Err("Unknown action".into()),
        }
    })();
    done(ack, "player updated", result);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeratePayload {
    question_id: u64,
    /// "hide" | "show" | "highlight" | "unhighlight"
    action: String,
}

pub async fn host_qna(socket: SocketRef, ack: AckSender, TryData(data): TryData<ModeratePayload>) {
    let result = (|| {
        as_host(&socket)?;
        let p = payload(data)?;
        service::moderate(&mut session(), p.question_id, &p.action)
    })();
    done(ack, "question updated", result);
}

/// Wipes everything: players, answers, scores, questions. New room code.
pub async fn host_end(socket: SocketRef, ack: AckSender) {
    let result = as_host(&socket).map(|_| service::end_session(&mut session()));
    if result.is_ok() {
        for sock in player_sockets(None) {
            sock.extensions.remove::<Role>();
            let _ = sock.emit("session:ended", &());
        }
        save_snapshot().await;
        info!("Session ended and wiped");
    }
    done(ack, "session ended", result);
}

/// Anonymized poll results as CSV text in the ack.
pub async fn host_export(socket: SocketRef, ack: AckSender) {
    let result = as_host(&socket).map(|_| service::export_csv(&app().talk, &session()));
    reply(ack, "poll results", result);
}
