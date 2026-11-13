# presentation_api

Backend for **Code With Consequences**. It uses Rust, axum and Socket.IO (via socketioxide), with no database. All live state is held in memory, and a JSON snapshot is written to `SNAPSHOT_PATH` every 5 s and on every step change. The server serves the built client from `STATIC_DIR` and the socket from the same port.

```sh
cp .env.example .env   # set HOST_PIN
cargo run              # http://localhost:3000
cargo test             # scoring table, state machine, content validation
```

The talk content lives in `content/talk.json` and is validated at startup. The server won't start if the file is invalid. Fill in `dependencyCount` and the `correctOptionId` of `dependency-guess` before the talk.

The element ids of each game round (`elements[].id`) must match the `data-zone` attributes in the fake screen components. A round's `answers` lists one entry per pattern to find. Any id inside an entry counts as finding that pattern; for example, round 2 accepts `manage-options` or `accept-all`. An empty `answers` list means the screen is clean.

## Socket events

Every client→server event takes an ack callback. The ack returns `{ success, message, result }`.

| Event | Payload | Who |
| --- | --- | --- |
| `time:sync` | none, result is server Unix ms | anyone |
| `screen:join` | `{}` | big screen |
| `player:join` | `{ room, nickname, token? }`, result `{ playerId, token, nickname }` | phone |
| `poll:answer` | `{ stepId, optionId }` | player |
| `game:lock` | `{ stepId, elementId \| "none", x?, y? }` | player |
| `qna:ask` / `qna:upvote` | `{ text }` / `{ questionId }` | player |
| `host:auth` | `{ pin }` | host |
| `host:goto` | `{ stepIndex }` | host |
| `host:phase` | `{ phase }`: `open`, `closed`, `revealed`, `playing`, `heatmap`, `leaderboard` | host |
| `host:reset` | none (Reset step) | host |
| `host:player` | `{ playerId, action: "rename" \| "remove", nickname? }` | host |
| `host:qna` | `{ questionId, action: "hide" \| "show" \| "highlight" \| "unhighlight" }` | host |
| `host:end` | none: wipes everything and creates a new room code | host |
| `host:export` | none, result is the anonymized poll CSV | host |

The server sends these events:

- `state`: a snapshot built for the receiving role, pushed at most every ~50 ms after a change. Players get their own data under `me`. The host also gets `fullStep`, `nextStep` and `players`.
- `game:result`: `{ stepId, points, correct, correctElementIds, rank, total }`, sent at the reveal.
- `player:removed`: the host removed this player. The server then disconnects the socket.
- `session:ended`: the session was wiped. Send the player back to the join screen.

When the host sets the phase to `playing`, the round starts after a 3 s countdown (`game.roundStartedAt`). Locks are accepted until `roundEndsAt` plus 500 ms. A round ends on its own when time runs out or when every online player has locked in.
