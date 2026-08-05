import http from 'http';
import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path

// --- THE ULTIMATE CORE STREAM PATCH ---
// serverless-http uses Node's http.ServerResponse under the hood.
// Cloudflare strictly requires _write on all Writable streams.
// By patching the core prototype, EVERY mock response created by serverless-http
// will inherently satisfy the Cloudflare stream contract.
if (http.ServerResponse && http.ServerResponse.prototype) {
    if (typeof http.ServerResponse.prototype._write !== 'function') {
        http.ServerResponse.prototype._write = function(chunk, encoding, callback) {
            if (typeof callback === 'function') callback();
        };
    }
}

const handler = serverless(app);

export default {
    async fetch(request, env, ctx) {
        // 1. Perfect CORS Preflight Bypass
        if (request.method === 'OPTIONS') {
            const requestedHeaders = request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With';
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': requestedHeaders,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // 2. The Upgraded Proxy Shield (Fixes AWS 'elb' and 'sourceIp' crashes)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    return { elb: {}, identity: { sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1' } };
                }
                if (prop === 'env') return env;
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set() { return true; } // Absorb read-only violations
        });

        // 3. Execute request
        return await handler(proxiedRequest, ctx);
    }
};
