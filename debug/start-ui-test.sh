#!/bin/bash

# This script sets up the environment for UI testing of LibreChat with Ollama

echo "Starting UI Testing Environment..."

# Check if Ollama is running
echo "Checking if Ollama is running..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "✅ Ollama is running"
else
  echo "❌ Ollama is not running. Please start Ollama first."
  exit 1
fi

# Check if llama2 model is available
echo "Checking if llama2 model is available..."
if curl -s http://localhost:11434/api/tags | grep -q "llama2"; then
  echo "✅ llama2 model is available"
else
  echo "❌ llama2 model is not available. Please run 'ollama pull llama2' first."
  exit 1
fi

# Start the debugging proxy in the background
echo "Starting Ollama API tracing proxy..."
cd "$(dirname "$0")"
node ollama-trace.js > ollama-proxy.log 2>&1 &
PROXY_PID=$!
echo "Proxy started with PID: $PROXY_PID"
echo $PROXY_PID > proxy.pid

# Wait for proxy to start
echo "Waiting for proxy to start..."
sleep 2

# Check if proxy is running
if curl -s http://localhost:11435/api/tags > /dev/null; then
  echo "✅ Proxy is running"
else
  echo "❌ Proxy failed to start. Check ollama-proxy.log for details."
  kill $PROXY_PID 2>/dev/null
  exit 1
fi

# Restart LibreChat
echo "Restarting LibreChat containers..."
cd ..
docker compose down
docker compose up -d

echo "Waiting for LibreChat to start..."
sleep 5

# Check if LibreChat is running
if curl -s -I http://localhost:3080 | grep -q "200 OK"; then
  echo "✅ LibreChat is running"
else
  echo "❌ LibreChat failed to start. Check docker logs."
  cd "$(dirname "$0")"
  kill $PROXY_PID 2>/dev/null
  exit 1
fi

echo ""
echo "🚀 UI Testing Environment is ready!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3080 in your browser"
echo "2. Open browser developer tools (F12)"
echo "3. Navigate to the Network tab and filter for XHR/Fetch requests"
echo "4. Log in and test the chat functionality"
echo ""
echo "To stop the proxy, run: kill $(cat "$(dirname "$0")"/proxy.pid)"
echo ""
echo "Proxy logs are being written to: $(dirname "$0")/ollama-proxy.log"
echo "LibreChat logs can be viewed with: docker compose logs -f api" 