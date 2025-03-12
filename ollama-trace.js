/**
 * Ollama API Request/Response Tracer
 * 
 * This script intercepts and logs all requests to the Ollama API
 * to help debug integration issues between LibreChat and Ollama.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const LOG_FILE = path.join(__dirname, 'ollama-trace.log');
const OLLAMA_HOST = 'localhost'; // Use localhost for direct access
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

// Create a proxy server
const server = http.createServer((clientReq, clientRes) => {
  logMessage(`REQUEST: ${clientReq.method} ${clientReq.url}`);
  logMessage(`REQUEST HEADERS: ${JSON.stringify(clientReq.headers, null, 2)}`);
  
  let requestBody = '';
  clientReq.on('data', (chunk) => {
    requestBody += chunk;
  });
  
  clientReq.on('end', () => {
    if (requestBody) {
      try {
        // Try to parse and pretty-print JSON
        const parsedBody = JSON.parse(requestBody);
        logMessage(`REQUEST BODY: ${JSON.stringify(parsedBody, null, 2)}`);
      } catch (e) {
        // If not JSON, log as is
        logMessage(`REQUEST BODY: ${requestBody}`);
      }
    }
    
    // Forward the request to the actual Ollama API
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers
    };
    
    logMessage(`FORWARDING TO: http://${OLLAMA_HOST}:${OLLAMA_PORT}${clientReq.url}`);
    
    const proxyReq = http.request(options, (proxyRes) => {
      logMessage(`RESPONSE STATUS: ${proxyRes.statusCode}`);
      logMessage(`RESPONSE HEADERS: ${JSON.stringify(proxyRes.headers, null, 2)}`);
      
      // Set the same headers on the client response
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      let responseBody = '';
      proxyRes.on('data', (chunk) => {
        responseBody += chunk;
        clientRes.write(chunk);
      });
      
      proxyRes.on('end', () => {
        if (responseBody) {
          // For streaming responses, this might be incomplete or invalid JSON
          try {
            const parsedBody = JSON.parse(responseBody);
            logMessage(`RESPONSE BODY: ${JSON.stringify(parsedBody, null, 2)}`);
          } catch (e) {
            // If not valid JSON (e.g., streaming response), log first 500 chars
            logMessage(`RESPONSE BODY (partial): ${responseBody.substring(0, 500)}...`);
          }
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