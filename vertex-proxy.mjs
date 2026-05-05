import http from 'node:http';
import https from 'node:https';
import { execSync } from 'node:child_process';

const PORT = parseInt(process.env.VERTEX_PROXY_PORT || '18800');
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'YOUR_PROJECT_ID';
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const NODE_BIN = process.execPath;

let cachedToken = null;
let tokenExpiry = 0;

function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {return cachedToken;}
  console.log('[PROXY] Generando token fresco...');
  const token = execSync(`${NODE_BIN} /Users/lab/openclaw/scripts/get-vertex-token.mjs`).toString().trim();
  cachedToken = token;
  tokenExpiry = now + 3000 * 1000;
  return token;
}

function parseVertexStreamArray(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) {return [];}

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {}

  let body = trimmed;
  if (body.startsWith('[')) {body = body.slice(1);}
  if (body.endsWith(']')) {body = body.slice(0, -1);}
  body = body.trim();
  if (!body) {return [];}

  const normalized = `[${body.replace(/^,/, '')}]`;
  const parsed = JSON.parse(normalized);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function writeSse(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(404);
    return res.end();
  }

  const modelMatch = req.url.match(/models\/([^?:]+)/);
  const modelId = modelMatch ? modelMatch[1] : 'gemini-2.5-flash';

  const targetPath = `/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${modelId}:streamGenerateContent`;
  const targetUrl = `https://${REGION}-aiplatform.googleapis.com${targetPath}`;

  console.log(`[PROXY] [IN] ${req.method} ${req.url}`);
  console.log(`[PROXY] [OUT] ${targetUrl}`);

  try {
    const token = getToken();
    const headers = { ...req.headers };

    delete headers['x-goog-api-key'];
    delete headers['host'];
    delete headers['connection'];
    delete headers['content-length'];
    delete headers['accept-encoding'];

    headers['authorization'] = 'Bearer ' + token;
    headers['x-goog-user-project'] = PROJECT_ID;
    headers['host'] = `${REGION}-aiplatform.googleapis.com`;
    headers['content-type'] = 'application/json';
    headers['accept'] = 'text/event-stream';

    const proxyReq = https.request(targetUrl, {
      method: 'POST',
      headers,
      timeout: 60000
    }, (proxyRes) => {
      console.log(`[PROXY] Google Status: ${proxyRes.statusCode}`);

      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      proxyRes.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          const items = parseVertexStreamArray(raw);
          res.writeHead(proxyRes.statusCode || 500, {
            'content-type': 'text/event-stream; charset=UTF-8',
            'cache-control': 'no-cache, no-transform',
            'connection': 'keep-alive'
          });

          for (const item of items) {
            writeSse(res, item);
          }
          res.end();
        } catch (e) {
          console.error(`[PROXY] Error Normalizing SSE: ${e.message}`);
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'text/plain; charset=UTF-8' });
          }
          res.end('Proxy SSE normalization error');
        }
      });
    });

    req.pipe(proxyReq);
    proxyReq.on('error', (e) => {
      console.error(`[PROXY] Error Red: ${e.message}`);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end();
      }
    });
  } catch (err) {
    console.error(`[PROXY] Error Auth: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end();
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️ ADAPTADOR VERTEX ACTIVO EN PUERTO ${PORT}`);
});
