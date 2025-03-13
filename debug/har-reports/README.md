# HAR Reports Directory

This directory is for storing HAR (HTTP Archive) files exported from browser developer tools.

## What are HAR files?

HAR (HTTP Archive) files are JSON-formatted logs that capture all network traffic between your browser and a website. They include detailed information about:

- HTTP requests and responses
- Headers
- Request/response bodies
- Timing information
- Cookies
- And more

## How to capture a HAR file

### Chrome
1. Open Chrome DevTools (F12 or Ctrl+Shift+I / Cmd+Option+I)
2. Go to the Network tab
3. Make sure the recording button is active (red circle)
4. Check "Preserve log" to keep all requests even when navigating
5. Perform the actions you want to capture
6. Right-click anywhere in the network log
7. Select "Save all as HAR with content"
8. Save the file in this directory

### Firefox
1. Open Firefox DevTools (F12 or Ctrl+Shift+I / Cmd+Option+I)
2. Go to the Network tab
3. Perform the actions you want to capture
4. Right-click anywhere in the network log
5. Select "Save All As HAR"
6. Save the file in this directory

## Analyzing HAR files

Place your HAR files in this directory, then run the analyzer:

```bash
cd debug
node har-analyzer.js
```

The analyzer will process all HAR files in this directory and generate analysis reports in the `har-analysis` directory.

You can also analyze a specific HAR file:

```bash
node har-analyzer.js path/to/your-file.har
```

## Privacy and Security

⚠️ **Important:** HAR files may contain sensitive information such as:
- Authentication tokens
- Session cookies
- Personal information
- API keys

Before sharing HAR files:
1. Review the content for sensitive information
2. Redact or remove any sensitive data
3. Never commit HAR files with sensitive information to version control

The `.gitignore` file is configured to exclude HAR files from being committed. 