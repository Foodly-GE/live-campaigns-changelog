#!/bin/bash

# Stop the Campaign Changelog server
cd "$(dirname "$0")"

if [ ! -f .server.pid ]; then
    echo "No server PID file found"
    exit 0
fi

PID=$(cat .server.pid)

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping server (PID: $PID)..."
    kill $PID
    sleep 1
    
    if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID
    fi
    
    echo "✓ Server stopped"
else
    echo "Server not running"
fi

rm -f .server.pid
