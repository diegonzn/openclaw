import fs from 'node:fs';
import crypto from 'node:crypto';
import https from 'node:https';

async function getAccessToken() {
  try {
    const json = JSON.parse(fs.readFileSync('/Users/lab/.openclaw/vertex-key.json', 'utf8'));
    
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const claim = JSON.stringify({
      iss: json.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    });

    const base64 = (s) => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = base64(header) + '.' + base64(claim);
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(json.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = unsignedToken + '.' + signature;
    const postData = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt;
    
    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.access_token) {
            process.stdout.write(result.access_token);
          } else {
            process.exit(1);
          }
        } catch (e) {
          process.exit(1);
        }
      });
    });
    req.on('error', () => process.exit(1));
    req.write(postData);
    req.end();
  } catch (err) {
    process.exit(1);
  }
}

getAccessToken();
