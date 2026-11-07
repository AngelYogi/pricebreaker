#!/bin/bash
# Breaker — EV Cost Calculator
# Start script: installs dependencies and launches backend + frontend server

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo ""
echo "⚡ Breaker — Nami Vigo EV Cost Calculator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Python backend setup ─────────────────────────
echo "📦 Setting up Python backend..."

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  echo "   Creating virtual environment..."
  python3 -m venv venv
fi

echo "   Activating venv & installing packages..."
source venv/bin/activate
pip install -q -r requirements.txt

echo "   ✅ Backend ready"
echo ""

# ── Launch backend ───────────────────────────────
echo "🚀 Starting Flask API on http://localhost:5000 ..."
python app.py &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 1

# ── Launch frontend ──────────────────────────────
echo ""
echo "🌐 Starting Frontend on http://localhost:8080 ..."
cd "$FRONTEND_DIR"
python3 -m http.server 8080 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Breaker is running!"
echo ""
echo "   Frontend : http://localhost:8080"
echo "   API      : http://localhost:5000/api"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Cleanup on exit ──────────────────────────────
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait

