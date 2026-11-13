mod config;
mod features;

use axum::{Json, Router, routing::get, serve};
use config::app_state::{APP_STATE, AppState, session};
use config::enums::Phase;
use dotenvy::dotenv;
use features::content::service::load_talk;
use features::session::{
    controller::{broadcast_loop, spawn_round_timer},
    model::Session,
    repository::{load_snapshot, snapshot_loop},
    routes::on_connect,
};
use serde_json::json;
use socketioxide::SocketIo;
use std::{env, path::PathBuf, sync::Mutex};
use tokio::sync::Notify;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::{Level, error, info};
use tracing_subscriber::{EnvFilter, FmtSubscriber};

#[tokio::main]
async fn main() {
    dotenv().ok();

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("presentation_api=info,tower_http=warn,socketioxide=warn"));
    let subscriber = FmtSubscriber::builder().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let host_pin = env::var("HOST_PIN").expect("HOST_PIN must be set");
    let content_path = env::var("CONTENT_PATH").unwrap_or_else(|_| "content/talk.json".to_string());
    let snapshot_path = PathBuf::from(env::var("SNAPSHOT_PATH").unwrap_or_else(|_| "data/snapshot.json".to_string()));
    let static_dir = PathBuf::from(env::var("STATIC_DIR").unwrap_or_else(|_| "public".to_string()));

    let talk = match load_talk(content_path.as_ref()) {
        Ok(t) => t,
        Err(e) => return error!("Invalid talk content: {e}"),
    };
    let mut session_state = load_snapshot(&snapshot_path).unwrap_or_else(Session::new);
    if session_state.current_step >= talk.steps.len() {
        session_state.current_step = 0;
    }
    info!("Room code {}, {} steps", session_state.room, talk.steps.len());

    let (layer, io) = SocketIo::new_layer();
    io.ns("/", on_connect);

    let state = AppState {
        talk,
        session: Mutex::new(session_state),
        io,
        host_pin,
        snapshot_path,
        changed: Notify::new(),
    };
    if APP_STATE.set(state).is_err() {
        return error!("Failed to set APP_STATE");
    }

    // A round that was playing when the server stopped gets its timer back
    let playing: Vec<_> = session()
        .steps
        .iter()
        .filter(|(_, st)| st.phase == Some(Phase::Playing))
        .filter_map(|(id, st)| Some((id.clone(), st.round_started_at?, st.round_ends_at?)))
        .collect();
    for (id, start, end) in playing {
        spawn_round_timer(id, start, end);
    }
    tokio::spawn(broadcast_loop());
    tokio::spawn(snapshot_loop());

    // Built client; /, /screen and /host all get index.html
    let static_files = ServeDir::new(&static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    // No CORS layer: the client is served from this origin (proxy /socket.io in Vite dev)
    let router = Router::new()
        .route(
            "/api/health",
            get(|| async { Json(json!({ "ok": true, "players": session().online_count() })) }),
        )
        .fallback_service(static_files)
        .layer(layer)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        );

    let listener = match tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await {
        Ok(l) => l,
        Err(e) => return error!("Failed to bind to port {port}: {e:?}"),
    };
    info!("Server listening on port {port}");

    if let Err(e) = serve(listener, router).await {
        error!("Server error: {e}");
    }
}
