import { Writable } from 'node:stream';
import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust this path if necessary to point to your Express app!

// 1. THE CORE STREAM PATCH (Fixes _write crash)
if (Writable && Writable.prototype && typeof Writable.prototype._write !== 'function') {
    Writable.prototype._write = function (chunk, encoding, callback) {
        if (typeof callback === 'function') callback();
    };
}

const handler = serverless(app);

export default {
    async fetch(request, env, ctx) {
        // 2. OPTIONS PREFLIGHT BYPASS (Fixes CORS & OPTIONS crashes)
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

        // 3. THE PROXY SHIELD (Fixes AWS ctx crashes & Read-Only mutation crashes)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    // Mock AWS API Gateway context for serverless-http
                    return {
                        elb: {},
                        identity: {
                            sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1'
                        }
                    };
                }
                if (prop === 'env') return env; // Safely inject env variables
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, prop, value) {
                // Silently absorb read-only violations (like request.body = ...)
                return true; 
            }
        });

        // 4. EXECUTE REQUEST
        return await handler(proxiedRequest, ctx);
    }
};
