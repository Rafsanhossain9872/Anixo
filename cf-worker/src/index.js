import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Verify and adjust this import path to match your repo structure!

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

        // 2. The Proxy Shield (Critical Fix for 'elb', 'sourceIp', and read-only crashes)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    // Feed dummy AWS API Gateway data to serverless-http to prevent cleanup crash
                    return {
                        elb: {},
                        identity: {
                            sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1'
                        }
                    };
                }
                if (prop === 'env') return env; // Safe env injection
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, prop, value) {
                // Silently absorb read-only violations (like request.body = ...)
                return true; 
            }
        });

        // 3. Execute request safely
        return await handler(proxiedRequest, ctx);
    }
};
