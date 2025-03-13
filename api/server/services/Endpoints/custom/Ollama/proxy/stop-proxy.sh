#!/bin/bash

# Ollama Proxy Stop Script
# This script stops the Ollama proxy service

# Check if the PID file exists
if [ -f "ollama-proxy.pid" ]; then
    # Read the PID from the file
    PROXY_PID=$(cat ollama-proxy.pid)
    
    # Check if the process is running
    if ps -p $PROXY_PID > /dev/null; then
        echo "Stopping Ollama proxy with PID $PROXY_PID..."
        kill $PROXY_PID
        
        # Wait for the process to terminate
        for i in {1..5}; do
            if ! ps -p $PROXY_PID > /dev/null; then
                echo "Ollama proxy stopped successfully"
                rm ollama-proxy.pid
                exit 0
            fi
            echo "Waiting for proxy to terminate... ($i/5)"
            sleep 1
        done
        
        # Force kill if it's still running
        echo "Proxy did not terminate gracefully, forcing kill..."
        kill -9 $PROXY_PID
        if ! ps -p $PROXY_PID > /dev/null; then
            echo "Ollama proxy forcefully stopped"
            rm ollama-proxy.pid
            exit 0
        else
            echo "Failed to stop Ollama proxy"
            exit 1
        fi
    else
        echo "Ollama proxy is not running (PID $PROXY_PID not found)"
        rm ollama-proxy.pid
        exit 0
    fi
else
    # Try to find the process by name
    PROXY_PID=$(pgrep -f "node ollama-proxy.js" || true)
    if [ ! -z "$PROXY_PID" ]; then
        echo "Found Ollama proxy running with PID $PROXY_PID"
        echo "Stopping Ollama proxy..."
        kill $PROXY_PID
        
        # Wait for the process to terminate
        for i in {1..5}; do
            if ! ps -p $PROXY_PID > /dev/null; then
                echo "Ollama proxy stopped successfully"
                exit 0
            fi
            echo "Waiting for proxy to terminate... ($i/5)"
            sleep 1
        done
        
        # Force kill if it's still running
        echo "Proxy did not terminate gracefully, forcing kill..."
        kill -9 $PROXY_PID
        if ! ps -p $PROXY_PID > /dev/null; then
            echo "Ollama proxy forcefully stopped"
            exit 0
        else
            echo "Failed to stop Ollama proxy"
            exit 1
        fi
    else
        echo "Ollama proxy is not running"
        exit 0
    fi
fi 