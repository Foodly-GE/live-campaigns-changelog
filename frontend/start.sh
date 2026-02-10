#!/bin/bash
# Get the absolute path to the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use that directory as CWD
cd "$SCRIPT_DIR"

echo "Starting Frontend from $(pwd)..."
npm run dev -- --host
