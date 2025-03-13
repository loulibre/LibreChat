#!/bin/bash

# This script tests the Ollama API directly to verify it's working correctly

echo "Testing Ollama API..."

# Test 1: Check if Ollama is running and accessible
echo -e "\n=== Test 1: Checking if Ollama API is accessible ==="
curl -s http://localhost:11434/api/tags | head -20
if [ $? -eq 0 ]; then
  echo -e "\n✅ Ollama API is accessible"
else
  echo -e "\n❌ Failed to access Ollama API"
  exit 1
fi

# Test 2: Test a simple chat completion with llama2
echo -e "\n=== Test 2: Testing chat completion with llama2 ==="
curl -s -X POST http://localhost:11434/api/chat -d '{
  "model": "llama2",
  "messages": [{"role": "user", "content": "Hello, how are you?"}],
  "stream": false
}' | jq .
if [ $? -eq 0 ]; then
  echo -e "\n✅ Chat completion test successful"
else
  echo -e "\n❌ Chat completion test failed"
  exit 1
fi

# Test 3: Test the API endpoint that LibreChat is using
echo -e "\n=== Test 3: Testing the specific API endpoint LibreChat uses ==="
curl -s -X POST http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello, how are you?",
  "stream": false
}' | jq .
if [ $? -eq 0 ]; then
  echo -e "\n✅ Generate endpoint test successful"
else
  echo -e "\n❌ Generate endpoint test failed"
  exit 1
fi

echo -e "\nAll tests completed. If all tests passed, Ollama API is working correctly." 