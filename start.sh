#!/bin/bash

# Start the Campaign Changelog server
cd "$(dirname "$0")"

# Check if already running
if [ -f .server.pid ]; then
    PID=$(cat .server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Server already running (PID: $PID)"
        exit 1
    fi
fi

echo "Starting Campaign Changelog server..."
PYTHONPATH=. python backend/app.py > .server.log 2>&1 &
echo $! > .server.pid

sleep 2

if ps -p $(cat .server.pid) > /dev/null 2>&1; then
    echo "✓ Server started on http://localhost:8080"
    echo "  Logs: .server.log"
else
    echo "✗ Failed to start server. Check .server.log"
    exit 1
fi
