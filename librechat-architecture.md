# LibreChat Architecture and Integration Guide

This document explains the architecture of LibreChat with Ollama integration and how to use it as a git submodule in a larger project.

## Architecture Overview

LibreChat with Ollama integration consists of several key components that work together:

1. **LibreChat Frontend/Backend**: The main application that provides the chat UI and API
2. **Ollama**: Local LLM service that provides both chat and embedding capabilities
3. **RAG API**: FastAPI service that handles document processing and vector search
4. **pgvector**: PostgreSQL with vector extension for storing embeddings

Here's how they interact:

```
User → LibreChat UI → LibreChat Backend → Ollama Proxy → Ollama
                                       ↓
                                    RAG API → pgvector Database
                                       ↓
                                     Ollama (for embeddings)
```

### Component Responsibilities

#### LibreChat Frontend/Backend
- Provides the user interface for chat and document upload
- Handles user authentication and session management
- Routes chat requests to the appropriate LLM provider (Ollama in this case)
- Manages conversation history and context

#### Ollama Proxy
- Translates between LibreChat's API format and Ollama's API format
- Handles streaming responses for real-time chat
- Provides error handling and request transformation

#### RAG API
- Processes uploaded documents (chunking, embedding)
- Stores document embeddings in the pgvector database
- Performs vector similarity search for relevant document chunks
- Retrieves context for the LLM based on user queries

#### pgvector Database
- Stores document chunks and their vector embeddings
- Enables efficient similarity search using cosine distance
- Maintains metadata about documents and chunks

## Using LibreChat as a Git Submodule

### Benefits of Using LibreChat as a Submodule

1. **Modular Integration**: You can incorporate the entire chat and document processing functionality without rebuilding it
2. **Separation of Concerns**: Keep your main application code separate from the chat functionality
3. **Easy Updates**: Pull updates from the LibreChat repository when needed
4. **Customization**: You can modify specific parts while keeping the core functionality intact

### Implementation Approach

Here's how you could integrate LibreChat as a submodule:

1. **Add as Submodule**:
   ```bash
   git submodule add https://github.com/loulibre/librechat.git chat
   git submodule update --init --recursive
   ```

2. **Docker Compose Integration**:
   - Create a parent `docker-compose.yml` that includes both your main application and the LibreChat services
   - Use Docker networks to allow communication between your app and LibreChat

3. **API Integration**:
   - LibreChat provides REST APIs that your main application can call
   - You can authenticate with LibreChat using JWT tokens
   - Use the same database for user authentication if desired

### Example Docker Compose Structure

```yaml
version: '3.4'

services:
  # Your main application services
  main_app:
    build: ./app
    ports:
      - "8080:8080"
    networks:
      - app_network
      - librechat_network
    environment:
      - LIBRECHAT_API_URL=http://librechat_api:3080/api
      - LIBRECHAT_JWT_SECRET=${JWT_SECRET}

  # LibreChat services (from submodule)
  librechat_api:
    extends:
      file: ./chat/docker-compose.yml
      service: api
    networks:
      - librechat_network
    depends_on:
      - librechat_custom_endpoints
      - librechat_rag_api

  librechat_custom_endpoints:
    extends:
      file: ./chat/docker-compose.yml
      service: custom-endpoints
    networks:
      - librechat_network

  librechat_rag_api:
    extends:
      file: ./chat/docker-compose.yml
      service: rag_api
    networks:
      - librechat_network
    depends_on:
      - librechat_db

  librechat_db:
    extends:
      file: ./chat/docker-compose.yml
      service: db
    networks:
      - librechat_network

networks:
  app_network:
  librechat_network:
```

## Integration Points

### 1. Authentication Integration

You can integrate LibreChat's authentication with your main application by:

1. **Shared JWT Secret**: Use the same JWT secret for both applications
2. **SSO Integration**: Implement single sign-on between your app and LibreChat
3. **API Token**: Generate API tokens in your main app that are valid for LibreChat

### 2. Document Processing Integration

The RAG API provides endpoints that your main application can call directly:

```javascript
// Example: Upload a document from your main app
async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  
  const response = await fetch('http://librechat_rag_api:8000/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`
    },
    body: formData
  });
  
  return await response.json();
}
```

### 3. Chat Integration

You can either:

1. **Embed the LibreChat UI** in an iframe within your application
2. **Use the LibreChat API** directly and create your own UI

```javascript
// Example: Send a chat message via API
async function sendChatMessage(message, conversationId, model = "llama2") {
  const response = await fetch('http://librechat_api:3080/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`
    },
    body: JSON.stringify({
      message,
      conversationId,
      model
    })
  });
  
  return await response.json();
}
```

## Technical Considerations

### 1. Database Sharing

You have two options:

1. **Separate Databases**: Keep your main app's database separate from LibreChat's pgvector database
2. **Shared Database**: Use a single PostgreSQL instance with the pgvector extension for both applications

### 2. Ollama Access

Ensure Ollama is accessible to both your main application and LibreChat:

1. **Host Installation**: Install Ollama on the host machine
2. **Container Access**: Configure all containers to access Ollama via `host.docker.internal`

### 3. Resource Management

Consider resource allocation:

1. **Memory Requirements**: Ollama models require significant RAM (4-16GB depending on model)
2. **CPU Usage**: Vector operations are CPU-intensive
3. **Storage**: Vector databases grow with document volume

## Customization Options

You can customize LibreChat for your specific needs:

1. **UI Theming**: Modify the frontend to match your application's look and feel
2. **API Extensions**: Add custom endpoints to the LibreChat API
3. **Model Selection**: Configure specific Ollama models for your use case
4. **Embedding Configuration**: Adjust chunking parameters for your document types

## Data Flow for Document Processing

When a document is uploaded and processed, the data flows as follows:

1. **Document Upload**:
   - User uploads a document through the LibreChat UI
   - Document is sent to the LibreChat backend
   - Backend forwards the document to the RAG API

2. **Document Processing**:
   - RAG API saves the document temporarily
   - Document is split into chunks based on configuration
   - Each chunk is sent to Ollama for embedding generation

3. **Embedding Storage**:
   - Generated embeddings are stored in the pgvector database
   - Metadata about the document and chunks is also stored

4. **Query Processing**:
   - User asks a question about the document
   - Question is converted to an embedding
   - Vector similarity search finds relevant chunks
   - Relevant chunks are sent to the LLM along with the question
   - LLM generates a response based on the provided context

## API Endpoints Reference

### LibreChat API

- `/api/auth/*` - Authentication endpoints
- `/api/chat` - Chat message endpoints
- `/api/conversations` - Conversation management
- `/api/endpoints` - Available LLM endpoints

### RAG API

- `/health` - Health check endpoint
- `/embed` - Upload and embed a document
- `/query` - Query embeddings by file ID
- `/documents` - Get and delete documents
- `/db/tables` - Get database tables
- `/records/all` - Get all records from a table

## Conclusion

Using LibreChat with Ollama as a git submodule in a larger project is not only feasible but can be a powerful way to add sophisticated AI chat and document processing capabilities to your application. The modular architecture with Docker makes it relatively straightforward to integrate, while the API-first design allows for flexible interaction between your main application and the LibreChat components.

The key advantage is that you get a fully open-source, privacy-focused AI solution that runs entirely locally, which can be a significant benefit for applications where data privacy is important. 