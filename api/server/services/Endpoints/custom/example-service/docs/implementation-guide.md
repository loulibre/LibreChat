# Custom Endpoint Implementation Guide

This guide provides step-by-step instructions for implementing a new custom endpoint for LibreChat.

## Overview

LibreChat supports OpenAI API-compatible services through the `librechat.yaml` configuration file. However, some services may require additional configuration, proxying, or response format transformation to work correctly with LibreChat.

This guide will help you implement a new custom endpoint for LibreChat.

## Step 1: Assess Compatibility

Before implementing a custom endpoint, assess its compatibility with LibreChat:

1. **API Format**: Does the service use an OpenAI-compatible API format?
2. **Authentication**: How does the service handle authentication?
3. **Streaming**: Does the service support streaming responses?
4. **Path Structure**: What is the path structure of the service's API?

## Step 2: Determine Implementation Approach

Based on your assessment, determine the implementation approach:

1. **Direct Integration**: If the service is fully OpenAI-compatible, you can configure it directly in `librechat.yaml`.
2. **Proxy Integration**: If the service requires path mapping or response format transformation, you'll need to implement a proxy.

## Step 3: Implement the Proxy (if needed)

If you need to implement a proxy, follow these steps:

1. Copy the example proxy implementation from `example-service/proxy/service-proxy.js` to your service directory.
2. Update the proxy configuration to match your service's requirements:
   - Update the target host and port
   - Implement path mapping for your service
   - Implement response format transformation for your service
   - Add a health check endpoint for monitoring

## Step 4: Configure Docker Integration

For production deployments, it's recommended to use Docker Compose to automatically start and manage your proxy. This ensures the proxy is always running when LibreChat is started.

1. Create a Docker Compose configuration for your proxy in `docker-compose.override.yml`:

```yaml
services:
  # Main LibreChat API service
  api:
    environment:
      # Enable your service integration
      - YOUR_SERVICE_PROXY=true
    # Add dependency on your proxy service
    depends_on:
      - your-service-proxy

  # Your Service Proxy
  your-service-proxy:
    image: node:20-alpine
    container_name: librechat-your-service-proxy
    restart: unless-stopped
    volumes:
      - ./api/server/services/Endpoints/custom/YourService/proxy:/app
    working_dir: /app
    command: node your-service-proxy.js
    ports:
      - "11436:11436"  # Choose an available port
    networks:
      - librechat-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:11436/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    environment:
      - YOUR_SERVICE_HOST=api.your-service.com
      - YOUR_SERVICE_PORT=443
      - PROXY_PORT=11436
      - NODE_ENV=production
      - LOG_LEVEL=info
```

2. Add your service to the main example file at `api/server/services/Endpoints/custom/docker-compose.override.yml.example`.

## Step 5: Create Configuration Examples

Create configuration examples for your service:

1. Copy the example configuration files from `example-service/settings/` to your service directory.
2. Update the configuration examples to match your service's requirements.
3. Create a `librechat.yaml.example` file showing how to configure your service.

## Step 6: Create Debugging Tools

Create debugging tools for your service:

1. Copy the example debugging tools from `example-service/debug/` to your service directory.
2. Update the debugging tools to match your service's requirements.
3. Include scripts for testing the proxy directly and through LibreChat.

## Step 7: Document Your Implementation

Document your implementation:

1. Copy the example documentation from `example-service/docs/` to your service directory.
2. Update the documentation to match your service's requirements.
3. Include detailed instructions for setup, configuration, and troubleshooting.

## Step 8: Test Your Implementation

Test your implementation:

1. Configure LibreChat to use your custom endpoint.
2. Use the debugging tools to test your implementation.
3. Test your implementation with the LibreChat UI.

### Disabling Automated Moderation for Testing

When testing your custom endpoint, be aware that LibreChat includes an automated moderation system that can interfere with testing by temporarily banning users or IPs that make too many requests in a short period.

To disable this system during testing, add the following to your `.env` file or Docker Compose environment:

```
BAN_VIOLATIONS=false
```

This will prevent LibreChat from banning users during testing, which can be particularly helpful when debugging integration issues.

Other relevant moderation settings that may affect testing:

- `MESSAGE_IP_MAX`: Maximum number of messages an IP can send per window
- `MESSAGE_USER_MAX`: Maximum number of messages a user can send per window
- `CONCURRENT_MESSAGE_MAX`: Maximum number of concurrent messages

For more details on the automated moderation system, see the [LibreChat Automated Moderation documentation](https://www.librechat.ai/docs/configuration/mod_system).

## Common Challenges and Solutions

### Path Mapping

If your service uses different API paths than OpenAI, you'll need to implement path mapping in your proxy:

```javascript
function mapPath(originalPath) {
  // Map OpenAI paths to your service's paths
  if (originalPath === '/chat/completions') {
    return '/your/service/path';
  }
  
  return originalPath;
}
```

### Response Format Transformation

If your service returns responses in a different format than OpenAI, you'll need to implement response format transformation in your proxy:

```javascript
function transformResponse(serviceResponse) {
  // Transform your service's response to OpenAI format
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: serviceResponse.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: serviceResponse.content
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}
```

### Streaming Responses

If your service supports streaming responses, you'll need to implement streaming response transformation in your proxy:

```javascript
function transformStreamingResponse(chunk) {
  // Transform your service's streaming chunk to OpenAI format
  return `data: ${JSON.stringify({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'your-model',
    choices: [
      {
        index: 0,
        delta: {
          content: chunk.content
        },
        finish_reason: null
      }
    ]
  })}\n\n`;
}
```

### Docker Networking

When using Docker, you may need to handle networking differently:

1. **Accessing Host Services**: Use `host.docker.internal` to access services running on the host machine.
2. **Linux Hosts**: On Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to your Docker run command.
3. **Container-to-Container Communication**: Use the service name as the hostname for container-to-container communication.

## Best Practices

1. **Error Handling**: Implement robust error handling in your proxy.
2. **Logging**: Implement logging to help with debugging.
3. **Configuration**: Make your proxy configurable to support different environments.
4. **Security**: Consider security implications of your implementation.
5. **Testing**: Test your implementation thoroughly before deploying to production.
6. **Health Checks**: Implement a health check endpoint to monitor the proxy's status.
7. **Documentation**: Document your implementation thoroughly, including setup, configuration, and troubleshooting.

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [LibreChat Custom Endpoints Documentation](https://www.librechat.ai/docs/quick_start/custom_endpoints) 