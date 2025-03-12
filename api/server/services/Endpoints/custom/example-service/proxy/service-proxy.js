/**
 * Example Service Proxy for LibreChat
 * 
 * This is a template for implementing a proxy for a custom endpoint service.
 * Replace all instances of "example-service" with your service name.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const LOG_FILE = path.join(__dirname, 'service-proxy.log');
const SERVICE_HOST = 'api.example-service.com';  // Replace with your service host
const SERVICE_PORT = 443;  // Replace with your service port
const SERVICE_USE_HTTPS = true;  // Set to true if your service uses HTTPS
const PROXY_PORT = 11436;  // Choose an available port for your proxy

// Clear log file
fs.writeFileSync(LOG_FILE, '--- Example Service Proxy Log ---\n\n', { flag: 'w' });

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Log to file
  fs.appendFileSync(LOG_FILE, logEntry);
  
  // Also log to console
  console.log(`SERVICE PROXY: ${message}`);
}

/**
 * Map OpenAI API paths to your service's API paths
 * 
 * @param {string} originalPath - The original path from the request
 * @returns {string} - The mapped path for your service
 */
function mapPath(originalPath) {
  // Example path mapping - update for your service
  if (originalPath === '/chat/completions') {
    return '/api/chat';  // Replace with your service's chat endpoint
  }
  
  if (originalPath === '/embeddings') {
    return '/api/embeddings';  // Replace with your service's embeddings endpoint
  }
  
  if (originalPath === '/models') {
    return '/api/models';  // Replace with your service's models endpoint
  }
  
  // Default: return the original path
  return originalPath;
}

/**
 * Transform your service's response to OpenAI format
 * 
 * @param {Buffer} chunk - The response chunk from your service
 * @param {boolean} isStreaming - Whether the response is streaming
 * @returns {Buffer} - The transformed response chunk
 */
function transformResponse(chunk, isStreaming) {
  try {
    // Parse the service response chunk
    const serviceResponse = JSON.parse(chunk.toString());
    
    if (!isStreaming) {
      // For non-streaming responses, transform to OpenAI format
      // Update this to match your service's response format
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: serviceResponse.model || 'example-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: serviceResponse.content || serviceResponse.message?.content || ''
            },
            finish_reason: serviceResponse.done ? 'stop' : null
          }
        ],
        usage: {
          prompt_tokens: serviceResponse.prompt_tokens || 0,
          completion_tokens: serviceResponse.completion_tokens || 0,
          total_tokens: (serviceResponse.prompt_tokens || 0) + (serviceResponse.completion_tokens || 0)
        }
      };
      
      return Buffer.from(JSON.stringify(openaiResponse));
    } else {
      // For streaming responses, transform to OpenAI SSE format
      // Update this to match your service's streaming format
      const content = serviceResponse.content || serviceResponse.message?.content || '';
      const isDone = serviceResponse.done === true;
      
      const openaiChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: serviceResponse.model || 'example-model',
        choices: [
          {
            index: 0,
            delta: {
              content: content
            },
            finish_reason: isDone ? 'stop' : null
          }
        ]
      };
      
      // Format as SSE
      return Buffer.from(`data: ${JSON.stringify(openaiChunk)}\n\n${isDone ? 'data: [DONE]\n\n' : ''}`);
    }
  } catch (e) {
    logMessage(`Error transforming response: ${e.message}`);
    return chunk; // Return original chunk if transformation fails
  }
}

