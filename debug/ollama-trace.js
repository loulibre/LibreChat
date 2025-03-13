/**
 * Ollama API Request/Response Tracer
 * 
 * This script intercepts and logs all requests to the Ollama API
 * to help debug integration issues between LibreChat and Ollama.
 * It also transforms Ollama's response format to match OpenAI's format.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const LOG_FILE = path.join(__dirname, 'ollama-trace.log');
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const PROXY_PORT = 11435;

// Clear log file
fs.writeFileSync(LOG_FILE, '--- Ollama API Trace Log ---\n\n', { flag: 'w' });

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Log to file
  fs.appendFileSync(LOG_FILE, logEntry);
  
  // Also log to console
  console.log(`OLLAMA TRACE: ${message}`);
}

// Path mapping from OpenAI format to Ollama format
function mapPath(originalPath) {
  // Map /chat/completions to /api/chat
  if (originalPath === '/chat/completions') {
    return '/api/chat';
  }
  
  // Map /embeddings to /api/embeddings
  if (originalPath === '/embeddings') {
    return '/api/embeddings';
  }
  
  // Map /models to /api/tags
  if (originalPath === '/models') {
    return '/api/tags';
  }
  
  // Default: prepend /api if not already there
  if (!originalPath.startsWith('/api')) {
    return '/api' + originalPath;
  }
  
  return originalPath;
}

// Transform Ollama streaming response to OpenAI format
function transformStreamingResponse(chunk, isStreaming) {
  try {
    // Parse the Ollama response chunk
    const ollamaResponse = JSON.parse(chunk.toString());
    
    if (!isStreaming) {
      // For non-streaming responses, transform to OpenAI format
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: ollamaResponse.model,
        choices: [
          {
            index: 0,
            message: ollamaResponse.message,
            finish_reason: ollamaResponse.done ? 'stop' : null
          }
        ],
        usage: {
          prompt_tokens: ollamaResponse.prompt_eval_count || 0,
          completion_tokens: ollamaResponse.eval_count || 0,
          total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
        }
      };
      
      return Buffer.from(JSON.stringify(openaiResponse));
    } else {
      // For streaming responses, transform to OpenAI SSE format
      const content = ollamaResponse.message?.content || '';
      const isDone = ollamaResponse.done === true;
      
      const openaiChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: ollamaResponse.model,
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
    
    // Forward the request to the actual Ollama API
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: mappedUrl,
      method: clientReq.method,
      headers: clientReq.headers
    };
    
    logMessage(`FORWARDING TO: http://${OLLAMA_HOST}:${OLLAMA_PORT}${mappedUrl}`);
    
    const proxyReq = http.request(options, (proxyRes) => {
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
          const transformedChunk = transformStreamingResponse(chunk, true);
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
          const transformedResponse = transformStreamingResponse(responseBody, false);
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
  logMessage(`Ollama API Trace Proxy running at http://localhost:${PROXY_PORT}`);
  logMessage(`Forwarding requests to http://${OLLAMA_HOST}:${OLLAMA_PORT}`);
  logMessage(`Path mapping: /chat/completions → /api/chat`);
  logMessage(`Response format transformation: Ollama → OpenAI`);
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