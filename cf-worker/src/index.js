import { Writable } from 'node:stream';
import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if necessary

// 1. THE CORE STREAM PATCH (Fixes _write crash)
if (Writable && Writable.prototype && typeof Writable.prototype._write !== 'function') {
    Writable.prototype._write = function (chunk, encoding, callback) {
        if (typeof callback === 'function') callback();
    };
}

const handler = serverless(app);

export default {
    async fetch(request, env, ctx) {
        // 2. THE PROCESS.ENV POLYFILL (Crucial for DB and JWT)
        // Cloudflare doesn't populate process.env automatically. 
        // We map the Cloudflare `env` object into globalThis.process.env so Express routes find them.
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        // 3. OPTIONS PREFLIGHT BYPASS
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

        // 4. THE PROXY SHIELD
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    return { elb: {}, identity: { sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1' } };
                }
                if (prop === 'env') return env; 
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set() { return true; } 
        });

        // 5. EXECUTE EXPRESS APP
        return await handler(proxiedRequest, ctx);
    }
};
