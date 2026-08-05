import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if needed!

// --- THE FOOLPROOF STREAM FIX ---
// Patching the Express response prototype directly.
// This ensures _write is globally available before any routes are executed,
// bypassing any middleware stack ordering issues that caused the previous crash.
if (app && app.response) {
    app.response._write = function (chunk, encoding, callback) {
        // Satisfy Cloudflare's strict Writable nodejs_compat contract
        if (typeof callback === 'function') callback();
    };
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

        // 2. The UPGRADED Proxy Shield (Fixes 'elb' and 'sourceIp' crashes)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    // Mock AWS API Gateway context
                    return {
                        elb: {},
                        identity: {
                            sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1'
                        }
                    };
                }
                if (prop === 'env') return env;
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, prop, value) {
                return true; // Absorb read-only violations silently
            }
        });

        // 3. Execute
        return await handler(proxiedRequest, ctx);
    }
};
