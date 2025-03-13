#!/bin/bash

# Ollama Proxy Test Script
# This script tests the Ollama proxy functionality

# Configuration
PROXY_HOST=${PROXY_HOST:-localhost}
PROXY_PORT=${PROXY_PORT:-11435}
MODEL=${MODEL:-llama2}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Ollama API Proxy...${NC}"
echo "Proxy URL: http://$PROXY_HOST:$PROXY_PORT"
echo "Model: $MODEL"
echo

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET http://$PROXY_HOST:$PROXY_PORT/health"
HEALTH_RESPONSE=$(curl -s "http://$PROXY_HOST:$PROXY_PORT/health")
if [ $? -eq 0 ] && [[ "$HEALTH_RESPONSE" == *"status"* ]]; then
    echo -e "${GREEN}✓ Health check successful${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi
echo

# Test 2: Chat Completions (Non-streaming)
echo -e "${YELLOW}Test 2: Chat Completions (Non-streaming)${NC}"
echo "POST http://$PROXY_HOST:$PROXY_PORT/chat/completions"
CHAT_RESPONSE=$(curl -s -X POST "http://$PROXY_HOST:$PROXY_PORT/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"What is the capital of France? Answer in one word.\"
      }
    ],
    \"stream\": false
  }")
if [ $? -eq 0 ] && [[ "$CHAT_RESPONSE" == *"choices"* ]]; then
    echo -e "${GREEN}✓ Chat completions successful${NC}"
    echo "Response: $CHAT_RESPONSE"
else
    echo -e "${RED}✗ Chat completions failed${NC}"
    echo "Response: $CHAT_RESPONSE"
    exit 1
fi
echo

# Test 3: Chat Completions (Streaming)
echo -e "${YELLOW}Test 3: Chat Completions (Streaming)${NC}"
echo "POST http://$PROXY_HOST:$PROXY_PORT/chat/completions (stream=true)"
echo "Sending request... (output will be streamed)"
curl -N -X POST "http://$PROXY_HOST:$PROXY_PORT/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"Count from 1 to 5.\"
      }
    ],
    \"stream\": true
  }"
echo
echo

echo -e "${GREEN}All tests completed successfully!${NC}" 