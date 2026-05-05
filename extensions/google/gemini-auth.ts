import { parseGoogleOauthApiKey } from "./oauth-token-shared.js";

export function parseGeminiAuth(apiKey: string): { headers: Record<string, string> } {
  // Vertex AI Patch: Support OAuth Bearer Token and Project ID
  if (apiKey === 'gcp-vertex-credentials' || apiKey.startsWith('ya29.')) {
    try {
      const { execSync } = require('node:child_process');
      const os = require('node:os');
      const path = require('node:path');
      
      let token = '';
      if (apiKey.startsWith('ya29.')) {
        token = apiKey;
      } else {
        const keyPath = process.env.VERTEX_KEY_PATH || path.join(os.homedir(), '.openclaw', 'vertex-key.json');
        const scriptPath = path.resolve(process.cwd(), 'scripts', 'get-vertex-token.mjs');
        token = execSync(`"${process.execPath}" "${scriptPath}"`).toString().trim();
      }
      
      const headers: Record<string, string> = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      };

      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'YOUR_PROJECT_ID';
      headers['x-goog-user-project'] = projectId;

      return { headers };
    } catch (err) {
      // Fallback
    }
  }

  const parsed = apiKey.startsWith("{") ? parseGoogleOauthApiKey(apiKey) : null;
  if (parsed?.token) {
    return {
      headers: {
        Authorization: `Bearer ${parsed.token}`,
        "Content-Type": "application/json",
      },
    };
  }

  return {
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
  };
}
