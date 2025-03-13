#!/bin/bash

# Ollama Proxy Startup Script
# This script starts the Ollama proxy service and logs its output

# Default configuration
OLLAMA_HOST=${OLLAMA_HOST:-localhost}
OLLAMA_PORT=${OLLAMA_PORT:-11434}
PROXY_PORT=${PROXY_PORT:-11435}
LOG_LEVEL=${LOG_LEVEL:-info}
LOG_FILE="ollama-proxy.log"

# Clear log file
echo "--- Ollama API Proxy Log ---" > $LOG_FILE

# Print startup message
echo "Starting Ollama API Proxy..."
echo "  Ollama Host: $OLLAMA_HOST"
echo "  Ollama Port: $OLLAMA_PORT"
echo "  Proxy Port:  $PROXY_PORT"
echo "  Log Level:   $LOG_LEVEL"
echo "  Log File:    $LOG_FILE"

# Export environment variables for the Node.js process
export OLLAMA_HOST
export OLLAMA_PORT
export PROXY_PORT
export LOG_LEVEL

# Start the proxy in the background
node ollama-proxy.js &

# Get the PID of the proxy process
PROXY_PID=$!

# Check if the proxy started successfully
if [ $? -eq 0 ]; then
    echo "Ollama proxy started with PID $PROXY_PID"
    echo "To stop the proxy, run: kill $PROXY_PID"
    echo "Logs are being written to $LOG_FILE"
else
    echo "Failed to start Ollama proxy"
    exit 1
fi

# Save the PID to a file for later reference
echo $PROXY_PID > ollama-proxy.pid 