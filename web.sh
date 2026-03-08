#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build server TypeScript if needed
if [[ ! -f "$SCRIPT_DIR/dist/web/server.js" ]]; then
  echo "Building server..." >&2
  npm run build:server >&2
fi

# Build React frontend if needed
if [[ ! -f "$SCRIPT_DIR/dist/web/public/index.html" ]]; then
  echo "Building web frontend..." >&2
  npm run build:web >&2
fi

echo "http://127.0.0.1:${PORT}"
exec node "$SCRIPT_DIR/dist/web/server.js"
