import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cf-worker/src/index.js';

test('worker rejects requests when RENDER_BACKEND_URL is not configured', async () => {
  const response = await worker.fetch(new Request('https://tenzora.top/auth/google', { method: 'POST' }), {}, {});
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'RENDER_BACKEND_URL environment variable is missing in Cloudflare Worker settings.',
  });
});

test('edge sitemap uses catalog revisions and production-only canonical URLs', async t => {
  const entries = new Map();
  const previousCaches = globalThis.caches;
  globalThis.caches = {
    default: {
      async match(key) { return entries.get(key.url || String(key))?.clone(); },
      async put(key, response) { entries.set(key.url || String(key), response.clone()); },
    },
  };
  t.after(() => {
    if (previousCaches === undefined) delete globalThis.caches;
    else globalThis.caches = previousCaches;
  });

  t.mock.method(globalThis, 'fetch', async url => {
    const target = String(url);
    if (target.endsWith('/api/seo/catalog/version')) return Response.json({ success: true, revision: 7 });
    if (target.includes('/api/seo/catalog/sitemap?')) {
      return Response.json({ success: true, entries: [{
        canonicalId: 'anime-edge-fixture',
        slug: 'edge-fixture--abc12345',
        titles: { canonical: 'Edge Fixture' },
        indexable: true,
        description: 'A sufficiently detailed fixture synopsis for sitemap eligibility and freshness testing.',
        updatedAt: '2026-10-07T00:00:00.000Z',
        episodes: [{ number: 1, title: 'The Edge Fixture', uniqueMetadata: true, available: true, updatedAt: '2026-10-07T00:00:00.000Z' }],
      }] });
    }
    throw new Error(`Unexpected edge request: ${target}`);
  });

  const tasks = [];
  const response = await worker.fetch(
    new Request('https://tenzora.top/sitemap.xml'),
    { RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil(promise) { tasks.push(promise); } },
  );
  await Promise.all(tasks);
  const body = await response.text();

  const recentTasks = [];
  const recentResponse = await worker.fetch(
    new Request('https://tenzora.top/sitemap-recent.xml'),
    { RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil(promise) { recentTasks.push(promise); } },
  );
  await Promise.all(recentTasks);
  const recentBody = await recentResponse.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/xml/);
  assert.match(body, /https:\/\/tenzora\.top\/sitemap-anime-1\.xml/);
  assert.match(body, /https:\/\/tenzora\.top\/sitemap-recent\.xml/);
  assert.match(recentBody, /https:\/\/tenzora\.top\/anime\/edge-fixture--abc12345/);
  assert.match(recentBody, /https:\/\/tenzora\.top\/anime\/edge-fixture--abc12345\/episode\/1/);
  assert.doesNotMatch(`${body}${recentBody}`, /pages\.dev|anixo\.buzz|watch\//);
});

test('edge serves every catalog sitemap page advertised by the index', async t => {
  const previousCaches = globalThis.caches;
  const entries = new Map();
  globalThis.caches = {
    default: {
      async match(key) { return entries.get(key.url || String(key))?.clone(); },
      async put(key, response) { entries.set(key.url || String(key), response.clone()); },
    },
  };
  t.after(() => {
    if (previousCaches === undefined) delete globalThis.caches;
    else globalThis.caches = previousCaches;
  });

  t.mock.method(globalThis, 'fetch', async url => {
    const target = String(url);
    if (target.endsWith('/api/seo/catalog/version')) {
      return Response.json({ success: true, revision: 8, pages: 192 });
    }
    if (target.includes('/api/seo/catalog/sitemap?page=192')) {
      return Response.json({ success: true, entries: [{
        canonicalId: 'anime-page-192-fixture',
        slug: 'page-192-fixture--abc12345',
        titles: { canonical: 'Page 192 Fixture' },
        indexable: true,
        description: 'A sufficiently detailed fixture synopsis for page one hundred ninety-two sitemap routing.',
        episodes: [],
      }] });
    }
    throw new Error(`Unexpected sitemap request: ${target}`);
  });

  const indexWaits = [];
  const indexResponse = await worker.fetch(
    new Request('https://tenzora.top/sitemap.xml'),
    { RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil(promise) { indexWaits.push(promise); } },
  );
  await Promise.all(indexWaits);
  const indexBody = await indexResponse.text();
  assert.equal(indexResponse.status, 200);
  assert.match(indexBody, /https:\/\/tenzora\.top\/sitemap-anime-192\.xml/);

  const waits = [];
  const response = await worker.fetch(
    new Request('https://tenzora.top/sitemap-anime-192.xml'),
    { RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil(promise) { waits.push(promise); } },
  );
  await Promise.all(waits);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/xml/);
  assert.match(body, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(body, /https:\/\/tenzora\.top\/anime\/page-192-fixture--abc12345/);
});