// Create a proxy server
const server = http.createServer((clientReq, clientRes) => {
  const originalUrl = clientReq.url;
  const mappedUrl = mapPath(originalUrl);
  
  logMessage(`REQUEST: ${clientReq.method} ${originalUrl}`);
  logMessage(`MAPPED TO: ${mappedUrl}`);
  logMessage(`REQUEST HEADERS: ${JSON.stringify(clientReq.headers, null, 2)}`);
  
  let requestBody = '';
  clientReq.on('data', (chunk) => {
    requestBody += chunk;
  });
  
  clientReq.on('end', () => {
    let parsedBody;
    let isStreaming = false;
    
    if (requestBody) {
      try {
        // Try to parse and pretty-print JSON
        parsedBody = JSON.parse(requestBody);
        isStreaming = parsedBody.stream === true;
        logMessage(`REQUEST BODY: ${JSON.stringify(parsedBody, null, 2)}`);
        logMessage(`STREAMING: ${isStreaming}`);
      } catch (e) {
        // If not JSON, log as is
        logMessage(`REQUEST BODY: ${requestBody}`);
      }
    }
    
    // Forward the request to the service
    const options = {
      hostname: SERVICE_HOST,
      port: SERVICE_PORT,
      path: mappedUrl,
      method: clientReq.method,
      headers: clientReq.headers
    };
    
    // Update host header to match the service
    options.headers.host = SERVICE_HOST;
    
    // Add any service-specific headers here
    // options.headers['X-API-Key'] = 'your-api-key';
    
    logMessage(`FORWARDING TO: ${SERVICE_USE_HTTPS ? 'https' : 'http'}://${SERVICE_HOST}:${SERVICE_PORT}${mappedUrl}`);
    
    // Choose http or https based on configuration
    const requestModule = SERVICE_USE_HTTPS ? https : http;
    
    const proxyReq = requestModule.request(options, (proxyRes) => {
      logMessage(`RESPONSE STATUS: ${proxyRes.statusCode}`);
      logMessage(`RESPONSE HEADERS: ${JSON.stringify(proxyRes.headers, null, 2)}`);
      
      // Set appropriate headers for the client response
      const responseHeaders = { ...proxyRes.headers };
      
      // For streaming responses, set the content type to text/event-stream
      if (isStreaming) {
        responseHeaders['content-type'] = 'text/event-stream';
        responseHeaders['cache-control'] = 'no-cache';
        responseHeaders['connection'] = 'keep-alive';
      }
      
      clientRes.writeHead(proxyRes.statusCode, responseHeaders);
      
      let responseBody = '';
      
      proxyRes.on('data', (chunk) => {
        if (isStreaming) {
          // For streaming responses, transform each chunk
          const transformedChunk = transformResponse(chunk, true);
          clientRes.write(transformedChunk);
          
          // Log a sample of the transformed chunk
          logMessage(`TRANSFORMED CHUNK: ${transformedChunk.toString().substring(0, 200)}...`);
        } else {
          // For non-streaming responses, collect the entire response
          responseBody += chunk;
        }
      });
      
      proxyRes.on('end', () => {
        if (!isStreaming && responseBody) {
          // For non-streaming responses, transform the entire response
          const transformedResponse = transformResponse(responseBody, false);
          clientRes.write(transformedResponse);
          
          // Log the transformed response
          logMessage(`TRANSFORMED RESPONSE: ${transformedResponse.toString().substring(0, 500)}...`);
        }
        
        clientRes.end();
        logMessage('REQUEST COMPLETED\n' + '-'.repeat(80) + '\n');
      });
    });
    
    proxyReq.on('error', (e) => {
      logMessage(`PROXY ERROR: ${e.message}`);
      clientRes.writeHead(500);
      clientRes.end(`Proxy Error: ${e.message}`);
    });
    
    // Forward the request body
    if (requestBody) {
      proxyReq.write(requestBody);
    }
    
    proxyReq.end();
  });
});

// Start the proxy server
server.listen(PROXY_PORT, () => {
  logMessage(`Example Service Proxy running at http://localhost:${PROXY_PORT}`);
  logMessage(`Forwarding requests to ${SERVICE_USE_HTTPS ? 'https' : 'http'}://${SERVICE_HOST}:${SERVICE_PORT}`);
  logMessage(`Path mapping: /chat/completions → ${mapPath('/chat/completions')}`);
  logMessage(`Response format transformation: Example Service → OpenAI`);
  logMessage(`Logging to ${LOG_FILE}`);
});

// Handle server errors
server.on('error', (e) => {
  console.error(`Server error: ${e.message}`);
});

// Handle process termination
process.on('SIGINT', () => {
  logMessage('Proxy server shutting down');
  server.close();
  process.exit();
}); 