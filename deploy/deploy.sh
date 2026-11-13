#!/usr/bin/env bash
# Runs on the VPS (called by GitHub Actions, or by hand to roll back):
#   IMAGE=ghcr.io/<owner>/<repo>:<commit-sha> ./deploy.sh
# Pulls the image, restarts the stack and waits for the app to answer.
set -euo pipefail
cd "$(dirname "$0")"

: "${IMAGE:?IMAGE must be set, e.g. ghcr.io/<owner>/<repo>:latest}"
export IMAGE

if [ ! -f .env ]; then
    echo "ERROR: $(pwd)/.env is missing — create it from .env.production.example" >&2
    exit 1
fi

env_value() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '"\r'; }

# Pin the image in docker-compose.override.yml (compose loads it on its own), so manual
# `docker compose logs/ps` use the deployed image too.
cat > docker-compose.override.yml <<EOT
# Written by deploy.sh: the image currently deployed. Do not edit.
services:
  app:
    image: ${IMAGE}
EOT
PORT="$(env_value PORT)"
: "${PORT:?PORT must be set in .env}"

echo "Deploying $IMAGE"
docker compose pull app
docker compose up -d --remove-orphans

echo "Waiting for the app on port $PORT"
for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/api/health"; then
        echo "App is up — $IMAGE"
        echo "$IMAGE" > .deployed_image
        docker image prune -f > /dev/null
        exit 0
    fi
    sleep 2
done

echo "ERROR: the app did not answer within 60 s. Last logs:" >&2
docker compose logs --tail 80 app >&2
if [ -f .deployed_image ]; then
    echo "Roll back with: IMAGE=$(cat .deployed_image) ./deploy.sh" >&2
fi
exit 1
