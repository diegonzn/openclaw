import { execSync } from 'node:child_process';

const originalSet = Headers.prototype.set;
const originalAppend = Headers.prototype.append;

function handleVertexHeaders(self, name, value) {
  const normalizedName = name.toLowerCase();
  if (normalizedName === 'x-goog-api-key' && (value === 'gcp-vertex-credentials' || value.includes('vertex'))) {
    try {
      // Generar token real
      const token = execSync('node /Users/lab/openclaw/scripts/get-vertex-token.mjs').toString().trim();
      originalSet.call(self, 'Authorization', 'Bearer ' + token);
      originalSet.call(self, 'x-goog-user-project', 'gen-lang-client-0610543079');
      // No devolvemos nada para que la API Key original no se guarde
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

Headers.prototype.set = function(name, value) {
  if (handleVertexHeaders(this, name, value)) {return;}
  return originalSet.call(this, name, value);
};

Headers.prototype.append = function(name, value) {
  if (handleVertexHeaders(this, name, value)) {return;}
  return originalAppend.call(this, name, value);
};

console.log('🚀 INTERCEPTOR VERTEX ACTIVO: Protegiendo peticiones de red...');
