use super::controller::*;
use socketioxide::extract::SocketRef;

/// Every socket starts anonymous; `player:join`, `screen:join` or `host:auth` gives it a role.
pub async fn on_connect(socket: SocketRef) {
    socket.extensions.insert(Limiter::default());

    socket.on("time:sync", time_sync);
    socket.on("screen:join", screen_join);

    socket.on("player:join", player_join);
    socket.on("poll:answer", poll_answer);
    socket.on("game:lock", game_lock);
    socket.on("qna:ask", qna_ask);
    socket.on("qna:upvote", qna_upvote);

    socket.on("host:auth", host_auth);
    socket.on("host:goto", host_goto);
    socket.on("host:phase", host_phase);
    socket.on("host:reset", host_reset);
    socket.on("host:player", host_player);
    socket.on("host:qna", host_qna);
    socket.on("host:end", host_end);
    socket.on("host:export", host_export);

    socket.on_disconnect(on_disconnect);
}
