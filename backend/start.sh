#!/bin/bash
# Get the absolute path to the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (parent of backend/)
cd "$SCRIPT_DIR/.."

echo "Starting Backend from $(pwd)..."
export DATA_DIR="$(pwd)/data"
python3 -m backend.app
