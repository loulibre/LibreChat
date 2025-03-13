#!/bin/bash

# LibreChat API Test Script for Ollama
# This script tests the LibreChat API with Ollama

# Configuration
EMAIL="test@example.com"
PASSWORD="TestPassword123"
API_URL="http://localhost:3080"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Step 1: Login to get token
echo -e "${YELLOW}Step 1: Logging in to get authentication token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check if login was successful
if [[ "$LOGIN_RESPONSE" == *"accessToken"* ]]; then
  echo -e "${GREEN}Login successful!${NC}"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
  echo "Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}Login failed. Response: $LOGIN_RESPONSE${NC}"
  exit 1
fi

# Step 2: Get available endpoints
echo -e "\n${YELLOW}Step 2: Getting available endpoints...${NC}"
ENDPOINTS_RESPONSE=$(curl -s -X GET "$API_URL/api/endpoints" \
  -H "Authorization: Bearer $TOKEN")

# Check if Ollama is in the list of endpoints
if [[ "$ENDPOINTS_RESPONSE" == *"ollama"* ]]; then
  echo -e "${GREEN}Ollama endpoint is available!${NC}"
  echo "Available endpoints: $ENDPOINTS_RESPONSE"
else
  echo -e "${RED}Ollama endpoint not found. Response: $ENDPOINTS_RESPONSE${NC}"
  exit 1
fi

# Step 3: Test chat with Ollama
echo -e "\n${YELLOW}Step 3: Testing chat with Ollama...${NC}"
CHAT_RESPONSE=$(curl -s -X POST "$API_URL/api/ask/custom" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "What is the capital of France?",
    "sender": "User",
    "clientTimestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S")'",
    "isCreatedByUser": true,
    "parentMessageId": "00000000-0000-0000-0000-000000000000",
    "conversationId": null,
    "messageId": "'$(uuidgen)'",
    "error": false,
    "generation": "",
    "responseMessageId": null,
    "overrideParentMessageId": null,
    "endpoint": "ollama",
    "model": "llama2"
  }')

# Check if chat was successful
if [[ "$CHAT_RESPONSE" == *"message"* ]]; then
  echo -e "${GREEN}Chat test successful!${NC}"
  echo "Response: $CHAT_RESPONSE"
else
  echo -e "${RED}Chat test failed. Response: $CHAT_RESPONSE${NC}"
  exit 1
fi

echo -e "\n${GREEN}All tests completed successfully!${NC}" 