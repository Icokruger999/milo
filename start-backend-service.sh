#!/bin/bash
# Start Milo Backend Service
# This script starts the backend API and keeps it running

echo "=== Starting Milo Backend Service ==="

# Configuration
BACKEND_DIR="/home/ec2-user/milo-backend-publish"
LOG_DIR="/home/ec2-user/logs"
LOG_FILE="$LOG_DIR/milo-backend.log"
PID_FILE="/home/ec2-user/milo-backend.pid"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Backend is already running with PID $OLD_PID"
        echo "To restart, first run: kill $OLD_PID"
        exit 1
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Navigate to backend directory
cd "$BACKEND_DIR" || exit 1

# Start the backend
echo "Starting backend on port 5001..."
nohup dotnet Milo.API.dll --urls "http://0.0.0.0:5001" > "$LOG_FILE" 2>&1 &

# Save PID
echo $! > "$PID_FILE"
echo "Backend started with PID $(cat $PID_FILE)"
echo "Logs: $LOG_FILE"
echo ""
echo "To check status: ps -p \$(cat $PID_FILE)"
echo "To view logs: tail -f $LOG_FILE"
echo "To stop: kill \$(cat $PID_FILE)"
