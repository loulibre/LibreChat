#!/bin/bash

# This script stops the UI testing environment

echo "Stopping UI Testing Environment..."

# Change to the script directory
cd "$(dirname "$0")"

# Check if proxy PID file exists
if [ -f proxy.pid ]; then
  PROXY_PID=$(cat proxy.pid)
  echo "Stopping Ollama API tracing proxy (PID: $PROXY_PID)..."
  kill $PROXY_PID 2>/dev/null
  rm proxy.pid
  echo "✅ Proxy stopped"
else
  echo "⚠️ No proxy PID file found. Proxy may not be running."
fi

# Ask if user wants to stop LibreChat containers
read -p "Do you want to stop LibreChat containers? (y/n): " STOP_CONTAINERS
if [[ $STOP_CONTAINERS =~ ^[Yy]$ ]]; then
  echo "Stopping LibreChat containers..."
  cd ..
  docker compose down
  echo "✅ LibreChat containers stopped"
else
  echo "LibreChat containers left running"
fi

echo ""
echo "UI Testing Environment shutdown complete."
echo ""
echo "Proxy logs are available at: $(dirname "$0")/ollama-proxy.log" 