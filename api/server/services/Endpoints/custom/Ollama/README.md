# Ollama Integration for LibreChat [EXPERIMENTAL]

> **IMPORTANT NOTICE**: This integration is currently experimental and under active development. It may not work as expected and could change significantly in future releases. Use at your own risk.

This directory contains the integration between [LibreChat](https://github.com/danny-avila/LibreChat) and [Ollama](https://ollama.ai/), a tool for running large language models locally.

## Overview

Ollama is a tool for running large language models locally. It provides an API that is similar to, but not fully compatible with, the OpenAI API. This integration provides a proxy that transforms requests and responses between LibreChat and Ollama to ensure compatibility.

## Directory Structure

```
Ollama/
├── debug/                  # Testing and debugging tools
│   ├── test-librechat-api.sh
│   └── test-ollama-api.sh
├── docs/                   # Documentation
│   ├── installation-guide.md
│   └── service-readme.md
├── proxy/                  # Proxy implementation
│   ├── ollama-proxy.js
│   ├── start-proxy.sh
│   ├── stop-proxy.sh
│   └── test-proxy.sh
└── settings/               # Configuration examples
    ├── docker-compose.override.yml.example
    └── librechat.yaml.example
```

## Quick Start

For detailed installation instructions, see the [Installation Guide](./docs/installation-guide.md).

### Docker Installation (Recommended)

1. Create or update your `docker-compose.override.yml` file in the root of your LibreChat installation using the [example](./settings/docker-compose.override.yml.example).
2. Configure LibreChat using the [example](./settings/librechat.yaml.example).
3. Restart LibreChat with Docker Compose:

```bash
docker compose down
docker compose up -d
```

### Manual Installation

1. Start the Ollama proxy:

```bash
cd api/server/services/Endpoints/custom/Ollama/proxy
./start-proxy.sh
```

2. Configure LibreChat using the [example](./settings/librechat.yaml.example).
3. Restart LibreChat to apply the configuration changes.

## Documentation

- [Installation Guide](./docs/installation-guide.md) - Step-by-step instructions for installing and configuring the Ollama integration
- [Service README](./docs/service-readme.md) - Detailed information about the Ollama integration
- [Proxy README](./proxy/README.md) - Information about the proxy implementation

## Testing

You can test the integration using the provided test scripts:

```bash
# Test the proxy directly
cd api/server/services/Endpoints/custom/Ollama/proxy
./test-proxy.sh

# Test the LibreChat API with Ollama
cd api/server/services/Endpoints/custom/Ollama/debug
./test-librechat-api.sh
```

## References

- [Ollama Documentation](https://github.com/ollama/ollama/tree/main/docs)
- [LibreChat Documentation](https://www.librechat.ai/docs)
- [LibreChat Custom Endpoints Documentation](https://www.librechat.ai/docs/quick_start/custom_endpoints) 