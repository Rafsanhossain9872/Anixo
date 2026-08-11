// Cloudflare Pages Function: Proxies backend API routes to HuggingFace Space
// This replaces Vercel's rewrites in vercel.json

// Backend URL is now pulled from Cloudflare Environment Variables (context.env.VITE_BACKEND_API)

// Routes that should be proxied to the backend
const PROXY_PATHS = ['/api', '/auth', '/watchlist', '/progress', '/settings', '/notifications', '/users', '/ai', '/community'];

// Frontend page routes that overlap with backend routes
const FRONTEND_OVERLAPS = ['/settings', '/watchlist', '/notifications', '/community'];

function shouldProxy(request, pathname) {
  const isOverlap = FRONTEND_OVERLAPS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isOverlap) {
    // Only proxy overlap routes if it's an API request from the frontend app (marked by x-api header)
    return request.headers.get('x-api') === 'true';
  }
  return PROXY_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only proxy backend routes — let everything else pass through (static files, SPA)
  if (!shouldProxy(context.request, url.pathname)) {
    return context.next();
  }

  // Handle CORS preflight (OPTIONS)
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Build target URL using environment variable
  const backendUrl = context.env.VITE_BACKEND_API;
  const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

  // Clone headers, remove host
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');  // Avoid HF proxy conflicts

  const init = {
    method: context.request.method,
    headers,
  };

  // Forward request body for non-GET/HEAD
  if (!['GET', 'HEAD'].includes(context.request.method)) {
    init.body = context.request.body;
  }

  try {
    const response = await fetch(targetUrl, init);

    // Add CORS headers to response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('set-cookie');  // Remove any HF cookies

    // Explicitly forward cache diagnostic headers from the Worker
    // (Cloudflare internal routing can strip custom headers between Pages ↔ Workers)
    const cacheStatus = response.headers.get('X-Cache');
    const edgeLocation = response.headers.get('X-Edge-Location');
    const edgeCacheTTL = response.headers.get('X-Edge-Cache-TTL');
    if (cacheStatus) responseHeaders.set('X-Cache', cacheStatus);
    if (edgeLocation) responseHeaders.set('X-Edge-Location', edgeLocation);
    if (edgeCacheTTL) responseHeaders.set('X-Edge-Cache-TTL', edgeCacheTTL);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Backend unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
