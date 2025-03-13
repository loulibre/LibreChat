﻿# ID-based RAG FastAPI


## Overview
This project integrates Langchain with FastAPI in an Asynchronous, Scalable manner, providing a framework for document indexing and retrieval, using PostgreSQL/pgvector.

Files are organized into embeddings by `file_id`. The primary use case is for integration with [LibreChat](https://librechat.ai), but this simple API can be used for any ID-based use case.

The main reason to use the ID approach is to work with embeddings on a file-level. This makes for targeted queries when combined with file metadata stored in a database, such as is done by LibreChat.

The API will evolve over time to employ different querying/re-ranking methods, embedding models, and vector stores.

## Features
- **Document Management**: Methods for adding, retrieving, and deleting documents.
- **Vector Store**: Utilizes Langchain's vector store for efficient document retrieval.
- **Asynchronous Support**: Offers async operations for enhanced performance.
- **Multiple Embedding Providers**: Support for OpenAI, Azure, HuggingFace, Ollama, and Bedrock.

## Integration with LibreChat

The RAG API is designed to work seamlessly with LibreChat. When integrated, it allows users to:
1. Upload documents through the LibreChat UI
2. Ask questions about the uploaded documents
3. Receive AI responses that incorporate information from the documents


## API Endpoints

The RAG API uses Open API and Fast API on the backend to deliver API endpoint services for use in document management.  Below are the current API endpoint services available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint to verify if the API is running |
| `/ids` | GET | Get all document IDs stored in the system |
| `/documents` | GET | Get documents by IDs (requires `ids` query parameter) |
| `/documents` | DELETE | Delete documents (requires document IDs in request body) |
| `/documents/{id}/context` | GET | Load document context for a specific document ID |
| `/query` | POST | Query embeddings by file ID (requires `query` and `file_id` in request body) |
| `/query_multiple` | POST | Query embeddings by multiple file IDs (requires `query` and `file_ids` in request body) |
| `/embed` | POST | Upload and embed a file (requires `file_id` and `file` in multipart form) |
| `/embed-upload` | POST | Alternative endpoint for file upload and embedding (requires `file_id` and `uploaded_file` in multipart form) |
| `/local/embed` | POST | Embed a local file (requires file information in request body) |
| `/db/tables` | GET | Get all table names in the database (requires authentication) |
| `/db/tables/columns` | GET | Get columns for a specific table (requires `table_name` query parameter) |
| `/records/all` | GET | Get all records from a specific table (requires `table_name` query parameter) |
| `/records` | GET | Get records filtered by custom_id (requires `custom_id` query parameter) |
| `/test/check_index` | GET | Check if a file ID index exists (requires `table_name` and `column_name` query parameters) |

### LibreChat Integration Steps

1. Add the RAG API service to your `docker-compose.override.yml` file:
```yaml
  rag_api:
    image: ghcr.io/danny-avila/librechat-rag-api-dev:latest
    container_name: librechat_rag_api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - EMBEDDINGS_PROVIDER=openai
      - EMBEDDINGS_MODEL=text-embedding-3-small
      - RAG_OPENAI_API_KEY=${OPENAI_API_KEY}
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

2. Add the RAG API environment variables to your LibreChat container:
```yaml
  api:
    environment:
      - RAG_API_URL=http://rag_api:8000
      - RAG_PORT=8000
```

3. Make sure the `DB_HOST` environment variable is set correctly to match the database service name in your docker-compose file. In the example above, it's set to `db`.

4. Restart your containers with `docker-compose down && docker-compose up -d`

5. Once the containers are running, you can use the RAG API through the LibreChat UI:
   - Start a new conversation with an OpenAI model
   - Upload a file using the file upload button
   - Ask questions about the content of the uploaded file

## Using Ollama for Embeddings

The RAG API supports using Ollama as an embeddings provider, which allows you to use local models for generating embeddings without relying on external APIs.

### Setting Up Ollama with Qwen2

To use Ollama with the Qwen2 model for embeddings:

1. Make sure Ollama is installed and running. You can download it from [ollama.ai](https://ollama.ai).

2. Pull the Qwen2 model for embeddings:
   ```bash
   ollama pull aroxima/gte-qwen2-1.5b-instruct
   ```

3. Configure your RAG API to use Ollama with Qwen2 by setting these environment variables:
   ```yaml
   - EMBEDDINGS_PROVIDER=ollama
   - EMBEDDINGS_MODEL=aroxima/gte-qwen2-1.5b-instruct
   - OLLAMA_BASE_URL=http://ollama:11434  # For Docker setup
   ```
   
   For local development without Docker, use:
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   ```

4. Example docker-compose configuration with Ollama:
   ```yaml
   rag_api:
     image: ghcr.io/danny-avila/librechat-rag-api-dev:latest
     container_name: librechat_rag_api
     # ... other settings
     environment:
       # ... other environment variables
       - EMBEDDINGS_PROVIDER=ollama
       - EMBEDDINGS_MODEL=aroxima/gte-qwen2-1.5b-instruct
       - OLLAMA_BASE_URL=http://ollama:11434
     depends_on:
       - db
       - ollama
   
   ollama:
     image: ollama/ollama:latest
     container_name: ollama
     ports:
       - "11434:11434"
     volumes:
       - ollama_data:/root/.ollama
   
   volumes:
     ollama_data:
   ```

5. Verify that Ollama is working correctly by checking the RAG API logs after startup.

### Advantages of Using Ollama with Qwen2

- **Privacy**: All embedding generation happens locally, with no data sent to external APIs
- **Cost-effective**: No usage charges for API calls
- **Customizable**: Can use different models based on your specific needs
- **Performance**: The Qwen2 model provides high-quality embeddings for improved retrieval accuracy

## Setup

### Getting Started

- **Configure `.env` file based on [section below](#environment-variables)**
- **Setup pgvector database:**
  - Run an existing PSQL/PGVector setup, or,
  - Docker: `docker compose up` (also starts RAG API)
    - or, use docker just for DB: `docker compose -f ./db-compose.yaml up`
- **Run API**:
  - Docker: `docker compose up` (also starts PSQL/pgvector)
    - or, use docker just for RAG API: `docker compose -f ./api-compose.yaml up`
  - Local:
    - Make sure to setup `DB_HOST` to the correct database hostname
    - Run the following commands (preferably in a [virtual environment](https://realpython.com/python-virtual-environments-a-primer/))
```bash
pip install -r requirements.txt
uvicorn main:app
```

### Environment Variables

The following environment variables are required to run the application:

- `RAG_OPENAI_API_KEY`: The API key for OpenAI API Embeddings (if using default settings).
    - Note: `OPENAI_API_KEY` will work but `RAG_OPENAI_API_KEY` will override it in order to not conflict with LibreChat setting.
- `RAG_OPENAI_BASEURL`: (Optional) The base URL for your OpenAI API Embeddings
- `RAG_OPENAI_PROXY`: (Optional) Proxy for OpenAI API Embeddings
- `VECTOR_DB_TYPE`: (Optional) select vector database type, default to `pgvector`.
- `POSTGRES_DB`: (Optional) The name of the PostgreSQL database, used when `VECTOR_DB_TYPE=pgvector`.
- `POSTGRES_USER`: (Optional) The username for connecting to the PostgreSQL database.
- `POSTGRES_PASSWORD`: (Optional) The password for connecting to the PostgreSQL database.
- `DB_HOST`: (Optional) The hostname or IP address of the PostgreSQL database server. **Important: This should match the service name of your database container in docker-compose.yml. For example, if your database service is named `db`, set `DB_HOST=db`.**
- `DB_PORT`: (Optional) The port number of the PostgreSQL database server.
- `RAG_HOST`: (Optional) The hostname or IP address where the API server will run. Defaults to "0.0.0.0"
- `RAG_PORT`: (Optional) The port number where the API server will run. Defaults to port 8000.
- `JWT_SECRET`: (Optional) The secret key used for verifying JWT tokens for requests.
  - The secret is only used for verification. This basic approach assumes a signed JWT from elsewhere.
  - Omit to run API without requiring authentication

- `COLLECTION_NAME`: (Optional) The name of the collection in the vector store. Default value is "testcollection".
- `CHUNK_SIZE`: (Optional) The size of the chunks for text processing. Default value is "1500".
- `CHUNK_OVERLAP`: (Optional) The overlap between chunks during text processing. Default value is "100".
- `RAG_UPLOAD_DIR`: (Optional) The directory where uploaded files are stored. Default value is "./uploads/".
- `PDF_EXTRACT_IMAGES`: (Optional) A boolean value indicating whether to extract images from PDF files. Default value is "False".
- `DEBUG_RAG_API`: (Optional) Set to "True" to show more verbose logging output in the server console, and to enable postgresql database routes
- `CONSOLE_JSON`: (Optional) Set to "True" to log as json for Cloud Logging aggregations
- `EMBEDDINGS_PROVIDER`: (Optional) either "openai", "bedrock", "azure", "huggingface", "huggingfacetei" or "ollama", where "huggingface" uses sentence_transformers; defaults to "openai"
- `EMBEDDINGS_MODEL`: (Optional) Set a valid embeddings model to use from the configured provider.
    - **Defaults**
    - openai: "text-embedding-3-small"
    - azure: "text-embedding-3-small" (will be used as your Azure Deployment)
    - huggingface: "sentence-transformers/all-MiniLM-L6-v2"
    - huggingfacetei: "http://huggingfacetei:3000". Hugging Face TEI uses model defined on TEI service launch.
    - ollama: "nomic-embed-text"
    - bedrock: "amazon.titan-embed-text-v1"
    - **Recommended Ollama Models**
    - aroxima/gte-qwen2-1.5b-instruct: High-quality embeddings with good performance
    - nomic-embed-text: Default Ollama embedding model
- `OLLAMA_BASE_URL`: (Optional) The base URL for the Ollama API. Defaults to `http://ollama:11434` for Docker setups. Use `http://localhost:11434` for local development.
- `RAG_AZURE_OPENAI_API_VERSION`: (Optional) Default is `2023-05-15`. The version of the Azure OpenAI API.
- `RAG_AZURE_OPENAI_API_KEY`: (Optional) The API key for Azure OpenAI service.
    - Note: `AZURE_OPENAI_API_KEY` will work but `RAG_AZURE_OPENAI_API_KEY` will override it in order to not conflict with LibreChat setting.
- `RAG_AZURE_OPENAI_ENDPOINT`: (Optional) The endpoint URL for Azure OpenAI service, including the resource.
    - Example: `https://YOUR_RESOURCE_NAME.openai.azure.com`.
    - Note: `AZURE_OPENAI_ENDPOINT` will work but `RAG_AZURE_OPENAI_ENDPOINT` will override it in order to not conflict with LibreChat setting.
- `HF_TOKEN`: (Optional) if needed for `huggingface` option.
- `ATLAS_SEARCH_INDEX`: (Optional) the name of the vector search index if using Atlas MongoDB, defaults to `vector_index`
- `MONGO_VECTOR_COLLECTION`: Deprecated for MongoDB, please use `ATLAS_SEARCH_INDEX` and `COLLECTION_NAME`
- `AWS_DEFAULT_REGION`: (Optional) defaults to `us-east-1`
- `AWS_ACCESS_KEY_ID`: (Optional) needed for bedrock embeddings
- `AWS_SECRET_ACCESS_KEY`: (Optional) needed for bedrock embeddings

Make sure to set these environment variables before running the application. You can set them in a `.env` file or as system environment variables.

### Troubleshooting

#### Common Issues and Solutions

1. **Database Connection Issues**:
   - Ensure that the `DB_HOST` environment variable is set correctly to match the service name in your docker-compose file.
   - If you're using a service named `db` in your docker-compose file, set `DB_HOST=db`.
   - If you're using a different service name, adjust the `DB_HOST` value accordingly.

2. **File Upload Issues**:
   - Make sure the JWT token is valid and not expired.
   - Check that the file_id parameter is included in the request.
   - Verify that the file format is supported.

3. **Query Issues**:
   - Ensure that the file has been properly embedded before querying.
   - Check that the file_id in the query matches the file_id used during embedding.

4. **No Tables in Database**:
   - If the database tables are not being created, check that the RAG API can connect to the database.
   - Verify that the database credentials are correct.
   - Ensure that the pgvector extension is enabled in the database.

5. **OpenAI API Issues**:
   - Verify that the OpenAI API key is valid and has sufficient credits.
   - Check that the embedding model specified is available for your account.

6. **Ollama Integration Issues**:
   - Ensure Ollama is running and accessible at the URL specified in `OLLAMA_BASE_URL`.
   - Verify that the model specified in `EMBEDDINGS_MODEL` has been pulled to your Ollama instance.
   - Check network connectivity between the RAG API container and Ollama if using Docker.

### Use Atlas MongoDB as Vector Database

Instead of using the default pgvector, we could use [Atlas MongoDB](https://www.mongodb.com/products/platform/atlas-vector-search) as the vector database. To do so, set the following environment variables

```env
VECTOR_DB_TYPE=atlas-mongo
ATLAS_MONGO_DB_URI=<mongodb+srv://...>
COLLECTION_NAME=<vector collection>
ATLAS_SEARCH_INDEX=<vector search index>
```

The `ATLAS_MONGO_DB_URI` could be the same or different from what is used by LibreChat. Even if it is the same, the `$COLLECTION_NAME` collection needs to be a completely new one, separate from all collections used by LibreChat. In addition,  create a vector search index for collection above (remember to assign `$ATLAS_SEARCH_INDEX`) with the following json:

```json
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "file_id",
      "type": "filter"
    }
  ]
}
```

Follow one of the [four documented methods](https://www.mongodb.com/docs/atlas/atlas-vector-search/create-index/#procedure) to create the vector index.


### Cloud Installation Settings:

#### AWS:
Make sure your RDS Postgres instance adheres to this requirement:

`The pgvector extension version 0.5.0 is available on database instances in Amazon RDS running PostgreSQL 15.4-R2 and higher, 14.9-R2 and higher, 13.12-R2 and higher, and 12.16-R2 and higher in all applicable AWS Regions, including the AWS GovCloud (US) Regions.`

In order to setup RDS Postgres with RAG API, you can follow these steps:

* Create a RDS Instance/Cluster using the provided [AWS Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.html).
* Login to the RDS Cluster using the Endpoint connection string from the RDS Console or from your IaC Solution output.
* The login is via the *Master User*.
* Create a dedicated database for rag_api:
``` create database rag_api;```.
* Create a dedicated user\role for that database:
``` create role rag;```

* Switch to the database you just created: ```\c rag_api```
* Enable the Vector extension: ```create extension vector;```
* Use the documentation provided above to set up the connection string to the RDS Postgres Instance\Cluster.

Notes:
  * Even though you're logging with a Master user, it doesn't have all the super user privileges, that's why we cannot use the command: ```create role x with superuser;```
  * If you do not enable the extension, rag_api service will throw an error that it cannot create the extension due to the note above.

### References

For more information about LibreChat's RAG API integration, refer to the official documentation:
- [LibreChat RAG API Documentation](https://docs.librechat.ai/features/rag_api.html)

### Dev notes:

#### Installing pre-commit formatter

Run the following commands to install pre-commit formatter, which uses [black](https://github.com/psf/black) code formatter:

```bash
pip install pre-commit
pre-commit install
```
