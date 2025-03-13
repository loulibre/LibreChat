/**
 * Repository API Bridge
 * 
 * This script serves as a bridge between Ollama and the RAG API.
 * It uses Ollama for generating embeddings and the RAG API for storing documents.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Load environment variables from .env file if present
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not installed, skipping .env file loading');
}

// Configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
// Override RAG_API_URL to use localhost instead of host.docker.internal
const RAG_API_URL = 'http://localhost:8000';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'aroxima/gte-qwen2-1.5b-instruct';
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDE4NDY3MDN9.TqbiLOPQ5b0eTSpBVG_PiZvwaPxCX4VFOSbJEWVBGpg';

/**
 * Generate embeddings for a text using Ollama directly
 * @param {string} text - The text to embed
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    console.log(`Generating embedding for text: ${text.substring(0, 50)}...`);
    
    const response = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.embedding) {
      console.log(`Successfully generated embedding with ${data.embedding.length} dimensions`);
      return data.embedding;
    } else {
      throw new Error('Invalid response format from Ollama');
    }
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Upload and embed a file using the RAG API's /embed endpoint
 * @param {string} filePath - Path to the file
 * @param {string} fileId - Optional file ID to use (defaults to filename)
 * @param {string} entityId - Optional entity ID for user identification (defaults to 'test_user')
 * @returns {Promise<Object>} - The response from the RAG API
 */
async function uploadAndEmbedFile(filePath, fileId = null, entityId = 'test_user') {
  try {
    const fileName = path.basename(filePath);
    fileId = fileId || fileName;
    
    console.log(`Uploading and embedding file: ${fileName} with ID: ${fileId}`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('file_id', fileId);
    formData.append('entity_id', entityId);
    
    const response = await fetch(`${RAG_API_URL}/embed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully uploaded and embedded file: ${data.file_id}`);
    return data;
  } catch (error) {
    console.error('Error uploading and embedding file:', error.message);
    throw error;
  }
}

/**
 * Query the RAG API for relevant documents based on a query
 * @param {string} query - The query text
 * @param {string} fileId - Optional file ID to filter by
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array<Object>>} - The matching documents
 */
async function queryDocuments(query, fileId = null, limit = 5) {
  try {
    console.log(`Querying documents with: "${query}"`);
    
    if (!fileId) {
      throw new Error('File ID is required for querying documents');
    }
    
    const response = await fetch(`${RAG_API_URL}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        file_id: fileId,
        k: limit
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} matching documents`);
    return data;
  } catch (error) {
    console.error('Error querying documents:', error.message);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  generateEmbedding,
  uploadAndEmbedFile,
  queryDocuments
};

// If this script is run directly, provide a simple CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.error('Please provide a command: upload-file or query');
    process.exit(1);
  }
  
  (async () => {
    try {
      switch (command) {
        case 'upload-file':
          if (!args[1]) {
            console.error('Please provide a file path');
            process.exit(1);
          }
          const fileId = args[2] || null;
          const entityId = args[3] || 'test_user';
          await uploadAndEmbedFile(args[1], fileId, entityId);
          break;
          
        case 'query':
          if (!args[1]) {
            console.error('Please provide a query');
            process.exit(1);
          }
          const queryFileId = args[2] || null;
          const limit = args[3] ? parseInt(args[3]) : 5;
          const results = await queryDocuments(args[1], queryFileId, limit);
          console.log(JSON.stringify(results, null, 2));
          break;
          
        default:
          console.error(`Unknown command: ${command}`);
          console.error('Available commands: upload-file, query');
          process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
} 