#!/bin/bash

# This script tests the LibreChat API to verify it's working correctly

echo "Testing LibreChat API..."

# Set your credentials here
EMAIL="[Add login EMAIL]"
PASSWORD="[Add login PASSWORD]"
API_URL="http://localhost:3080/api"

# Test 1: Check if LibreChat API is accessible
echo -e "\n=== Test 1: Checking if LibreChat API is accessible ==="
curl -s -I $API_URL/endpoints
if [ $? -eq 0 ]; then
  echo -e "\n✅ LibreChat API is accessible"
else
  echo -e "\n❌ Failed to access LibreChat API"
  exit 1
fi

# Test 2: Login to get auth token
echo -e "\n=== Test 2: Logging in to get auth token ==="
TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
  echo -e "\n✅ Successfully obtained auth token"
else
  echo -e "\n❌ Failed to obtain auth token"
  exit 1
fi

# Test 3: Get available endpoints
echo -e "\n=== Test 3: Getting available endpoints ==="
curl -s -X GET $API_URL/endpoints \
  -H "Authorization: Bearer $TOKEN" | jq .

if [ $? -eq 0 ]; then
  echo -e "\n✅ Successfully retrieved endpoints"
else
  echo -e "\n❌ Failed to retrieve endpoints"
  exit 1
fi

# Test 4: Test chat with Ollama
echo -e "\n=== Test 4: Testing chat with Ollama (llama2) ==="
curl -s -X POST $API_URL/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "endpoint": "ollama",
    "model": "llama2",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "stream": false
  }' | jq .

if [ $? -eq 0 ]; then
  echo -e "\n✅ Chat request sent successfully"
else
  echo -e "\n❌ Failed to send chat request"
  exit 1
fi

echo -e "\nAll tests completed. Check the responses above for any errors." 