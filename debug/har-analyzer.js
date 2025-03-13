/**
 * LibreChat HAR Report Analyzer
 * 
 * This script analyzes HAR (HTTP Archive) files from browser dev tools
 * to extract and analyze Ollama-related requests and responses.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const HAR_DIR = path.join(__dirname, 'har-reports');
const ANALYSIS_DIR = path.join(__dirname, 'har-analysis');

// Create directories if they don't exist
if (!fs.existsSync(HAR_DIR)) {
  fs.mkdirSync(HAR_DIR, { recursive: true });
}
if (!fs.existsSync(ANALYSIS_DIR)) {
  fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
}

/**
 * Analyzes a HAR file and extracts Ollama-related requests
 * @param {string} harFilePath - Path to the HAR file
 */
function analyzeHarFile(harFilePath) {
  console.log(`Analyzing HAR file: ${harFilePath}`);
  
  try {
    // Read and parse the HAR file
    const harData = JSON.parse(fs.readFileSync(harFilePath, 'utf8'));
    const entries = harData.log.entries;
    
    console.log(`Total entries in HAR file: ${entries.length}`);
    
    // Filter for Ollama-related requests
    const ollamaRequests = entries.filter(entry => {
      const url = entry.request.url;
      return url.includes('ollama') || 
             url.includes('11434') || 
             url.includes('11435') ||
             (entry.request.postData && 
              entry.request.postData.text && 
              entry.request.postData.text.includes('llama'));
    });
    
    console.log(`Found ${ollamaRequests.length} Ollama-related requests`);
    
    // Filter for LibreChat API requests
    const libreChatRequests = entries.filter(entry => {
      const url = entry.request.url;
      return url.includes('/api/ask') || 
             url.includes('/api/endpoints') ||
             url.includes('/api/models');
    });
    
    console.log(`Found ${libreChatRequests.length} LibreChat API requests`);
    
    // Extract and analyze each request
    const analysisResults = {
      timestamp: new Date().toISOString(),
      harFile: path.basename(harFilePath),
      ollamaRequests: extractRequestDetails(ollamaRequests),
      libreChatRequests: extractRequestDetails(libreChatRequests)
    };
    
    // Save analysis results
    const analysisFilePath = path.join(
      ANALYSIS_DIR, 
      `analysis_${path.basename(harFilePath, '.har')}_${Date.now()}.json`
    );
    
    fs.writeFileSync(
      analysisFilePath, 
      JSON.stringify(analysisResults, null, 2)
    );
    
    console.log(`Analysis saved to: ${analysisFilePath}`);
    
    // Generate a markdown report
    generateMarkdownReport(analysisResults, analysisFilePath.replace('.json', '.md'));
    
    return analysisResults;
  } catch (error) {
    console.error(`Error analyzing HAR file: ${error.message}`);
    return null;
  }
}

/**
 * Extracts detailed information from request entries
 * @param {Array} entries - HAR file entries
 * @returns {Array} Extracted request details
 */
function extractRequestDetails(entries) {
  return entries.map(entry => {
    const request = entry.request;
    const response = entry.response;
    
    // Extract request headers as an object
    const requestHeaders = {};
    request.headers.forEach(header => {
      requestHeaders[header.name] = header.value;
    });
    
    // Extract response headers as an object
    const responseHeaders = {};
    response.headers.forEach(header => {
      responseHeaders[header.name] = header.value;
    });
    
    // Parse request body if it exists
    let requestBody = null;
    if (request.postData && request.postData.text) {
      try {
        requestBody = JSON.parse(request.postData.text);
      } catch (e) {
        requestBody = request.postData.text;
      }
    }
    
    // Parse response body if it exists
    let responseBody = null;
    if (response.content && response.content.text) {
      try {
        responseBody = JSON.parse(response.content.text);
      } catch (e) {
        responseBody = response.content.text;
      }
    }
    
    return {
      url: request.url,
      method: request.method,
      timestamp: new Date(entry.startedDateTime).toISOString(),
      requestHeaders,
      requestBody,
      status: response.status,
      statusText: response.statusText,
      responseHeaders,
      responseBody,
      timings: {
        total: entry.time,
        wait: entry.timings.wait,
        receive: entry.timings.receive
      }
    };
  });
}

/**
 * Generates a markdown report from analysis results
 * @param {Object} analysis - Analysis results
 * @param {string} outputPath - Path to save the markdown report
 */
