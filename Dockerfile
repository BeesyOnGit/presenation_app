# One container: the Rust API serves the built client from /app/public (STATIC_DIR)
# and the socket.io endpoint on the same port.

# ─── Frontend (vite outDir is ../presentation_api/public) ─────────────────────
FROM node:22-bookworm-slim AS web
WORKDIR /src/presentation_web
COPY presentation_web/package*.json ./
RUN npm ci
COPY presentation_web/ .
RUN npm run build

# ─── Backend (dependencies cached in their own layer with cargo-chef) ────────
FROM rust:1-bookworm AS chef
RUN cargo install cargo-chef --locked
WORKDIR /app

FROM chef AS planner
COPY presentation_api/ .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY presentation_api/ .
RUN cargo build --release --locked

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home presentation
WORKDIR /app
COPY --from=builder /app/target/release/presentation_api /usr/local/bin/
COPY presentation_api/content /app/content
COPY --from=web /src/presentation_api/public /app/public
# data/ holds the live snapshot; created here so the mounted volume is owned by the app user
RUN mkdir -p /app/data && chown presentation /app/data
USER presentation
ENV RUST_LOG=presentation_api=info,tower_http=warn,socketioxide=warn \
    STATIC_DIR=/app/public \
    CONTENT_PATH=/app/content/talk.json \
    SNAPSHOT_PATH=/app/data/snapshot.json \
    PORT=9632
EXPOSE 9632
CMD ["presentation_api"]
