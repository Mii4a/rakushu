#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="$ROOT_DIR/services/ai-interview-transcriber"
ENV_FILE="$ROOT_DIR/.env.local"
HOST="127.0.0.1"
PORT="18080"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

cd "$SERVICE_DIR"
set -a
source "$ENV_FILE"
set +a

echo "[ai-interview-transcriber] service_dir=$SERVICE_DIR"
echo "[ai-interview-transcriber] env_file=$ENV_FILE"
echo "[ai-interview-transcriber] url=http://$HOST:$PORT"

exec uv run uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
