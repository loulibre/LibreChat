#!/bin/bash

# Ollama Proxy Test Script
# This script tests the Ollama proxy for LibreChat

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Test non-streaming request
echo "Testing non-streaming request..."
curl -X POST http://localhost:11435/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "stream": false
  }'

echo -e "\n\nTesting streaming request..."
curl -X POST http://localhost:11435/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of Italy?"
      }
    ],
    "stream": true
  }'

echo -e "\n\nTests completed." 