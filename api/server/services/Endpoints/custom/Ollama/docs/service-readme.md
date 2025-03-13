# Ollama Integration for LibreChat

This integration allows LibreChat to connect to [Ollama](https://ollama.ai/), a tool for running large language models locally.

## Overview

The Ollama integration consists of a proxy server that:

1. Translates requests from LibreChat's OpenAI-compatible format to Ollama's API format
2. Forwards the requests to the Ollama service
3. Transforms the responses from Ollama back to OpenAI-compatible format
4. Returns the transformed responses to LibreChat

## Setup Options

There are two ways to set up the Ollama integration:

### 1. Using the Custom Endpoints Service (Recommended)

The easiest way to use the Ollama integration is through the Custom Endpoints service:

1. Create a `docker-compose.override.yml` file in your LibreChat root directory
2. Copy the contents from `api/server/services/Endpoints/custom/docker-compose.override.yml.example`
3. Ensure the Ollama-related environment variables are enabled:
   ```yaml
   environment:
     - OLLAMA_ENABLED=true
     - OLLAMA_HOST=host.docker.internal
     - OLLAMA_PORT=11434
     - OLLAMA_PROXY_PORT=11435
   ```
4. Restart LibreChat with `docker-compose down && docker-compose up -d`

### 2. Manual Setup

If you prefer to run the proxy manually:

1. Navigate to the proxy directory:
   ```bash
   cd api/server/services/Endpoints/custom/Ollama/proxy
   ```

2. Start the proxy:
   ```bash
   ./start-proxy.sh
   ```

3. Configure LibreChat to use the proxy by adding the following to your `.env` file:
   ```
   OLLAMA_PROXY=true
   ```

## Configuration

### Proxy Configuration

The Ollama proxy can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_HOST` | The hostname of the Ollama service | `localhost` |
| `OLLAMA_PORT` | The port of the Ollama service | `11434` |
| `PROXY_PORT` | The port the proxy will listen on | `11435` |
| `LOG_LEVEL` | The logging level (debug, info, warn, error) | `info` |

### LibreChat Configuration

In LibreChat, you need to enable the Ollama integration:

1. Set `OLLAMA_PROXY=true` in your `.env` file
2. Restart LibreChat

## Troubleshooting

If you encounter issues with the Ollama integration:

1. Check the proxy logs:
   - If using the Custom Endpoints service: `docker logs api_custom_endpoints`
   - If running manually: Check `ollama-proxy.log` in the proxy directory

2. Verify that Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Test the proxy directly:
   ```bash
   curl -X POST http://localhost:11435/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"llama2","messages":[{"role":"user","content":"Hello"}]}'
   ```

4. Common issues:
   - **403 Forbidden**: This may indicate that Ollama is running but has access restrictions
   - **Connection refused**: This suggests that Ollama is not running or is not accessible
   - **Proxy not responding**: Check if the proxy is running and listening on the correct port

## Docker Networking

When running in Docker, the Ollama proxy needs to be able to connect to the Ollama service. If Ollama is running on the host machine:

- For macOS and Windows: Use `host.docker.internal` as the `OLLAMA_HOST`
- For Linux: Use the host's IP address or add `--add-host=host.docker.internal:host-gateway` to your Docker run command

## Models

The Ollama integration supports all models available in your Ollama installation. You can view the available models in the LibreChat UI or by running:

```bash
curl http://localhost:11434/api/tags
``` 