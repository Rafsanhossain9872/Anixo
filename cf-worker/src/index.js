import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if needed

const handler = serverless(app);

export default {
    async fetch(request, env, ctx) {
        // 1. CORS Preflight Bypass
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

        // 2. The Proxy Shield (Fixes the 'elb' undefined crash & read-only violations)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') return {}; // Fixes the AWS ALB 'elb' crash
                if (prop === 'env') return env; // Safe environment injection for Express
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, prop, value) {
                return true; // Silently absorb forbidden assignments (like request.body = ...)
            }
        });

        // 3. Execute with shielded request
        return await handler(proxiedRequest, ctx);
    }
};
