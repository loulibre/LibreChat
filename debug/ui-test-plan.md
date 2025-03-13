# LibreChat UI Testing Plan

This document outlines a step-by-step approach to test and debug the LibreChat UI's interaction with the Ollama API.

## Phase 1: Setup and Preparation

1. **Start the Debugging Proxy**
   - Run the Ollama API tracing proxy to capture all requests and responses
   - Ensure LibreChat is configured to use the proxy (port 11435)

2. **Prepare Browser Developer Tools**
   - Open LibreChat in Chrome or Firefox
   - Open Developer Tools (F12)
   - Navigate to the Network tab
   - Enable "Preserve log" option
   - Filter for XHR/Fetch requests

3. **Prepare Test Cases**
   - Simple query: "Hello, how are you?"
   - Complex query with context: "What happened in the USA in 1776?"
   - Query requiring reasoning: "If a train travels at 60 mph for 3 hours, how far does it go?"

## Phase 2: UI Flow Testing

1. **Authentication Flow**
   - Monitor the login request/response
   - Capture the authentication token
   - Verify token storage in browser (localStorage/sessionStorage)

2. **Model Selection**
   - Monitor requests when changing models in the dropdown
   - Verify the model list is correctly fetched from the API
   - Check if model capabilities are correctly identified

3. **Basic Chat Interaction**
   - Send a simple message and monitor the request
   - Capture the complete request payload
   - Observe the streaming response
   - Verify message rendering in the UI

## Phase 3: API Request Analysis

1. **Request Headers Analysis**
   - Verify correct Content-Type
   - Check Authorization header
   - Look for any custom headers

2. **Request Payload Analysis**
   - Examine the structure of the request body
   - Verify model selection is correctly passed
   - Check message format and parameters

3. **Response Processing**
   - Monitor how streaming responses are processed
   - Check error handling for failed requests
   - Verify completion events are handled correctly

## Phase 4: Error Path Testing

1. **Intentional Error Scenarios**
   - Test with non-existent model
   - Test with malformed request
   - Test with invalid authentication
   - Test with network interruption

2. **Error Handling in UI**
   - Verify error messages are displayed correctly
   - Check recovery mechanisms
   - Test retry functionality

## Phase 5: Comparison Testing

1. **Direct API vs UI Comparison**
   - Make the same request directly to the API and through the UI
   - Compare request structures
   - Identify any differences in handling

2. **Cross-Browser Testing**
   - Test in Chrome, Firefox, and Safari
   - Note any browser-specific issues

## Execution Checklist

- [ ] Start Ollama service
- [ ] Start debugging proxy
- [ ] Restart LibreChat with updated configuration
- [ ] Open browser with developer tools
- [ ] Execute test cases and document findings
- [ ] Compare proxy logs with browser network activity
- [ ] Identify any discrepancies or issues

## Documentation

For each test case, document:
1. The exact request sent from the browser
2. The corresponding request received by the proxy
3. The response from Ollama
4. The response received by the browser
5. Any errors or unexpected behavior

Use screenshots and code snippets to document the process. 