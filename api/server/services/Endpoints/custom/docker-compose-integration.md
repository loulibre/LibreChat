# Docker Compose Integration for Custom Endpoints

This document explains how to use Docker Compose to automatically start and manage proxy services for custom endpoints in LibreChat.

## Overview

Some custom endpoints require a proxy service to transform requests and responses between LibreChat and the target API. Docker Compose provides a convenient way to automatically start and manage these proxy services alongside LibreChat.

## Configuration

### Step 1: Create or Update `docker-compose.override.yml`

Create or update your `docker-compose.override.yml` file in the root of your LibreChat installation. You can use the example file provided at `api/server/services/Endpoints/custom/docker-compose.override.yml.example` as a starting point.

```yaml
version: '3.8'

services:
  # Main LibreChat API service
  api:
    environment:
      # Enable custom endpoint proxies
      - OLLAMA_PROXY=true
      # - OTHER_SERVICE_PROXY=true
    
    # Add dependencies on proxy services
    depends_on:
      - ollama-proxy
      # - other-service-proxy

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
    environment:
      - OLLAMA_HOST=host.docker.internal
      - OLLAMA_PORT=11434
      - PROXY_PORT=11435

# Ensure we're using the same network as the main docker-compose.yml
networks:
  librechat-network:
    external: true
```

### Step 2: Configure LibreChat

Update your `librechat.yaml` file to use the proxy service:

```yaml
endpoints:
  ollama:
    apiKey: 'dummy'
    baseURL: 'http://host.docker.internal:11435'
    models:
      default: ["llama2"]
      fetch: false
    titleConvo: false
    modelDisplayLabel: 'Ollama'
```

### Step 3: Start LibreChat with Docker Compose

Start LibreChat with Docker Compose:

```bash
docker compose down
docker compose up -d
```

This will start LibreChat and all configured proxy services.

## Adding a New Custom Endpoint

To add a new custom endpoint with a proxy service:

1. Implement the proxy service in the appropriate directory (e.g., `api/server/services/Endpoints/custom/YourService/proxy/`)
2. Add the proxy service configuration to `docker-compose.override.yml`
3. Update `librechat.yaml` to use the proxy service
4. Restart LibreChat with Docker Compose

## Troubleshooting

### Checking Proxy Logs

To check the logs of a proxy service:

```bash
docker logs librechat-ollama-proxy
```

### Checking Proxy Health

Most proxy services include a health check endpoint. You can check the health of a proxy service with:

```bash
curl http://localhost:11435/health
```

### Common Issues

1. **Connection Refused**: Ensure the target service is running and accessible from the proxy service.
2. **Docker Networking**: On Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to your Docker run command.
3. **Port Conflicts**: Ensure the ports used by the proxy services are not already in use by other services.

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [LibreChat Custom Endpoints Documentation](https://www.librechat.ai/docs/quick_start/custom_endpoints) 