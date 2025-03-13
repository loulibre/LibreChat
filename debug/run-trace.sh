#!/bin/bash

# Run the Ollama API tracing proxy
echo "Starting Ollama API tracing proxy..."
node ollama-trace.js

# This script will keep running until you press Ctrl+C 