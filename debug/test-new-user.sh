#!/bin/bash

# This script tests the Ollama API access with our new user account

echo "Testing LibreChat with new user account..."

# Set credentials from our newly created user
EMAIL="test@example.com"
PASSWORD="TestPassword123"
API_URL="http://localhost:3080/api"

# Step 1: Login to get auth token
echo -e "\n=== Step 1: Logging in to get auth token ==="
AUTH_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
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
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

echo "Endpoints response:"
echo "$ENDPOINTS_RESPONSE" | jq . 2>/dev/null || echo "$ENDPOINTS_RESPONSE"

# Step 3: Test chat with Ollama
echo -e "\n=== Step 3: Testing chat with Ollama (llama2) ==="
echo "Sending request to $API_URL/ask with endpoint=ollama, model=llama2"

# Use -v for verbose output to see request and response headers
CHAT_RESPONSE=$(curl -v -X POST $API_URL/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  -d '{
    "endpoint": "ollama",
    "model": "llama2",
    "messages": [{"role": "user", "content": "What happened in the USA in 1776?"}],
    "stream": false
  }' 2>&1)

echo -e "\nChat response (including headers):"
echo "$CHAT_RESPONSE"

# Extract just the response body for cleaner output
RESPONSE_BODY=$(echo "$CHAT_RESPONSE" | sed -n '/^{/,/^}/p')
if [ -n "$RESPONSE_BODY" ]; then
  echo -e "\nResponse body:"
  echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
fi

echo -e "\nTest completed. Check the responses above for any errors." 