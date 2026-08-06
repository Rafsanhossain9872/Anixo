import { Writable } from 'node:stream';
import serverless from 'serverless-http';
// ⚠️ DO NOT statically import app.js here. It must be dynamically imported below.

// 1. THE CORE STREAM PATCH
if (Writable && Writable.prototype && typeof Writable.prototype._write !== 'function') {
    Writable.prototype._write = function (chunk, encoding, callback) {
        if (typeof callback === 'function') callback();
    };
}

let handler; // Globally cache the serverless handler for performance across hot requests

// Helper to append CORS natively to all responses
function addCorsHeaders(response, origin) {
    const corsHeaders = new Headers(response.headers);
    corsHeaders.set('Access-Control-Allow-Origin', origin || '*');
    corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api, Accept, X-Requested-With');
    corsHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders
    });
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin');

        // 2. PROCESS.ENV POLYFILL
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        // 3. LAZY LOAD EXPRESS APP (THE MAGIC FIX)
        // Dynamically import the app ONLY AFTER process.env is injected.
        // This guarantees Mongoose and Google OAuth controllers have their keys.
        if (!handler) {
            const appModule = await import('../../backend-core/src/app.js'); // Verify path!
            const app = appModule.default || appModule;
            handler = serverless(app);
        }

        // 4. OPTIONS PREFLIGHT BYPASS
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin || '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // 5. THE PROXY SHIELD
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

        // 6. EXECUTE REQUEST
        try {
            const response = await handler(proxiedRequest, ctx);
            return addCorsHeaders(response, origin);
        } catch (error) {
            const errorResponse = new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
            return addCorsHeaders(errorResponse, origin);
        }
    }
};
