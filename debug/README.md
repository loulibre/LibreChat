# LibreChat Ollama API Debugging Proxy

This directory contains tools to help debug the integration between LibreChat and Ollama.

## What's Included

- `ollama-trace.js`: A Node.js proxy server that intercepts and logs all requests between LibreChat and Ollama
- `run-trace.sh`: A shell script to run the proxy server
- `ollama-trace.log`: Log file that will be created when the proxy is running
- `test-ollama-api.sh`: A script to test the Ollama API directly
- `test-librechat-api-example.sh`: An example script to test the LibreChat API (requires adding your credentials)
- `fix-docker-host-access.sh`: A script to ensure Docker containers can access the host machine
- `start-ui-test.sh`: A script to set up the UI testing environment
- `stop-ui-test.sh`: A script to stop the UI testing environment
- `ui-test-plan.md`: A comprehensive plan for testing the LibreChat UI
- `ui-test-results-template.md`: A template for documenting UI test results

## How to Use the Debugging Proxy

1. Make sure you have Node.js installed on your system
2. Update `librechat.yaml` to point to the proxy (port 11435) instead of directly to Ollama (port 11434)
   - This has already been done for you
3. Run the proxy server:
   ```bash
   cd debug
   ./run-trace.sh
   ```
4. In a separate terminal, restart LibreChat:
   ```bash
   docker compose down
   docker compose up -d
   ```
5. Use the LibreChat UI to make requests to Ollama
6. Check the logs in `debug/ollama-trace.log` or the console output to see the full request/response flow

## Testing the APIs

### Testing Ollama API
Run the Ollama API test script to verify that Ollama is working correctly:
```bash
./test-ollama-api.sh
```

### Testing LibreChat API
To test the LibreChat API:
1. Copy the example script and add your credentials:
   ```bash
   cp test-librechat-api-example.sh test-librechat-api.sh
   chmod +x test-librechat-api.sh
   ```
2. Edit `test-librechat-api.sh` and replace `[Add login EMAIL]` and `[Add login PASSWORD]` with your actual credentials
3. Run the script:
   ```bash
   ./test-librechat-api.sh
   ```

**Note:** The `test-librechat-api.sh` file with your credentials is added to `.gitignore` to prevent accidentally committing sensitive information.

## UI Testing

The UI testing tools help you trace and debug the entire request/response flow from the LibreChat UI to the Ollama API.

### Setting Up UI Testing

1. Run the UI testing setup script:
   ```bash
   ./start-ui-test.sh
   ```
   This script will:
   - Check if Ollama is running
   - Verify the llama2 model is available
   - Start the debugging proxy
   - Restart LibreChat with the updated configuration
   - Provide instructions for the next steps

2. Follow the on-screen instructions to:
   - Open LibreChat in your browser
   - Open browser developer tools
   - Navigate to the Network tab
   - Log in and test the chat functionality

3. Use the test plan in `ui-test-plan.md` to guide your testing
4. Document your findings using the template in `ui-test-results-template.md`

### Stopping UI Testing

When you're done testing, run the cleanup script:
```bash
./stop-ui-test.sh
```

This will stop the proxy and optionally stop the LibreChat containers.

## What to Look For

- Check if the requests from LibreChat are properly formatted
- Verify that the Ollama API is responding with the expected status codes
- Look for any error messages or unexpected behavior in the responses
- Compare the requests/responses in the browser with those in the proxy logs

## Troubleshooting

If the proxy doesn't start:
- Make sure port 11435 is not already in use
- Check that you have the necessary Node.js modules installed
- Verify that the script has execute permissions (`chmod +x run-trace.sh`)

If LibreChat can't connect to the proxy:
- Make sure the proxy is running
- Verify that `librechat.yaml` has been updated to use port 11435
- Check that the Docker container can access the host machine on port 11435 