#!/bin/bash
# Breaker — EV Cost Calculator
# Start script: installs dependencies and launches backend + frontend server

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# ── Port config ──────────────────────────────────
BACKEND_PORT=5001
FRONTEND_PORT=8081

echo ""
echo "⚡ Breaker — Nami Vigo EV Cost Calculator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Helper: check if port is free ───────────────
port_free() {
  ! lsof -iTCP:"$1" -sTCP:LISTEN -t > /dev/null 2>&1
}

# ── Auto-find a free port starting from $1 ───────
find_free_port() {
  local port=$1
  while ! port_free "$port"; do
    echo "   ⚠️  Port $port in use, trying $((port+1))..." >&2
    port=$((port + 1))
  done
  echo "$port"
}

# ── Python backend setup ─────────────────────────
echo "📦 Setting up Python backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  echo "   Creating virtual environment..."
  python3 -m venv venv
fi

echo "   Activating venv & installing packages..."
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || true
echo "   ✅ Backend ready"
echo ""

# ── Resolve ports ────────────────────────────────
BACKEND_PORT=$(find_free_port $BACKEND_PORT)
FRONTEND_PORT=$(find_free_port $FRONTEND_PORT)

# ── Patch the port in app.py dynamically ─────────
sed -i '' "s/app\.run(debug=True, port=[0-9]*)/app.run(debug=True, port=$BACKEND_PORT)/" "$BACKEND_DIR/app.py"

# ── Patch the API_BASE in app.js dynamically ─────
sed -i '' "s|const API_BASE = \"http://localhost:[0-9]*/api\"|const API_BASE = \"http://localhost:$BACKEND_PORT/api\"|" "$FRONTEND_DIR/js/app.js"

# ── Launch backend ───────────────────────────────
echo "🚀 Starting Flask API on http://localhost:$BACKEND_PORT ..."
python app.py > /tmp/breaker_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to actually come up
sleep 2
if ! port_free "$BACKEND_PORT" 2>/dev/null; then
  :  # port is now in use by our server — good
else
  # Give it one more second
  sleep 1
fi

# ── Launch frontend ──────────────────────────────
echo ""
echo "🌐 Starting Frontend on http://localhost:$FRONTEND_PORT ..."
cd "$FRONTEND_DIR"
python3 -m http.server $FRONTEND_PORT > /tmp/breaker_frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Breaker is running!"
echo ""
echo "   Frontend : http://localhost:$FRONTEND_PORT"
echo "   API      : http://localhost:$BACKEND_PORT/api"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Cleanup on exit ──────────────────────────────
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  echo "👋 Breaker stopped."
  exit 0
}
trap cleanup INT TERM

wait