test('edge robots policy keeps public SEO routes crawlable and exposes the catalog dependency', async () => {
  const response = await worker.fetch(
    new Request('https://tenzora.top/robots.txt'),
    {},
    { waitUntil() {} },
  );
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /^User-agent: \*/m);
  assert.match(body, /^Allow: \/$/m);
  assert.match(body, /^Allow: \/api\/seo\/catalog\/$/m);
  assert.match(body, /^Sitemap: https:\/\/tenzora\.top\/sitemap\.xml$/m);
  assert.match(body, /^Disallow: \/community$/m);
  assert.doesNotMatch(body, /Host:/u);
});

test('edge rewrites static sitemap pages with route-specific SEO metadata', async t => {
  const previousRewriter = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class {
    on() { return this; }
    transform(response) { return response; }
  };
  t.after(() => {
    if (previousRewriter === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = previousRewriter;
  });

  let requestedUrl;
  t.mock.method(globalThis, 'fetch', async url => {
    requestedUrl = String(url);
    return new Response('<!doctype html><html><head><title>Generic</title></head><body></body></html>', {
      headers: { 'content-type': 'text/html' },
    });
  });

  const response = await worker.fetch(
    new Request('https://tenzora.top/browse?search=one+piece'),
    { FRONTEND_URL: 'https://frontend.example' },
    { waitUntil() {} },
  );

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, 'https://frontend.example/browse?search=one+piece');
  assert.equal(response.headers.get('X-SEO-Engine'), 'Tenzora/3.0');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('edge worker sends public pages and assets to the configured frontend origin', async t => {
  let requestedUrl;
  t.mock.method(globalThis, 'fetch', async url => {
    requestedUrl = String(url);
    return new Response('frontend-origin');
  });

  const response = await worker.fetch(
    new Request('https://tenzora.top/home?source=test'),
    { FRONTEND_URL: 'https://frontend.example' },
    { waitUntil() {} },
  );

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, 'https://frontend.example/home?source=test');
  assert.equal(await response.text(), 'frontend-origin');
});

test('frontend overlap routes stay in the SPA unless marked as API requests', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(String(url));
    return new Response('ok');
  });

  await worker.fetch(
    new Request('https://tenzora.top/settings?success=anilist_connected'),
    { FRONTEND_URL: 'https://frontend.example', RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil() {} },
  );
  assert.equal(requests.at(-1), 'https://frontend.example/settings?success=anilist_connected');

  await worker.fetch(
    new Request('https://tenzora.top/settings', { headers: { 'x-api': 'true' } }),
    { FRONTEND_URL: 'https://frontend.example', RENDER_BACKEND_URL: 'https://backend.example' },
    { waitUntil() {} },
  );
  assert.equal(requests.at(-1), 'https://backend.example/settings');
});

