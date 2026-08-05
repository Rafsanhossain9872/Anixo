import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if necessary!

// --- THE ULTIMATE STREAM INTERCEPTOR ---
// serverless-http creates a mock ServerResponse that fails to implement _write().
// By intercepting app.handle, we catch the raw response object at the exact millisecond 
// it is handed from serverless-http to Express, guaranteeing the polyfill is applied.
const originalHandle = app.handle.bind(app);
app.handle = function(req, res, callback) {
    if (typeof res._write !== 'function') {
        res._write = function(chunk, encoding, cb) {
            // Satisfy the strict Cloudflare nodejs_compat Writable contract
            if (typeof cb === 'function') cb();
        };
    }
    return originalHandle(req, res, callback);
};

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

        // 2. The Upgraded Proxy Shield (Fixes 'elb' and 'sourceIp' crashes)
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
                // Silently absorb read-only violations
                return true; 
            }
        });

        // 3. Execute request safely
        return await handler(proxiedRequest, ctx);
    }
};
