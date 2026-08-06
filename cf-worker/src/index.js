import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if necessary!

// --- THE V8 PROTOTYPE PATCH (THE FINAL FIX) ---
const wrappedApp = (req, res) => {
    // Grab the actual class prototype of the mock response
    const proto = Object.getPrototypeOf(res);
    
    // Inject the missing stream methods directly into the class blueprint.
    // This bypasses the native C++ engine's strict checks.
    if (proto && !proto.hasOwnProperty('_write')) {
        proto._write = function(chunk, encoding, cb) {
            if (typeof cb === 'function') cb();
        };
    }
    if (proto && !proto.hasOwnProperty('_writev')) {
        proto._writev = function(chunks, cb) {
            if (typeof cb === 'function') cb();
        };
    }

    // Execute the actual Express app
    return app(req, res);
};

const handler = serverless(wrappedApp);

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

        // 2. The Proxy Shield (Fixes 'elb' and 'sourceIp' crashes)
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

        // 3. Execute
        return await handler(proxiedRequest, ctx);
    }
};
