# LibreChat Custom Endpoints

This directory contains the implementation of custom endpoint integrations for LibreChat. Custom endpoints allow LibreChat to connect to AI services that don't have a standard OpenAI-compatible API.

## Architecture

The custom endpoints system uses a proxy-based architecture:

1. **LibreChat API**: The main application that handles user requests
2. **Custom Endpoints Service**: A Docker service that manages multiple proxy servers
3. **Proxy Servers**: Individual proxies that translate between LibreChat and specific AI services

```
┌─────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  LibreChat  │────▶│  Custom Endpoints     │────▶│  AI Service │
│  API        │◀────│  Service (Proxies)    │◀────│  (e.g. Ollama) │
└─────────────┘     └───────────────────────┘     └─────────────┘
```

## Available Custom Endpoints

Currently, the following custom endpoints are available:

- **Ollama**: Connect to locally running Ollama models
- *(More endpoints will be added in the future)*

## Adding a Custom Endpoint to LibreChat

To add a custom endpoint to your LibreChat installation:

1. Create a `docker-compose.override.yml` file in your LibreChat root directory
2. Copy the contents from `api/server/services/Endpoints/custom/docker-compose.override.yml.example`
3. Enable the desired endpoints by setting their environment variables
4. Restart LibreChat with `docker-compose down && docker-compose up -d`

## Creating a New Custom Endpoint

To create a new custom endpoint:

1. Create a new directory under `api/server/services/Endpoints/custom/` with your endpoint name
2. Implement a proxy server that translates between LibreChat and your AI service
3. Add your endpoint to the `start-proxies.sh` script
4. Update the `docker-compose.override.yml.example` file with your endpoint's configuration

### Directory Structure

```
api/server/services/Endpoints/custom/
├── README.md                         # This file
├── start-proxies.sh                  # Script to start all enabled proxies
├── docker-compose.override.yml.example # Example Docker Compose configuration
├── Ollama/                           # Ollama endpoint
│   ├── proxy/                        # Ollama proxy implementation
│   ├── docs/                         # Documentation
│   └── settings/                     # Configuration files
└── YourEndpoint/                     # Your new endpoint
    ├── proxy/                        # Your proxy implementation
    ├── docs/                         # Documentation
    └── settings/                     # Configuration files
```

## Troubleshooting

If you encounter issues with custom endpoints:

1. Check the logs in `api/server/services/Endpoints/custom/logs/`
2. Verify that the proxy server is running with `docker ps`
3. Check the Docker logs with `docker logs api_custom_endpoints`
4. Test the proxy directly with curl:
   ```
   curl -X POST http://localhost:<proxy_port>/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"<model_name>","messages":[{"role":"user","content":"Hello"}]}'
   ```

## Contributing

If you've created a custom endpoint that might be useful to others, please consider contributing it back to the LibreChat project! 