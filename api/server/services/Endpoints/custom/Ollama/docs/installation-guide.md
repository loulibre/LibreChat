# Ollama Integration Installation Guide

This guide provides step-by-step instructions for installing and configuring the Ollama integration for LibreChat.

## Prerequisites

- [LibreChat](https://github.com/danny-avila/LibreChat) installed and running
- [Ollama](https://ollama.ai/) installed and running
- Node.js 18+ (for manual proxy setup)
- Docker and Docker Compose (for Docker setup)

## Installation Options

There are two ways to install the Ollama integration:

1. **Docker Installation** (Recommended for production)
2. **Manual Installation** (For development or testing)

## Docker Installation

### Step 1: Create or Update `docker-compose.override.yml`

Create or update your `docker-compose.override.yml` file in the root of your LibreChat installation:

```yaml
version: '3.8'

services:
  # Main LibreChat API service
  api:
    environment:
      # Enable Ollama integration
      - OLLAMA_PROXY=true
    # Add dependency on the Ollama proxy service
    depends_on:
      - ollama-proxy

  # Ollama Proxy Service
  ollama-proxy:
    image: node:20-alpine
    container_name: librechat-ollama-proxy
    restart: unless-stopped
    volumes:
      - ./api/server/services/Endpoints/custom/Ollama/proxy:/app
    working_dir: /app
    command: node ollama-proxy.js
    ports:
      - "11435:11435"
    networks:
      - librechat-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:11435/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    environment:
      # Configure the Ollama host (use host.docker.internal to access the host machine)
      - OLLAMA_HOST=host.docker.internal
      - OLLAMA_PORT=11434
      - PROXY_PORT=11435
      - NODE_ENV=production
      - LOG_LEVEL=info

# Ensure we're using the same network as the main docker-compose.yml
networks:
  librechat-network:
    external: true
```

> **Note for Linux users**: On Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to your Docker run command or use the host's actual IP address instead of `host.docker.internal`.

### Step 2: Configure LibreChat

Create or update your `librechat.yaml` file to include the Ollama configuration:

```yaml
endpoints:
  ollama:
    apiKey: 'dummy'  # Ollama doesn't require an API key, but LibreChat expects one
    baseURL: 'http://ollama-proxy:11435'  # URL to the Ollama proxy (container name)
    models:
      default: ["llama2"]  # Default models to show in the UI
      fetch: false  # Don't fetch models from the API
    titleConvo: false
    modelDisplayLabel: 'Ollama'
```

### Step 3: Start LibreChat with Docker Compose

Restart LibreChat with Docker Compose:

```bash
docker compose down
docker compose up -d
```

## Manual Installation

### Step 1: Start the Ollama Proxy

Navigate to the proxy directory and start the proxy:

```bash
cd api/server/services/Endpoints/custom/Ollama/proxy
./start-proxy.sh
```

This will start the proxy on port 11435 (by default) and log output to `ollama-proxy.log`.

### Step 2: Configure LibreChat

Create or update your `librechat.yaml` file to include the Ollama configuration:

```yaml
endpoints:
  ollama:
    apiKey: 'dummy'  # Ollama doesn't require an API key, but LibreChat expects one
    baseURL: 'http://localhost:11435'  # URL to the Ollama proxy
    models:
      default: ["llama2"]  # Default models to show in the UI
      fetch: false  # Don't fetch models from the API
    titleConvo: false
    modelDisplayLabel: 'Ollama'
```

### Step 3: Restart LibreChat

Restart LibreChat to apply the configuration changes.

## Verifying the Installation

### Test the Proxy

You can test the proxy directly using the provided test script:

```bash
cd api/server/services/Endpoints/custom/Ollama/proxy
./test-proxy.sh
```

### Test from LibreChat UI

1. Open LibreChat in your browser
2. Log in with your credentials
3. Start a new conversation
4. Select "Ollama" from the model dropdown
5. Send a test message

## Troubleshooting

### Proxy Issues

If you encounter issues with the proxy:

1. Check the proxy logs:
   - For Docker: `docker logs librechat-ollama-proxy`
   - For manual installation: `tail -f api/server/services/Endpoints/custom/Ollama/proxy/ollama-proxy.log`

2. Ensure Ollama is running and accessible:
   - For Docker: Ensure Ollama is accessible at `host.docker.internal:11434`
   - For manual installation: Ensure Ollama is accessible at `localhost:11434`

3. Check the proxy health endpoint:
   - For Docker: `curl http://localhost:11435/health`
   - For manual installation: `curl http://localhost:11435/health`

### LibreChat Issues

If you encounter issues with LibreChat:

1. Check the LibreChat logs:
   - For Docker: `docker logs librechat-api`
   - For manual installation: Check your LibreChat logs

2. Ensure the proxy is running and accessible from LibreChat:
   - For Docker: Ensure the proxy is accessible at `ollama-proxy:11435`
   - For manual installation: Ensure the proxy is accessible at `localhost:11435`

3. Check the LibreChat configuration:
   - Ensure the `librechat.yaml` file is correctly configured
   - Ensure the `OLLAMA_PROXY` environment variable is set to `true` (for Docker)

## Next Steps

- [Ollama Documentation](https://github.com/ollama/ollama/tree/main/docs) - Learn more about Ollama
- [LibreChat Documentation](https://www.librechat.ai/docs) - Learn more about LibreChat
- [Ollama Service README](./service-readme.md) - Detailed information about the Ollama integration 