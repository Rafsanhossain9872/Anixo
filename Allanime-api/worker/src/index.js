import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as scraper from './scraper.js';

const app = new Hono();
app.use('*', cors());

// Helper for Cache-Control and Manual Cache Management
const CACHE_NAME = 'allanime-api-v1';

async function getCachedResponse(request) {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
}

async function saveToCache(request, response, ttlSeconds) {
    // Only cache successful GET responses
    if (request.method !== 'GET' || response.status !== 200) return;

    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = new Response(response.body, response);
    
    // Set caching headers
    cachedResponse.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
    // Ensure CORS is preserved in cache
    cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    await cache.put(request, cachedResponse);
}

app.get('/', (c) => c.json({
    title: "Anime API (Cloudflare Worker Optimized)",
    status: "running",
    source: "Allanime Direct",
    cached: true,
    available_endpoints: [
        "/search?query=<query>",
        "/anime/<id>",
        "/thumbnails (POST with {'ids': ['id1', 'id2', ...]})",
        "/episodes/<id>?mode=<sub|dub>",
        "/episode_info?show_id=<id>&ep_no=<ep_no>",
        "/episode_url?show_id=<id>&ep_no=<ep_no>&quality=<quality>&mode=<sub|dub>",
        "/play?show_id=<id>&ep_no=<ep_no>&quality=<quality>&mode=<sub|dub> (streams video directly)"
    ]
}));

app.get('/search', async (c) => {
    const query = c.req.query('query') || '';
    if (!query) return c.json({ error: "Missing query parameter" }, 400);
    
    // 1. Try Cache
    const cached = await getCachedResponse(c.req.raw);
    if (cached) return cached;

    try {
        const results = await scraper.searchAnime(query);
        const res = c.json(results);
        
        // 2. Save to Cache (1 hour) - ONLY if we found results
        if (results && results.length > 0) {
            c.executionCtx.waitUntil(saveToCache(c.req.raw, res, 3600));
        }
        
        return res;
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/anime/:id', async (c) => {
    try {
        const id = c.req.param('id');
        
        // 1. Try Cache
        const cached = await getCachedResponse(c.req.raw);
        if (cached) return cached;

        const details = await scraper.getAnimeDetails(id);
        if (!details) return c.json({ error: "Anime not found on Allanime" }, 404);
        
        const res = c.json(details);
        // 2. Save to Cache (12 hours) - ONLY if details found
        if (details && details.id) {
            c.executionCtx.waitUntil(saveToCache(c.req.raw, res, 43200));
        }
        return res;
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/episodes/:id', async (c) => {
    const id = c.req.param('id');
    const mode = c.req.query('mode') === 'dub' ? 'dub' : 'sub';

    // 1. Try Cache
    const cached = await getCachedResponse(c.req.raw);
    if (cached) return cached;

    try {
        const episodes = await scraper.getEpisodesList(id, mode);
        const res = c.json({ mode, episodes });
        
        // 2. Save to Cache (2 hours) - ONLY if episodes found
        if (episodes && episodes.length > 0) {
            c.executionCtx.waitUntil(saveToCache(c.req.raw, res, 7200));
        }
        return res;
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/episode_url', async (c) => {
    const id = c.req.query('show_id');
    const epNo = c.req.query('ep_no');
    const quality = c.req.query('quality') || 'best';
    const mode = c.req.query('mode') === 'dub' ? 'dub' : 'sub';

    if (!id || !epNo) return c.json({ error: "Missing show_id or ep_no" }, 400);

    // 1. Try Cache
    const cached = await getCachedResponse(c.req.raw);
    if (cached) return cached;

    try {
        const url = await scraper.getEpisodeUrl(id, epNo, mode, quality);
        if (!url) return c.json({ error: "Episode not found or URL not available" }, 404);
        
        const res = c.json({ episode_url: url, mode });
        // 2. Save to Cache (1 hour)
        c.executionCtx.waitUntil(saveToCache(c.req.raw, res, 3600));
        return res;
    } catch (e) {
        const status = e.message && e.message.startsWith('NEED_CAPTCHA') ? 503 : 500;
        return c.json({ error: e.message }, status);
    }
});

app.get('/play', async (c) => {
    const id = c.req.query('show_id');
    const epNo = c.req.query('ep_no');
    const quality = c.req.query('quality') || 'best';
    const mode = c.req.query('mode') === 'dub' ? 'dub' : 'sub';

    if (!id || !epNo) return c.json({ error: "Missing show_id or ep_no" }, 400);

    try {
        const url = await scraper.getEpisodeUrl(id, epNo, mode, quality);
        if (!url) return c.json({ error: "Episode not found or URL not available" }, 404);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Referer': 'https://allmanga.to'
        };
        const range = c.req.header('Range');
        if (range) headers['Range'] = range;

        const videoResp = await fetch(url, { headers });

        const respHeaders = new Headers(videoResp.headers);
        respHeaders.set('Content-Type', 'video/mp4');
        respHeaders.set('Content-Disposition', 'inline');
        // Cache video streams for a reasonable amount of time (2 hours)
        respHeaders.set('Cache-Control', 'public, max-age=7200');
        
        return new Response(videoResp.body, {
            status: videoResp.status,
            headers: respHeaders
        });
    } catch (e) {
        const status = e.message && e.message.startsWith('NEED_CAPTCHA') ? 503 : 500;
        return c.json({ error: e.message }, status);
    }
});

app.get('/episode_info', async (c) => {
    const id = c.req.query('show_id');
    const epNo = c.req.query('ep_no');

    if (!id || !epNo) return c.json({ error: "Missing show_id or ep_no" }, 400);

    // 1. Try Cache
    const cached = await getCachedResponse(c.req.raw);
    if (cached) return cached;

    try {
        const info = await scraper.getEpisodeInfo(id, epNo);
        if (!info) return c.json({ error: "Episode info not found" }, 404);
        
        const res = c.json(info);
        // 2. Save to Cache (24 hours)
        c.executionCtx.waitUntil(saveToCache(c.req.raw, res, 86400));
        return res;
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/thumbnails', async (c) => {
    try {
        const body = await c.req.json();
        const inputIds = body.ids || body.mal_ids;

        if (!inputIds || !Array.isArray(inputIds)) {
            return c.json({ error: "Missing 'ids' list in request body" }, 400);
        }

        const results = {};
        for (const id of inputIds) {
            try {
                const details = await scraper.getAnimeDetails(id);
                if (details && details.thumbnail_url) {
                    results[id] = details.thumbnail_url;
                }
            } catch (err) { /* ignore */ }
        }

        return c.json(results);
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
