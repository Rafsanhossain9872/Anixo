/**
 * Anixo Cloudflare Worker — Smart Edge Proxy
 * 
 * Architecture: Cloudflare Worker acts as a global edge proxy that forwards
 * all API requests to the Render backend. This gives you:
 * - Global edge CDN (requests hit the nearest CF data center)
 * - Automatic CORS handling
 * - DDoS protection from Cloudflare
 * - Future: edge caching for GET requests
 * 
 * Why not run Express directly? Mongoose (MongoDB ODM) is fundamentally
 * incompatible with CF Workers — it requires Node.js net.Socket/tls which
 * esbuild cannot bundle for V8 Isolates.
 */

const RENDER_BACKEND_URL = 'https://anixo-wckh.onrender.com';

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '*';
        const backendUrl = env.RENDER_BACKEND_URL || RENDER_BACKEND_URL;

        // 1. OPTIONS PREFLIGHT — handle instantly at the edge
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400', // Cache preflight for 24h
                }
            });
        }

        // 2. BUILD PROXIED REQUEST
        const url = new URL(request.url);
        const proxyUrl = backendUrl + url.pathname + url.search;

        // Forward all headers, add the real client IP
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') || '127.0.0.1');
        proxyHeaders.set('X-Forwarded-Proto', 'https');
        proxyHeaders.set('X-Real-IP', request.headers.get('cf-connecting-ip') || '127.0.0.1');
        // Remove CF-specific headers that might confuse the backend
        proxyHeaders.delete('cf-connecting-ip');
        proxyHeaders.delete('cf-ipcountry');
        proxyHeaders.delete('cf-ray');
        proxyHeaders.delete('cf-visitor');

        try {
            // 3. FORWARD TO RENDER
            const proxyResponse = await fetch(proxyUrl, {
                method: request.method,
                headers: proxyHeaders,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                redirect: 'follow',
            });

            // 4. ADD CORS HEADERS TO RESPONSE
            const responseHeaders = new Headers(proxyResponse.headers);
            responseHeaders.set('Access-Control-Allow-Origin', origin);
            responseHeaders.set('Access-Control-Allow-Credentials', 'true');
            // Add edge performance header
            responseHeaders.set('X-Edge-Location', request.cf?.colo || 'unknown');

            return new Response(proxyResponse.body, {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                headers: responseHeaders,
            });

        } catch (error) {
            console.error('[CF Proxy] Failed to reach Render backend:', error);
            return new Response(JSON.stringify({ 
                error: 'Edge proxy error: Backend unreachable',
                detail: error.message 
            }), {
                status: 502,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }
    },

    async scheduled(event, env, ctx) {
        // Cron jobs: Forward to the Render backend via HTTP
        const backendUrl = env.RENDER_BACKEND_URL || RENDER_BACKEND_URL;
        
        try {
            if (event.cron === "*/30 * * * *") {
                console.log('Running 30m cron: triggering checkAndPost');
                await fetch(`${backendUrl}/ai-bot/cron/post`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` }
                });
            } else if (event.cron === "*/10 * * * *") {
                console.log('Running 10m cron: triggering checkAndReply');
                await fetch(`${backendUrl}/ai-bot/cron/reply`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` }
                });
            }
        } catch (error) {
            console.error('Scheduled cron proxy failed:', error);
        }
    }
};
