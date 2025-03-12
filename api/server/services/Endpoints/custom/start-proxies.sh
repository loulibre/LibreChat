#!/bin/sh

# Custom Endpoints Proxy Launcher
# This script starts all enabled custom endpoint proxies based on environment variables

echo "Starting LibreChat Custom Endpoints Service..."
echo "----------------------------------------------"

# Create logs directory if it doesn't exist
mkdir -p /app/custom/logs

# Function to start a proxy
start_proxy() {
  proxy_name=$1
  proxy_path=$2
  proxy_script=$3
  
  echo "Starting $proxy_name proxy..."
  cd "$proxy_path" || { echo "Error: $proxy_path directory not found"; return 1; }
  
  # Start the proxy in the background and redirect output to a log file
  node "$proxy_script" > "/app/custom/logs/$proxy_name-proxy.log" 2>&1 &
  proxy_pid=$!
  
  # Check if the proxy started successfully
  if [ $? -eq 0 ]; then
    echo "$proxy_name proxy started with PID $proxy_pid"
    # Save the PID to a file for later reference
    echo "$proxy_pid" > "/app/custom/logs/$proxy_name-proxy.pid"
    return 0
  else
    echo "Failed to start $proxy_name proxy"
    return 1
  fi
}

# Start Ollama proxy if enabled
if [ "$OLLAMA_ENABLED" = "true" ]; then
  start_proxy "ollama" "/app/custom/Ollama/proxy" "ollama-proxy.js"
  # Sleep briefly to allow the proxy to initialize
  sleep 2
  echo "Ollama proxy status: $(wget -q -O - http://localhost:$OLLAMA_PROXY_PORT/health 2>/dev/null || echo 'Not responding')"
fi

# Start Cursor proxy if enabled
if [ "$CURSOR_ENABLED" = "true" ]; then
  start_proxy "cursor" "/app/custom/Cursor/proxy" "cursor-proxy.js"
  # Sleep briefly to allow the proxy to initialize
  sleep 2
  echo "Cursor proxy status: $(wget -q -O - http://localhost:$CURSOR_PROXY_PORT/health 2>/dev/null || echo 'Not responding')"
fi

# Add more proxies here as needed

echo "----------------------------------------------"
echo "All enabled proxies have been started"
echo "Entering watch mode to keep the container running..."

# Keep the container running
while true; do
  # Check if any proxies have crashed and restart them
  if [ "$OLLAMA_ENABLED" = "true" ]; then
    if [ -f "/app/custom/logs/ollama-proxy.pid" ]; then
      pid=$(cat "/app/custom/logs/ollama-proxy.pid")
      if ! kill -0 "$pid" 2>/dev/null; then
        echo "Ollama proxy crashed, restarting..."
        start_proxy "ollama" "/app/custom/Ollama/proxy" "ollama-proxy.js"
      fi
    fi
  fi
  
  if [ "$CURSOR_ENABLED" = "true" ]; then
    if [ -f "/app/custom/logs/cursor-proxy.pid" ]; then
      pid=$(cat "/app/custom/logs/cursor-proxy.pid")
      if ! kill -0 "$pid" 2>/dev/null; then
        echo "Cursor proxy crashed, restarting..."
        start_proxy "cursor" "/app/custom/Cursor/proxy" "cursor-proxy.js"
      fi
    fi
  fi
  
  # Sleep for a while before checking again
  sleep 30
done 