# Ollama Integration with LibreChat

This document explains how to integrate Ollama with LibreChat for both:
1. Using Ollama models as LLMs in the chat interface
2. Using Ollama for embeddings in the RAG (Retrieval Augmented Generation) API

## Table of Contents
- [Setup](#setup)
- [Configuration](#configuration)
- [Ollama Proxy](#ollama-proxy)
- [Single Document Upload in LibreChat](#single-document-upload-in-librechat)
- [Utility Scripts](#utility-scripts)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)
- [Debug Scripts Reference](#debug-scripts-reference)

## Setup

### Prerequisites
- Docker and Docker Compose installed
- Ollama installed and running locally
- LibreChat installed

### Pull Required Models
```bash
# Pull Llama2 for chat
ollama pull llama2

# Pull Qwen2 for embeddings
ollama pull aroxima/gte-qwen2-1.5b-instruct
```

## Configuration

### docker-compose.override.yml
```yaml
version: '3.4'

services:
  api:
    environment:
      - OLLAMA_PROXY=true  # Enable the Ollama proxy
      - RAG_API_URL=http://rag_api:8000
      - RAG_PORT=8000
      - ENDPOINTS=openai,ollama
      - OLLAMA_API_BASE_URL=http://custom-endpoints:11435  # Point to the proxy
    volumes:
      - ./librechat.yaml:/app/librechat.yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - custom-endpoints
  custom-endpoints:  # This service hosts the Ollama proxy
    image: node:20-alpine
    container_name: api_custom_endpoints
    restart: unless-stopped
    volumes:
      - ./api/server/services/Endpoints/custom:/app/custom
    working_dir: /app
    command: sh -c "cd /app/custom && ./start-proxies.sh"
    ports:
      - "11435:11435"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:11435/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - OLLAMA_ENABLED=true
      - OLLAMA_HOST=host.docker.internal
      - OLLAMA_PORT=11434
      - OLLAMA_PROXY_PORT=11435
  rag_api:
    image: ghcr.io/danny-avila/librechat-rag-api-dev:latest
    container_name: librechat_rag_api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - EMBEDDINGS_PROVIDER=ollama
      - EMBEDDINGS_MODEL=aroxima/gte-qwen2-1.5b-instruct
      - OLLAMA_BASE_URL=http://host.docker.internal:11434  # Direct connection for embeddings
      - DEBUG_RAG_API=true
      - RAG_HOST=0.0.0.0
      - RAG_PORT=8000
      - COLLECTION_NAME=testcollection
      - CHUNK_SIZE=1500
      - CHUNK_OVERLAP=100
      - JWT_SECRET=${JWT_SECRET}
      - DISABLE_MIDDLEWARE=true
      - DB_HOST=db
    volumes:
      - ./rag_api/example:/app/uploads
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - db
  db:
    image: ankane/pgvector:latest
    container_name: librechat_pgvector
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=myuser
      - POSTGRES_PASSWORD=mypassword
      - POSTGRES_DB=mydatabase
    volumes:
      - pgvector_data:/var/lib/postgresql/data

volumes:
  pgvector_data:
```

### librechat.yaml
```yaml
# Configuration version (required)
version: 1.2.1

# Cache settings
cache: true

# Endpoints configuration
endpoints:
  custom:
    # OpenAI Configuration
    - name: 'openai'
      apiKey: '${OPENAI_API_KEY}'
      baseURL: 'https://api.openai.com/v1'
      models:
        default: ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo']
        fetch: true
      titleModel: 'gpt-3.5-turbo'
      modelDisplayLabel: 'OpenAI'

    # Ollama Configuration
    - name: 'ollama'
      apiKey: 'ollama'
      baseURL: 'http://api_custom_endpoints:11435'  # Point to the proxy
      models:
        default: ["llama2", "deepseek-r1:14b"]
        fetch: false
      titleConvo: true
      modelDisplayLabel: 'Ollama'
      titleModel: "llama2"
      parameters:
        context_window: 4096
        max_tokens: 2048
        temperature: 0.7
        top_p: 0.9
      requestParams:
        raw: true
        stream: true

# Interface configuration
interface:
  modelSelect: true
  parameters: true
  sidePanel: true
  presets: true
  prompts: true
```

## Ollama Proxy

### What is the Ollama Proxy?

The Ollama Proxy is a middleware component that sits between LibreChat and the Ollama API. It serves as a bridge that handles communication, request formatting, and response processing between the two systems.

### Why the Proxy Exists

The Ollama Proxy exists for several important reasons:

1. **API Compatibility**: Ollama's API is not fully compatible with the OpenAI API format that LibreChat expects. The proxy translates between these different API formats.

2. **Request Transformation**: The proxy transforms LibreChat's requests into a format that Ollama can understand, including model parameters and prompt formatting.

3. **Response Processing**: It processes Ollama's responses back into a format that LibreChat can interpret, including streaming responses for real-time chat.

4. **Error Handling**: The proxy provides better error handling and reporting for issues that might occur when communicating with Ollama.

5. **Security**: It adds an additional layer of security by controlling access to the Ollama API.

### Location in the Project

The Ollama Proxy is located in the LibreChat project at:
```
/api/server/services/Endpoints/custom
```

Key files include:
- `start-proxies.sh`: Script that starts the proxy server
- `ollama.js`: The main proxy implementation for Ollama
- `ollama-routes.js`: Defines the API routes for the proxy

### How the Proxy is Used

The Ollama Proxy is used in the following way:

1. **Configuration**: 
   - In `docker-compose.override.yml`, the `custom-endpoints` service runs the proxy on port 11435
   - The `OLLAMA_PROXY=true` environment variable in the `api` service enables the proxy
   - The `OLLAMA_API_BASE_URL` points to the proxy service

2. **Startup Process**:
   - When LibreChat starts, it initializes the custom-endpoints service
   - The `start-proxies.sh` script starts the Node.js server that runs the proxy
   - The proxy connects to the Ollama API running on the host machine

3. **Request Flow**:
   - LibreChat sends a request to the proxy at `http://api_custom_endpoints:11435`
   - The proxy transforms the request to match Ollama's API format
   - The proxy forwards the transformed request to Ollama at `http://host.docker.internal:11434`
   - Ollama processes the request and sends a response back to the proxy
   - The proxy transforms the response to match LibreChat's expected format
   - The proxy sends the transformed response back to LibreChat

4. **Direct vs. Proxy Connections**:
   - For chat functionality, LibreChat uses the proxy (`OLLAMA_API_BASE_URL=http://custom-endpoints:11435`)
   - For embeddings, the RAG API connects directly to Ollama (`OLLAMA_BASE_URL=http://host.docker.internal:11434`)

### Proxy vs. Direct Connection

There are two ways to connect to Ollama from LibreChat:

1. **Using the Proxy (Recommended for Chat)**:
   ```yaml
   # In docker-compose.override.yml
   api:
     environment:
       - OLLAMA_PROXY=true
       - OLLAMA_API_BASE_URL=http://custom-endpoints:11435
   
   # In librechat.yaml
   - name: 'ollama'
     baseURL: 'http://api_custom_endpoints:11435'
   ```

2. **Direct Connection (Used for Embeddings)**:
   ```yaml
   # In docker-compose.override.yml
   rag_api:
     environment:
       - OLLAMA_BASE_URL=http://host.docker.internal:11434
   
   # Alternative direct connection in librechat.yaml
   - name: 'ollama'
     baseURL: 'http://host.docker.internal:11434/v1/'
   ```

## Single Document Upload in LibreChat

### How RAG Works vs. Direct Document Reading

When you upload a document in LibreChat with the RAG API configured, it uses a sophisticated process to understand and retrieve information from your documents. This is very different from how many other AI systems handle document uploads.

#### RAG Process (Retrieval Augmented Generation)

LibreChat with Ollama integration uses a full RAG pipeline:

1. **Document Processing**:
   - When you upload a document, it's first saved temporarily
   - The document is then split into smaller chunks (configured with `CHUNK_SIZE=1500` and `CHUNK_OVERLAP=100`)
   - This chunking allows the system to handle documents of any size

2. **Embedding Generation**:
   - Each chunk is converted into a vector embedding using the specified embedding model (in our case, Ollama's `aroxima/gte-qwen2-1.5b-instruct`)
   - These embeddings are mathematical representations of the text that capture semantic meaning
   - The embeddings are stored in the pgvector database along with metadata about the source document

3. **Query Processing**:
   - When you ask a question about the document, your question is also converted to an embedding using the same model
   - The system performs a similarity search in the vector database to find the chunks most relevant to your question
   - This search uses cosine similarity between your question embedding and the document chunk embeddings

4. **Response Generation**:
   - Only the most relevant chunks (not the entire document) are sent to the LLM along with your question
   - The LLM (e.g., Llama2) generates a response based on this focused context
   - This approach ensures the LLM focuses only on the relevant parts of the document

#### Advantages Over Direct Document Reading

This RAG approach is superior to simply passing the entire document to the LLM because:

1. **Handles Larger Documents**: By chunking documents, the system can process documents that would exceed the LLM's context window
2. **More Efficient**: Only relevant portions are sent to the LLM, saving tokens and processing time
3. **More Accurate**: The similarity search helps focus the LLM on the most relevant information
4. **Cross-Document Queries**: You can ask questions that span multiple documents, and the system will retrieve the most relevant chunks from each

### Verifying the RAG Process

You can verify that the RAG process is working by:

1. **Checking the RAG API logs**:
   ```bash
   docker logs librechat_rag_api | grep -i "embed"
   ```
   Look for calls to the embedding API when documents are uploaded and when queries are made.

2. **Examining the database**:
   ```bash
   # Count the number of embeddings
   docker exec librechat_pgvector psql -U myuser -d mydatabase -c "SELECT COUNT(*) FROM langchain_pg_embedding;"
   
   # View file IDs in the database
   docker exec librechat_pgvector psql -U myuser -d mydatabase -c "SELECT DISTINCT cmetadata->>'file_id' as file_id FROM langchain_pg_embedding;"
   
   # Check a specific document's chunks
   docker exec librechat_pgvector psql -U myuser -d mydatabase -c "SELECT cmetadata->>'file_id' as file_id, cmetadata->>'source' as source, substring(document, 1, 100) as document_preview FROM langchain_pg_embedding WHERE cmetadata->>'file_id' = 'YOUR_FILE_ID' LIMIT 1;"
   ```

3. **Testing with large documents**:
   Upload a document larger than the LLM's context window (e.g., >4000 tokens for Llama2). If you can still get accurate answers about specific parts of the document, the RAG system is working correctly.

### Example Workflow

1. User uploads a document about Git version control
2. The document is chunked and converted to embeddings using Ollama's Qwen2 model
3. Embeddings are stored in the pgvector database
4. User asks "What is this document about?"
5. The question is converted to an embedding
6. System finds the most relevant chunks through similarity search
7. Relevant chunks and the question are sent to Llama2
8. Llama2 responds with a summary of the Git document

This entire process happens seamlessly in the background, providing users with accurate, context-aware responses to their questions about uploaded documents.

## Utility Scripts

### Repository API Bridge

The `repo_api_bridge.js` script serves as a bridge between Ollama and the RAG API. It provides functionality for:

1. **Generating Embeddings**: Uses Ollama to create embeddings for text content
2. **Uploading and Embedding Files**: Processes files and stores their embeddings in the RAG API
3. **Querying Documents**: Searches for relevant document chunks based on a query

#### Usage

```bash
# Process and embed a file
node repo_api_bridge.js process-file <file_path> [file_id] [user_id]

# Query documents
node repo_api_bridge.js query "<your query>" [file_id] [limit]
```

#### Configuration

The script uses the following environment variables:
- `OLLAMA_API_URL`: URL for the Ollama API (default: http://localhost:11434)
- `RAG_API_URL`: URL for the RAG API (default: http://localhost:8000)
- `EMBEDDING_MODEL`: Model to use for embeddings (default: aroxima/gte-qwen2-1.5b-instruct)
- `JWT_TOKEN`: JWT token for authentication with the RAG API

You can set these variables in a `.env` file or pass them directly when running the script.

#### Example

```bash
# Set environment variables
export EMBEDDING_MODEL="aroxima/gte-qwen2-1.5b-instruct"
export JWT_TOKEN="your_jwt_token"

# Process a file
node repo_api_bridge.js process-file ./documents/sample.txt sample_doc_id user123

# Query the processed document
node repo_api_bridge.js query "What is this document about?" sample_doc_id
```

This script is particularly useful for:
- Testing the embedding functionality outside of the LibreChat UI
- Batch processing documents for embedding
- Directly querying the vector database
- Troubleshooting issues with the RAG pipeline

## Debugging and Troubleshooting

### Common Issues with Ollama Integration

#### Proxy-Related Issues

1. **Proxy Not Starting**:
   - Check if the custom-endpoints container is running: `docker ps | grep custom-endpoints`
   - Verify the proxy health: `curl http://localhost:11435/health`
   - Check proxy logs: `docker logs api_custom_endpoints`

2. **Ollama Models Not Appearing in UI**:
   - Ensure `ENDPOINTS=openai,ollama` is set in the API service
   - Verify the models are listed in librechat.yaml
   - Check that `OLLAMA_PROXY=true` is set

3. **Connection Refused Errors**:
   - Ensure Ollama is running on the host: `curl http://localhost:11434/api/tags`
   - Check that `host.docker.internal` is properly configured in the extra_hosts section
   - Try using the IP address of your host machine instead of `host.docker.internal`

#### Embedding and RAG Issues

1. **Embedding Generation Fails**:
   - Ensure Ollama is running and accessible
   - Check that the specified embedding model is pulled (`ollama pull aroxima/gte-qwen2-1.5b-instruct`)
   - Verify the `OLLAMA_BASE_URL` is correct

2. **LLM Responses Are Inaccurate**:
   - Try adjusting the `CHUNK_SIZE` and `CHUNK_OVERLAP` settings
   - Ensure the document was properly embedded (check database)
   - Consider using a more capable LLM for complex documents

3. **Database Connection Issues**:
   - Verify the database credentials and connection settings
   - Ensure the pgvector extension is enabled

4. **File Upload Fails**:
   - Check file permissions and upload directory
   - Verify the JWT token is valid

### Debugging Tools and Scripts

LibreChat includes several debugging scripts in the `/debug` directory that can help troubleshoot Ollama integration issues:

#### 1. Ollama API Test Script

The `repo_api_bridge.js` script in the debug directory can be used to test direct communication with Ollama:

```bash
cd /Users/jetstart/dev/libre/librechat/debug
node repo_api_bridge.js upload-file /path/to/test/file.txt test_file_id test_user
```

This script tests:
- Direct connection to Ollama for embeddings
- File upload and processing
- Database storage of embeddings

#### 2. Sample Files for Testing

The `/rag_api/example` directory contains sample files that can be used for testing:

```bash
# List sample files
ls -la /Users/jetstart/dev/libre/librechat/rag_api/example

# Use a sample file for testing
node repo_api_bridge.js upload-file /Users/jetstart/dev/libre/librechat/rag_api/example/sample1.txt
```

#### 3. Proxy Connection Test

To test if the Ollama proxy is working correctly:

```bash
# Check proxy health
curl http://localhost:11435/health

# Test model list endpoint
curl http://localhost:11435/api/models

# Test completion endpoint (requires the proxy to be running)
curl -X POST http://localhost:11435/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "messages": [{"role": "user", "content": "Hello, how are you?"}]
  }'
```

#### 4. Database Inspection

To inspect the database for debugging RAG issues:

```bash
# Connect to the database
docker exec -it librechat_pgvector psql -U myuser -d mydatabase

# List tables
\dt

# Examine embedding table structure
\d langchain_pg_embedding

# Count embeddings
SELECT COUNT(*) FROM langchain_pg_embedding;

# View recent embeddings
SELECT cmetadata->>'file_id' as file_id, 
       cmetadata->>'source' as source, 
       substring(document, 1, 100) as preview 
FROM langchain_pg_embedding 
ORDER BY uuid DESC 
LIMIT 5;
```

### Logging and Monitoring

For more detailed troubleshooting, check the logs:

```bash
# RAG API logs
docker logs librechat_rag_api

# LibreChat API logs
docker logs LibreChat

# Ollama proxy logs
docker logs api_custom_endpoints

# Ollama logs (if running as a service)
journalctl -u ollama.service -f
```

### Advanced Troubleshooting

If you're still experiencing issues:

1. **Try Direct Connection Mode**:
   - Set `OLLAMA_PROXY=false` in docker-compose.override.yml
   - Update librechat.yaml to use direct connection: `baseURL: 'http://host.docker.internal:11434/v1/'`
   - Restart the containers

2. **Check Network Connectivity**:
   - From inside the container: `docker exec -it LibreChat ping host.docker.internal`
   - Test direct API access: `docker exec -it LibreChat curl http://host.docker.internal:11434/api/tags`

3. **Verify Model Compatibility**:
   - Some models may require specific formatting or parameters
   - Check Ollama's documentation for the specific model you're using
   - Try with a well-tested model like llama2 first before using other models

## Debug Scripts Reference

LibreChat includes a comprehensive set of debugging tools in the `/debug` directory. These scripts are designed to help developers troubleshoot issues with the Ollama integration, test API endpoints, and analyze request/response patterns.

### Core Debugging Scripts

#### `ollama-trace.js`
**Description:** A Node.js proxy server that intercepts and logs all requests between LibreChat and Ollama. It sits between LibreChat and the Ollama API, capturing all traffic for analysis.  
**Inputs:** None (configuration is set within the script)  
**Outputs:** Creates `ollama-trace.log` with detailed request/response logs  
**Notes:** This script also transforms Ollama's response format to match OpenAI's format, helping to debug API compatibility issues. Run with `./run-trace.sh`.

#### `run-trace.sh`
**Description:** A simple shell script that starts the Ollama API tracing proxy (`ollama-trace.js`).  
**Inputs:** None  
**Outputs:** Starts the proxy server and keeps it running until terminated  
**Notes:** Run this script before testing LibreChat with Ollama to capture all API traffic.

#### `har-analyzer.js`
**Description:** Analyzes HAR (HTTP Archive) files exported from browser developer tools to extract and analyze Ollama-related requests and responses.  
**Inputs:** HAR files placed in the `har-reports` directory  
**Outputs:** Creates detailed analysis reports in the `har-analysis` directory  
**Notes:** Useful for analyzing browser-to-server communication patterns and identifying issues in the request/response cycle. Export HAR files from your browser's Network tab while using LibreChat.

### API Testing Scripts

#### `test-ollama-api.sh`
**Description:** Tests the Ollama API directly to verify it's working correctly without LibreChat in the middle.  
**Inputs:** None  
**Outputs:** Test results showing if Ollama API is accessible and functioning  
**Notes:** Performs three tests: checking API accessibility, testing chat completion, and testing the generate endpoint. Helps isolate whether issues are with Ollama itself or the integration.

#### `test-librechat-api-example.sh`
**Description:** Example script to test the LibreChat API endpoints (requires adding your credentials).  
**Inputs:** Requires editing to add login credentials  
**Outputs:** API responses from LibreChat endpoints  
**Notes:** Copy to `test-librechat-api.sh` and add your credentials before using. Tests authentication and basic API functionality.

#### `create-user-example.sh`
**Description:** Creates a new user account in LibreChat for testing purposes.  
**Inputs:** Requires editing to add new user details  
**Outputs:** API responses from user creation process  
**Notes:** Copy to `create-user.sh` and customize with new user details. Useful for creating test accounts without going through the UI.

#### `test-auth-flow-example.sh`
**Description:** Tests the complete authentication flow in LibreChat, including login, token refresh, and accessing protected endpoints.  
**Inputs:** Requires editing to add login credentials  
**Outputs:** Detailed API responses from each step of the auth flow  
**Notes:** Copy to `test-auth-flow.sh` and add your credentials. Helps debug authentication issues.

### UI Testing Scripts

#### `start-ui-test.sh`
**Description:** Sets up the environment for UI testing, including starting the debugging proxy and configuring LibreChat.  
**Inputs:** None  
**Outputs:** Status messages and instructions for UI testing  
**Notes:** Checks if Ollama is running, verifies model availability, starts the proxy, and provides next steps for testing.

#### `stop-ui-test.sh`
**Description:** Stops the UI testing environment, including the debugging proxy.  
**Inputs:** None  
**Outputs:** Status messages confirming shutdown  
**Notes:** Optionally stops LibreChat containers if requested.

#### `fix-docker-host-access.sh`
**Description:** Ensures Docker containers can access services running on the host machine by configuring network settings.  
**Inputs:** None  
**Outputs:** Status messages and configuration changes  
**Notes:** Handles different operating systems (macOS, Linux, Windows) with appropriate configuration for each. Critical for ensuring containers can reach the Ollama API on the host.

### How to Use These Scripts

1. **For Basic Ollama API Testing:**
   ```bash
   cd /Users/jetstart/dev/libre/librechat/debug
   ./test-ollama-api.sh
   ```

2. **For Tracing API Communication:**
   ```bash
   cd /Users/jetstart/dev/libre/librechat/debug
   ./run-trace.sh
   # In another terminal
   docker compose restart
   # Use LibreChat and check ollama-trace.log
   ```

3. **For Complete UI Testing:**
   ```bash
   cd /Users/jetstart/dev/libre/librechat/debug
   ./start-ui-test.sh
   # Follow on-screen instructions
   # When done
   ./stop-ui-test.sh
   ```

4. **For HAR Analysis:**
   - Use your browser to export HAR files from the Network tab while using LibreChat
   - Place the HAR files in the `debug/har-reports` directory
   - Run the analyzer:
     ```bash
     node har-analyzer.js
     ```
   - Check the results in the `debug/har-analysis` directory

These debugging tools provide comprehensive visibility into the entire request/response flow between LibreChat, the Ollama proxy, and the Ollama API, making it easier to identify and resolve integration issues.
