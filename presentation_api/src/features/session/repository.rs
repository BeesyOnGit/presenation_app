//! The JSON snapshot on disk: the session survives a server restart mid-talk.

use super::model::Session;
use crate::config::app_state::{app, session};
use std::{path::Path, time::Duration};
use tracing::{error, info, warn};

pub fn load_snapshot(path: &Path) -> Option<Session> {
    let raw = std::fs::read_to_string(path).ok()?;
    match serde_json::from_str(&raw) {
        Ok(s) => {
            info!("Session restored from {}", path.display());
            Some(s)
        }
        Err(e) => {
            warn!("Ignoring unreadable snapshot {}: {e}", path.display());
            None
        }
    }
}

/// Writes the current session (temp file + rename, so a crash never leaves half a file).
pub async fn save_snapshot() {
    let json = match serde_json::to_vec(&*session()) {
        Ok(j) => j,
        Err(e) => return error!("Snapshot serialization failed: {e}"),
    };
    let path = &app().snapshot_path;
    let tmp = path.with_extension("tmp");
    if let Some(dir) = path.parent() {
        let _ = tokio::fs::create_dir_all(dir).await;
    }
    let written = async {
        tokio::fs::write(&tmp, json).await?;
        tokio::fs::rename(&tmp, path).await
    };
    if let Err(e) = written.await {
        error!("Snapshot write to {} failed: {e}", path.display());
    }
}

pub async fn snapshot_loop() {
    let mut tick = tokio::time::interval(Duration::from_secs(5));
    loop {
        tick.tick().await;
        save_snapshot().await;
    }
}
