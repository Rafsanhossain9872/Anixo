/**
 * Anixo Cloudflare Worker — Smart Edge Proxy
 * 
 * Architecture: Cloudflare Worker acts as a global edge proxy that forwards
 * all API requests to the Render backend. This gives you:
 * - Global edge CDN (requests hit the nearest CF data center)
 * - Automatic CORS handling
 * - DDoS protection from Cloudflare
 * - Edge caching for AniList & Jikan API responses (eliminates 429 rate limits)
 * 
 * Why not run Express directly? Mongoose (MongoDB ODM) is fundamentally
 * incompatible with CF Workers — it requires Node.js net.Socket/tls which
 * esbuild cannot bundle for V8 Isolates.
 */

const RENDER_BACKEND_URL = 'https://anixo-wckh.onrender.com';

// Cache TTLs (in seconds)
const ANILIST_CACHE_TTL = 60 * 60 * 24; // 24 hours — anime metadata rarely changes
const JIKAN_CACHE_TTL = 60 * 60;        // 1 hour  — Jikan data is also fairly static

/**
 * Generates a deterministic cache key from an AniList GraphQL payload.
 * We hash the variables (id/idMal) to create a unique, cacheable URL.
 */
function buildAnilistCacheKey(url, body) {
    try {
        const vars = body.variables || {};
        // Create a stable key from the query variables
        const keyParts = Object.keys(vars).sort().map(k => `${k}=${vars[k]}`).join('&');
        return new URL(`${url.origin}/cache/anilist?${keyParts}`);
    } catch {
        return null;
    }
}

/**
 * Handles AniList GraphQL proxy requests with aggressive edge caching.
 * POST /api/anilist/proxy → forwards to graphql.anilist.co, caches 24h
 */
async function handleAnilistProxy(request, origin) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };

    try {
        // Parse the incoming GraphQL payload
        const body = await request.json();
        const url = new URL(request.url);
        const cacheKey = buildAnilistCacheKey(url, body);

        // 1. Try cache first
        if (cacheKey) {
            const cache = caches.default;
            const cached = await cache.match(new Request(cacheKey.toString()));
            if (cached) {
                console.log('[AniList Cache] HIT:', cacheKey.searchParams.toString());
                const cachedBody = await cached.text();
                return new Response(cachedBody, {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        'X-Cache': 'HIT',
                        'X-Edge-Cache-TTL': ANILIST_CACHE_TTL.toString(),
                    },
                });
            }
        }

        // 2. Cache MISS — fetch from AniList directly
        console.log('[AniList Cache] MISS — fetching from graphql.anilist.co');
        const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const responseText = await anilistResponse.text();

        // 3. Only cache successful responses that contain actual data
        if (anilistResponse.ok && cacheKey) {
            try {
                const parsed = JSON.parse(responseText);
                const hasData = parsed?.data?.Media || parsed?.data?.Page;
                const hasErrors = parsed?.errors;

                if (hasData && !hasErrors) {
                    const cache = caches.default;
                    const cacheResponse = new Response(responseText, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': `s-maxage=${ANILIST_CACHE_TTL}`,
                        },
                    });
                    // Store in edge cache (non-blocking)
                    await cache.put(new Request(cacheKey.toString()), cacheResponse);
                    console.log('[AniList Cache] STORED:', cacheKey.searchParams.toString());
                }
            } catch {
                // JSON parse failed, don't cache
            }
        }

        return new Response(responseText, {
            status: anilistResponse.status,
            headers: {
                ...corsHeaders,
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('[AniList Proxy] Error:', error.message);
        return new Response(JSON.stringify({ error: 'AniList proxy failed', detail: error.message }), {
            status: 502,
            headers: corsHeaders,
        });
    }
}

/**
 * Handles Jikan API proxy requests with edge caching.
 * GET /api/jikan/proxy?path=/v4/anime/269 → forwards to api.jikan.moe, caches 1h
 */
async function handleJikanProxy(request, origin) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };

    try {
        const url = new URL(request.url);
        const jikanPath = url.searchParams.get('path');

        if (!jikanPath) {
            return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        // Build cache key from the Jikan path
        const cacheKeyUrl = new URL(`${url.origin}/cache/jikan${jikanPath}`);
        const cache = caches.default;

        // 1. Try cache first
        const cached = await cache.match(new Request(cacheKeyUrl.toString()));
        if (cached) {
            console.log('[Jikan Cache] HIT:', jikanPath);
            const cachedBody = await cached.text();
            return new Response(cachedBody, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'X-Cache': 'HIT',
                },
            });
        }

        // 2. Cache MISS — fetch from Jikan
        console.log('[Jikan Cache] MISS — fetching:', jikanPath);
        const jikanResponse = await fetch(`https://api.jikan.moe${jikanPath}`, {
            headers: { 'Accept': 'application/json' },
        });

        const responseText = await jikanResponse.text();

        // 3. Cache successful responses
        if (jikanResponse.ok) {
            const cacheResponse = new Response(responseText, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': `s-maxage=${JIKAN_CACHE_TTL}`,
                },
            });
            await cache.put(new Request(cacheKeyUrl.toString()), cacheResponse);
            console.log('[Jikan Cache] STORED:', jikanPath);
        }

        return new Response(responseText, {
            status: jikanResponse.status,
            headers: {
                ...corsHeaders,
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('[Jikan Proxy] Error:', error.message);
        return new Response(JSON.stringify({ error: 'Jikan proxy failed', detail: error.message }), {
            status: 502,
            headers: corsHeaders,
        });
    }
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '*';
        const backendUrl = env.RENDER_BACKEND_URL || RENDER_BACKEND_URL;
        const url = new URL(request.url);

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

        // 2. ANILIST PROXY — intercept at edge, cache responses (don't send to Render)
        if (url.pathname === '/api/anilist/proxy' && request.method === 'POST') {
            return handleAnilistProxy(request, origin);
        }

        // 3. JIKAN PROXY — intercept at edge, cache responses (don't send to Render)
        if (url.pathname === '/api/jikan/proxy' && request.method === 'GET') {
            return handleJikanProxy(request, origin);
        }

        // 4. ALL OTHER REQUESTS — proxy to Render backend
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
            // FORWARD TO RENDER
            const proxyResponse = await fetch(proxyUrl, {
                method: request.method,
                headers: proxyHeaders,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                redirect: 'manual',
            });

            // ADD CORS HEADERS TO RESPONSE
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
            } else if (event.cron === "*/15 * * * *") {
                console.log('Running 15m cron: triggering episode comments');
                await fetch(`${backendUrl}/ai-bot/cron/episode-comment`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` }
                });
            }
        } catch (error) {
            console.error('Scheduled cron proxy failed:', error);
        }
    }
};
