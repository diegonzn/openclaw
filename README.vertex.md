# OpenClaw Vertex AI Bridge 🚀

This branch provides a high-performance integration for Google Vertex AI within OpenClaw, enabling real-time streaming and full tool-calling (agentic) support.

## Features

- **Real-time SSE Streaming**: No more buffering. See Gemini think and type instantly.
- **Automated OAuth2**: Handles Google Cloud token generation automatically using your service account key.
- **Tool-Calling Optimized**: Specifically tuned for `gemini-2.5-flash-lite` and `gemini-2.5-flash` to support multi-agent loops and tool execution.
- **Zero Hardcoded Paths**: Fully portable and secure. All sensitive data is managed via environment variables.

## Setup Instructions

### 1. Prerequisites
- A Google Cloud Project with Vertex AI API enabled.
- A Service Account Key in JSON format.
- Place your key at `~/.openclaw/vertex-key.json`.

### 2. Environment Configuration
Create a `.env` file in the `openclaw` root directory:

```env
GOOGLE_CLOUD_PROJECT=your-project-id-here
GOOGLE_CLOUD_REGION=us-central1
VERTEX_PROXY_PORT=18800
```

### 3. Model Registration
Add the Vertex provider to your `~/.openclaw/openclaw.json` (or your specific agent's `models.json`):

```json
"google-vertex": {
  "baseUrl": "http://127.0.0.1:18800",
  "apiKey": "gcp-vertex-credentials",
  "api": "google-generative-ai",
  "models": [
    {
      "id": "gemini-2.5-flash-lite",
      "name": "Gemini 2.5 Flash Lite",
      "contextWindow": 1048576,
      "reasoning": true
    }
  ]
}
```

### 4. Enable Multi-Agent Productivity
To allow Gemini to spawn sub-agents (like Codex does), ensure the `sessions_spawn` tool is allowed in your `openclaw.json`:

```json
"agents": {
  "defaults": {
    "tools": {
      "alsoAllow": ["sessions_spawn"]
    }
  }
}
```

## Running the Bridge
The bridge runs as a background interceptor when you start OpenClaw using `./openclaw.mjs`. It automatically injects tokens and transforms Vertex responses into OpenClaw-compatible SSE streams.

---
*Contributed by the **[fierai.com](https://fierai.com)** team to improve the OpenClaw ecosystem.*