test('canonical anime routes reach the HTML rewrite path after catalog resolution', async t => {
  const previousCaches = globalThis.caches;
  const previousRewriter = globalThis.HTMLRewriter;
  const entries = new Map();
  globalThis.caches = {
    default: {
      async match(key) { return entries.get(key.url || String(key))?.clone(); },
      async put(key, response) { entries.set(key.url || String(key), response.clone()); },
    },
  };
  // Node does not provide Cloudflare's HTMLRewriter. This focused double
  // verifies that route/catalog resolution reaches the rewrite stage instead
  // of silently returning the raw frontend shell.
  globalThis.HTMLRewriter = class {
    on() { return this; }
    transform(response) { return response; }
  };
  t.after(() => {
    if (previousCaches === undefined) delete globalThis.caches;
    else globalThis.caches = previousCaches;
    if (previousRewriter === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = previousRewriter;
  });

  const catalog = {
    canonicalId: 'anime-edge-ssr-fixture',
    slug: 'edge-ssr-fixture--abc12345',
    providerIds: { anilist: '151807', mal: '52299' },
    titles: { canonical: 'Edge SSR Fixture', english: 'Edge SSR Fixture', romaji: 'Edge SSR Fixture', native: 'エッジ SSR', synonyms: [] },
    description: 'A sufficiently detailed synopsis for testing canonical server-rendered metadata.',
    image: 'https://images.example/edge-ssr.jpg',
    format: 'TV',
    episodeCount: 1,
    episodes: [],
    characters: [],
    metadataState: 'complete',
    indexable: true,
    revision: 9,
  };
  const media = {
    id: 151807,
    idMal: 52299,
    title: { english: 'Edge SSR Fixture', romaji: 'Edge SSR Fixture', native: 'エッジ SSR' },
    description: catalog.description,
    coverImage: { large: catalog.image, extraLarge: catalog.image },
    format: 'TV',
    episodes: 1,
    genres: ['Action'],
    synonyms: [],
  };
  t.mock.method(globalThis, 'fetch', async url => {
    const target = String(url);
    if (target.includes('/api/seo/catalog/resolve/')) return Response.json({ success: true, entry: catalog });
    if (target === 'https://graphql.anilist.co') return Response.json({ data: { Media: media } });
    if (target.includes('/api/seo/catalog/upsert')) return Response.json({ success: true, entry: catalog });
    if (target.startsWith('https://frontend.example/')) return new Response(
      '<!doctype html><html><head><title>Generic</title><meta name="description" content="Generic"><link rel="canonical" href="https://tenzora.top/"></head><body></body></html>',
      { headers: { 'content-type': 'text/html' } },
    );
    throw new Error(`Unexpected edge request: ${target}`);
  });

  const waits = [];
  const response = await worker.fetch(
    new Request('https://tenzora.top/anime/edge-ssr-fixture--abc12345'),
    { RENDER_BACKEND_URL: 'https://backend.example', INTERNAL_SERVICE_SECRET: 'test-secret', FRONTEND_URL: 'https://frontend.example' },
    { waitUntil(promise) { waits.push(promise); } },
  );
  await Promise.all(waits);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-SEO-Engine'), 'Tenzora/3.0');
  assert.equal(response.headers.get('X-SEO-Revision'), '9');
});

test('edge provider proxy retries transient failures with bounded upstream handling', async t => {
  const previousCaches = globalThis.caches;
  const entries = new Map();
  globalThis.caches = {
    default: {
      async match(key) { return entries.get(key.url || String(key))?.clone(); },
      async put(key, response) { entries.set(key.url || String(key), response.clone()); },
    },
  };
  t.after(() => {
    if (previousCaches === undefined) delete globalThis.caches;
    else globalThis.caches = previousCaches;
  });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).startsWith('https://api.jikan.moe/')) {
      calls += 1;
      if (calls === 1) return new Response('temporary failure', { status: 503 });
      return Response.json({ data: { mal_id: 1 } });
    }
    throw new Error(`Unexpected provider request: ${url}`);
  });
  const response = await worker.fetch(
    new Request('https://tenzora.top/api/jikan/proxy?path=/v4/anime/1'),
    {},
    { waitUntil() {} },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.equal((await response.json()).data.mal_id, 1);
});
