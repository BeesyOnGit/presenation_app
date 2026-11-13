use crate::features::content::model::Talk;
use crate::features::session::model::Session;
use once_cell::sync::OnceCell;
use socketioxide::SocketIo;
use std::{
    path::PathBuf,
    sync::{Mutex, MutexGuard},
};
use tokio::sync::Notify;

pub struct AppState {
    pub talk: Talk,
    // ponytail: one global lock, fine for ~100 players; shard per step if it ever shows in the profile
    pub session: Mutex<Session>,
    pub io: SocketIo,
    pub host_pin: String,
    pub snapshot_path: PathBuf,
    /// Woken on every state change; the broadcaster coalesces bursts into one `state` push
    pub changed: Notify,
}

pub static APP_STATE: OnceCell<AppState> = OnceCell::new();

/// Set once in `main` before the server starts.
pub fn app() -> &'static AppState {
    APP_STATE.get().expect("APP_STATE is set at startup")
}

/// The live session. Never hold it across an `.await`.
pub fn session() -> MutexGuard<'static, Session> {
    app().session.lock().unwrap_or_else(|e| e.into_inner())
}

/// Schedules a `state` broadcast to every client.
pub fn changed() {
    app().changed.notify_one();
}
