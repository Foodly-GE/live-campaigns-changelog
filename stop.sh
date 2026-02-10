#!/bin/bash
echo "Stopping services..."

# Function to kill process on a port
function kill_port() {
  local port=$1
  local name=$2
  
  pid=$(lsof -ti:$port)
  if [ -n "$pid" ]; then
    echo "Stopping $name (PID: $pid) on port $port..."
    kill -9 $pid
  else
    echo "$name is not running on port $port."
  fi
}

kill_port 8080 "Backend"
kill_port 5173 "Frontend"

echo "All services stopped."
