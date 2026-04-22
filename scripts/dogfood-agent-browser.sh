#!/bin/bash
set -euo pipefail
PORT=3000
URL="http://localhost:$PORT"
SESSION="dogfood-$(date +%s)"
echo "🚀 Starting Dog Food Test..."
pnpm run dev > dev_server.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill $SERVER_PID || true
}
trap cleanup EXIT
for i in {1..30}; do
  if curl -s "$URL" > /dev/null; then break; fi
  sleep 1
done
if ! curl -s "$URL" > /dev/null; then echo "✗ Server failed"; false; fi
echo "✓ Server is up"
agent-browser --session "$SESSION" open "$URL"
SNAPSHOT=$(agent-browser --session "$SESSION" snapshot)
if ! echo "$SNAPSHOT" | grep -q "GitHub Personal Access Token"; then echo "✗ Landing page missing"; false; fi
echo "✓ Landing page detected"
agent-browser --session "$SESSION" find label "GitHub Personal Access Token" type "ghp_mock_token_12345"
agent-browser --session "$SESSION" find text "SAVE" click
sleep 1
SNAPSHOT=$(agent-browser --session "$SESSION" snapshot)
if ! echo "$SNAPSHOT" | grep -q "HOME"; then echo "✗ Home page missing"; false; fi
echo "✅ Dog Food Test Passed!"
