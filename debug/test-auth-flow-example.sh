#!/bin/bash

# This script tests the authentication flow and then makes a request to the Ollama API

echo "Testing LibreChat Authentication Flow..."

# Set your credentials here
EMAIL="[Add login EMAIL]"
PASSWORD="[Add login PASSWORD]"
API_URL="http://localhost:3080/api"

# Step 1: Login to get auth token
echo -e "\n=== Step 1: Logging in to get auth token ==="
AUTH_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract token
TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
  echo -e "\n✅ Successfully obtained auth token"
  echo "Token: ${TOKEN:0:20}..." # Show only first 20 chars for security
else
  echo -e "\n❌ Failed to obtain auth token"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

# Step 2: Get available endpoints
echo -e "\n=== Step 2: Getting available endpoints ==="
ENDPOINTS_RESPONSE=$(curl -s -X GET $API_URL/endpoints \
  -H "Authorization: Bearer $TOKEN")

echo "Endpoints response:"
echo "$ENDPOINTS_RESPONSE" | jq . 2>/dev/null || echo "$ENDPOINTS_RESPONSE"

# Step 3: Test chat with Ollama
echo -e "\n=== Step 3: Testing chat with Ollama (llama2) ==="
CHAT_RESPONSE=$(curl -s -X POST $API_URL/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "endpoint": "ollama",
    "model": "llama2",
    "messages": [{"role": "user", "content": "What happened in the USA in 1776?"}],
    "stream": false
  }')

echo "Chat response:"
echo "$CHAT_RESPONSE" | jq . 2>/dev/null || echo "$CHAT_RESPONSE"

# Step 4: Test direct Ollama API
echo -e "\n=== Step 4: Testing direct Ollama API ==="
DIRECT_RESPONSE=$(curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "messages": [{"role": "user", "content": "What happened in the USA in 1776?"}],
    "stream": false
  }')

echo "Direct Ollama response:"
echo "$DIRECT_RESPONSE" | jq . 2>/dev/null || echo "$DIRECT_RESPONSE"

# Step 5: Test Ollama API through proxy
echo -e "\n=== Step 5: Testing Ollama API through proxy ==="
PROXY_RESPONSE=$(curl -s -X POST http://localhost:11435/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "messages": [{"role": "user", "content": "What happened in the USA in 1776?"}],
    "stream": false
  }')

echo "Proxy Ollama response:"
echo "$PROXY_RESPONSE" | jq . 2>/dev/null || echo "$PROXY_RESPONSE"

echo -e "\nAll tests completed. Check the responses above for any errors." 