function generateMarkdownReport(analysis, outputPath) {
  let markdown = `# LibreChat HAR Analysis Report\n\n`;
  markdown += `**Date:** ${analysis.timestamp}\n`;
  markdown += `**HAR File:** ${analysis.harFile}\n\n`;
  
  // Add Ollama requests section
  markdown += `## Ollama Requests (${analysis.ollamaRequests.length})\n\n`;
  analysis.ollamaRequests.forEach((req, index) => {
    markdown += `### Request ${index + 1}: ${req.method} ${req.url}\n\n`;
    markdown += `**Timestamp:** ${req.timestamp}\n`;
    markdown += `**Status:** ${req.status} ${req.statusText}\n`;
    markdown += `**Total Time:** ${req.timings.total.toFixed(2)}ms\n\n`;
    
    markdown += `#### Request Headers\n\`\`\`json\n${JSON.stringify(req.requestHeaders, null, 2)}\n\`\`\`\n\n`;
    
    if (req.requestBody) {
      markdown += `#### Request Body\n\`\`\`json\n${JSON.stringify(req.requestBody, null, 2)}\n\`\`\`\n\n`;
    }
    
    markdown += `#### Response Headers\n\`\`\`json\n${JSON.stringify(req.responseHeaders, null, 2)}\n\`\`\`\n\n`;
    
    if (req.responseBody) {
      const responseBodyStr = typeof req.responseBody === 'string' 
        ? req.responseBody.substring(0, 1000) + (req.responseBody.length > 1000 ? '...' : '')
        : JSON.stringify(req.responseBody, null, 2);
      
      markdown += `#### Response Body\n\`\`\`json\n${responseBodyStr}\n\`\`\`\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  // Add LibreChat requests section
  markdown += `## LibreChat API Requests (${analysis.libreChatRequests.length})\n\n`;
  analysis.libreChatRequests.forEach((req, index) => {
    markdown += `### Request ${index + 1}: ${req.method} ${req.url}\n\n`;
    markdown += `**Timestamp:** ${req.timestamp}\n`;
    markdown += `**Status:** ${req.status} ${req.statusText}\n`;
    markdown += `**Total Time:** ${req.timings.total.toFixed(2)}ms\n\n`;
    
    markdown += `#### Request Headers\n\`\`\`json\n${JSON.stringify(req.requestHeaders, null, 2)}\n\`\`\`\n\n`;
    
    if (req.requestBody) {
      markdown += `#### Request Body\n\`\`\`json\n${JSON.stringify(req.requestBody, null, 2)}\n\`\`\`\n\n`;
    }
    
    markdown += `#### Response Headers\n\`\`\`json\n${JSON.stringify(req.responseHeaders, null, 2)}\n\`\`\`\n\n`;
    
    if (req.responseBody) {
      const responseBodyStr = typeof req.responseBody === 'string' 
        ? req.responseBody.substring(0, 1000) + (req.responseBody.length > 1000 ? '...' : '')
        : JSON.stringify(req.responseBody, null, 2);
      
      markdown += `#### Response Body\n\`\`\`json\n${responseBodyStr}\n\`\`\`\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  // Save the markdown report
  fs.writeFileSync(outputPath, markdown);
  console.log(`Markdown report saved to: ${outputPath}`);
}

// If this script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node har-analyzer.js <path-to-har-file>');
    console.log(`You can also place HAR files in the ${HAR_DIR} directory.`);
    
    // Process all HAR files in the HAR_DIR
    if (fs.existsSync(HAR_DIR)) {
      const harFiles = fs.readdirSync(HAR_DIR)
        .filter(file => file.endsWith('.har'))
        .map(file => path.join(HAR_DIR, file));
      
      if (harFiles.length > 0) {
        console.log(`Found ${harFiles.length} HAR files in ${HAR_DIR}. Analyzing...`);
        harFiles.forEach(analyzeHarFile);
      } else {
        console.log(`No HAR files found in ${HAR_DIR}.`);
      }
    }
  } else {
    const harFilePath = args[0];
    if (fs.existsSync(harFilePath)) {
      analyzeHarFile(harFilePath);
    } else {
      console.error(`File not found: ${harFilePath}`);
    }
  }
}

module.exports = {
  analyzeHarFile
}; 