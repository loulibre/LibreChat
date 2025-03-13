# Ollama API Proxy for LibreChat

This directory contains the proxy service that transforms requests and responses between LibreChat and Ollama.

## Overview

The Ollama API Proxy performs the following functions:

1. Maps OpenAI API paths to Ollama API paths
2. Transforms Ollama response format to OpenAI format
3. Handles both streaming and non-streaming responses
4. Provides a health check endpoint

## Usage

### Starting the Proxy

To start the proxy, run:

```bash
./start-proxy.sh
```

This will start the proxy on port 11435 (by default) and log output to `ollama-proxy.log`.

### Stopping the Proxy

To stop the proxy, run:

```bash
./stop-proxy.sh
```

### Configuration

The proxy can be configured using environment variables:

```bash
# Configure the Ollama host and port
OLLAMA_HOST=localhost OLLAMA_PORT=11434 PROXY_PORT=11435 LOG_LEVEL=info ./start-proxy.sh
```

Available environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_HOST` | The hostname or IP address of the Ollama server | `localhost` |
| `OLLAMA_PORT` | The port of the Ollama server | `11434` |
| `PROXY_PORT` | The port the proxy will listen on | `11435` |
| `LOG_LEVEL` | The logging level (`debug`, `info`, `warn`, `error`) | `info` |

### Testing the Proxy

You can test the proxy using curl:

```bash
# Test the health endpoint
curl http://localhost:11435/health

# Test the chat completions endpoint
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
```

## Docker Integration

For production deployments, it's recommended to use Docker Compose to automatically start and manage the proxy. See the [Docker Compose Integration](../../docker-compose-integration.md) documentation for details.

## Troubleshooting

### Checking Logs

The proxy logs to `ollama-proxy.log` in this directory. You can view the logs with:

```bash
tail -f ollama-proxy.log
```

### Common Issues

1. **Port Already in Use**: If the proxy fails to start because the port is already in use, you can either:
   - Stop the existing process using the port: `./stop-proxy.sh`
   - Configure the proxy to use a different port: `PROXY_PORT=11436 ./start-proxy.sh`

2. **Connection Refused**: If the proxy can't connect to Ollama, ensure Ollama is running and accessible at the configured host and port.

3. **Empty Responses**: If you're getting empty responses, check the logs for errors in the response transformation.

## References

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference) 