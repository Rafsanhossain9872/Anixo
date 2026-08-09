import serverless from 'serverless-http';

let handler; 

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '*';

        // 1. PROCESS.ENV POLYFILL
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        // 2. OPTIONS PREFLIGHT
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // 3. LAZY LOAD APP (STANDARD INIT - NO MONKEY PATCHING)
        if (!handler) {
            const appModule = await import('../../backend-core/src/app.js');
            const app = appModule.default || appModule;
            handler = serverless(app);
        }

        // 4. PROXY REQUEST
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') return { elb: {}, identity: { sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1' } };
                if (prop === 'env') return env; 
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set() { return true; } 
        });

        // 5. EXECUTE & ADD CORS
        try {
            const response = await handler(proxiedRequest, ctx);
            const corsHeaders = new Headers(response.headers || {});
            corsHeaders.set('Access-Control-Allow-Origin', origin);
            corsHeaders.set('Access-Control-Allow-Credentials', 'true');
            
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: corsHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin
                }
            });
        }
    },
    
    async scheduled(event, env, ctx) {
        // 1. PROCESS.ENV POLYFILL
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        try {
            // 2. CONNECT DB
            const connectDB = (await import('../../backend-core/src/config/db.js')).default;
            await connectDB(env);

            // 3. LOAD WORKER
            const { initializeBots, checkAndPost, checkAndReply } = await import('../../backend-core/src/workers/aiBotWorker.js');
            await initializeBots();

            // 4. ROUTE CRON
            if (event.cron === "*/30 * * * *") {
                console.log('Running 30m cron: checkAndPost');
                await checkAndPost();
            } else if (event.cron === "*/10 * * * *") {
                console.log('Running 10m cron: checkAndReply');
                await checkAndReply();
            } else {
                console.log(`Unknown cron trigger: ${event.cron}`);
            }
        } catch (error) {
            console.error('Scheduled event failed:', error);
        }
    }
};
