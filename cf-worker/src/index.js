import serverless from 'serverless-http';

let handler; 
const requestDataStore = new Map();

function addCorsHeaders(response, origin) {
    const corsHeaders = new Headers(response.headers || {});
    corsHeaders.set('Access-Control-Allow-Origin', origin || '*');
    corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api, Accept, X-Requested-With, x-rescue-id');
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
        const reqId = crypto.randomUUID();

        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        if (!handler) {
            const appModule = await import('../../backend-core/src/app.js');
            const app = appModule.default || appModule;

            const wrappedApp = (req, res) => {
                const originalJson = res.json.bind(res);
                const originalSend = res.send.bind(res);
                
                const captureData = (body) => {
                    const id = req.headers['x-rescue-id'];
                    if (id) {
                        requestDataStore.set(id, {
                            body: typeof body === 'object' ? JSON.stringify(body) : body,
                            status: res.statusCode || 200,
                        });
                    }
                };

                res.json = function(body) {
                    captureData(body);
                    return originalJson(body);
                };
                
                res.send = function(body) {
                    captureData(body);
                    return originalSend(body);
                };

                return app(req, res);
            };

            handler = serverless(wrappedApp);
        }

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

        const newHeaders = new Headers(request.headers);
        newHeaders.set('x-rescue-id', reqId);
        
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'headers') return newHeaders;
                if (prop === 'requestContext') return { elb: {}, identity: { sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1' } };
                if (prop === 'env') return env; 
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set() { return true; } 
        });

        try {
            const response = await handler(proxiedRequest, ctx);
            requestDataStore.delete(reqId);
            return addCorsHeaders(response, origin);
        } catch (error) {
            if (error.message && error.message.includes('_write') && requestDataStore.has(reqId)) {
                const rescued = requestDataStore.get(reqId);
                requestDataStore.delete(reqId);
                
                const fallbackResponse = new Response(rescued.body, {
                    status: rescued.status,
                    headers: { 'Content-Type': 'application/json' }
                });
                return addCorsHeaders(fallbackResponse, origin);
            }

            requestDataStore.delete(reqId);
            const errorResponse = new Response(JSON.stringify({ 
                error: error.message || 'Internal Server Error',
                stack: error.stack
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
            return addCorsHeaders(errorResponse, origin);
        }
    }
};
