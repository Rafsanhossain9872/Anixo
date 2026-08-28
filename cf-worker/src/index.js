/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Anixo/Tenzora Cloudflare Worker — Programmatic SEO Engine v2.0
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   1. SEO ENGINE    — HTMLRewriter injects dynamic meta/JSON-LD for /anime/* and /watch/*
 *   2. SITEMAP ENGINE — KV-backed pre-computed sitemaps (built by daily cron)
 *   3. EDGE PROXY    — Caches AniList & Jikan responses, proxies API calls to Render
 *   4. CRON SCHEDULER — AI bot triggers + sitemap pre-computation
 *
 * v2.0 Improvements:
 *   - KV-backed sitemaps (pre-computed by cron, sub-10ms response)
 *   - Streaming response teeing (zero-copy caching, minimal memory)
 *   - Exponential backoff retry for AniList API resilience
 *   - Exact slug matching with frontend slugify() logic
 */

// ═══════════════════════════════════════════
//  CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════

const RENDER_BACKEND_URL = 'https://anixo-wckh.onrender.com';
const FRONTEND_URL = 'https://anixo.pages.dev';
const SITE_NAME = 'Tenzora';
const SITE_URL = 'https://tenzora.top';

// Cache TTLs (seconds)
const ANILIST_CACHE_TTL = 60 * 60 * 24;     // 24h — anime metadata rarely changes
const JIKAN_CACHE_TTL = 60 * 60;             // 1h  — Jikan data is fairly static
const SEO_PAGE_CACHE_TTL = 60 * 60 * 4;      // 4h  — rewritten HTML pages
const SITEMAP_CACHE_TTL = 60 * 60 * 48;      // 48h — sitemap XML (KV-backed)

// Hreflang target languages (global audience)
const HREFLANG_LANGS = [
  'en', 'es', 'id', 'fr', 'de', 'pt', 'pt-BR', 'ar', 'ja',
  'ko', 'zh', 'ru', 'it', 'tr', 'th', 'vi', 'hi', 'ms', 'tl'
];

// Total sitemap pages to generate (50 anime per page = 500 anime coverage)
const SITEMAP_ANIME_PAGES = 10;

// Retry configuration for AniList API
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;

// ═══════════════════════════════════════════
//  EXACT FRONTEND SLUG MATCHING
// ═══════════════════════════════════════════
// Mirror of src/utils/url.js — slugify() and getWatchUrl()
// Must be a 1:1 match to avoid sitemap URLs 404-ing

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars (keeps underscores via \w)
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

function getWatchSlug(id, titleObj) {
  if (!id) return '';
  if (!titleObj) return '';
  const titleStr = typeof titleObj === 'string'
    ? titleObj
    : (titleObj.english || titleObj.romaji || titleObj.native || 'anime');
  return slugify(titleStr);
}

// ═══════════════════════════════════════════
//  ROUTE MATCHING
// ═══════════════════════════════════════════

function matchSEORoute(pathname) {
  // /watch/:animeId/:slug  (episode page)
  const watchMatch = pathname.match(/^\/watch\/(\d+)\//);
  if (watchMatch) return { type: 'watch', animeId: watchMatch[1] };

  // /anime/:animeId  (anime info page)
  const animeMatch = pathname.match(/^\/anime\/(\d+)/);
  if (animeMatch) return { type: 'anime', animeId: animeMatch[1] };

  return null;
}

function matchSitemapRoute(pathname) {
  if (pathname === '/sitemap.xml') return { type: 'sitemap-index' };
  if (pathname === '/sitemap-static.xml') return { type: 'sitemap-static' };
  if (pathname === '/sitemap-recent.xml') return { type: 'sitemap-recent' };
  const pageMatch = pathname.match(/^\/sitemap-anime-(\d+)\.xml$/);
  if (pageMatch) return { type: 'sitemap-anime', page: parseInt(pageMatch[1]) };
  return null;
}

// ═══════════════════════════════════════════
//  RESILIENT FETCH (Exponential Backoff)
// ═══════════════════════════════════════════

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Success or client error (4xx except 429) — don't retry
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        // Rate limited or server error — retry after backoff
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
          continue;
        }
        return res; // Return the last failed response
      }
      return res; // 4xx client error — return immediately
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error('fetchWithRetry exhausted all attempts');
}

// ═══════════════════════════════════════════
//  ANILIST DATA FETCHER (with edge caching + retry)
// ═══════════════════════════════════════════

const ANILIST_MEDIA_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id idMal
      title { romaji english native }
      description(asHtml: false)
      coverImage { large extraLarge }
      bannerImage
      episodes duration status format
      startDate { year month day }
      genres averageScore popularity
      studios(isMain: true) { nodes { name } }
      synonyms season seasonYear
      nextAiringEpisode { episode airingAt }
    }
  }
`;

const ANILIST_PAGE_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total lastPage hasNextPage }
      media(type: ANIME, sort: $sort, format_in: [TV, TV_SHORT, MOVIE, OVA, ONA, SPECIAL]) {
        id title { romaji english native }
        episodes updatedAt
      }
    }
  }
`;

async function fetchAnimeData(animeId) {
  const cache = caches.default;
  const cacheKey = `${SITE_URL}/cache/seo-anilist?id=${animeId}`;

  // 1. Check edge cache
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  // 2. Fetch from AniList with retry
  try {
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: ANILIST_MEDIA_QUERY, variables: { id: parseInt(animeId) } }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.Media;
    if (!media) return null;

    // 3. Store in edge cache
    const cacheRes = new Response(JSON.stringify(media), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${ANILIST_CACHE_TTL}`,
      },
    });
    await cache.put(cacheKey, cacheRes);
    return media;
  } catch (err) {
    console.error(`[AniList] fetchAnimeData(${animeId}) failed after retries:`, err.message);
    return null;
  }
}

async function fetchAnimeList(page, sort = 'POPULARITY_DESC') {
  const cache = caches.default;
  const cacheKey = `${SITE_URL}/cache/seo-anilist-list?page=${page}&sort=${sort}`;

  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  try {
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_PAGE_QUERY,
        variables: { page, perPage: 50, sort: [sort] },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const pageData = json?.data?.Page;
    if (!pageData) return null;

    const cacheRes = new Response(JSON.stringify(pageData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${SITEMAP_CACHE_TTL}`,
      },
    });
    await cache.put(cacheKey, cacheRes);
    return pageData;
  } catch (err) {
    console.error(`[AniList] fetchAnimeList(page=${page}) failed after retries:`, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════
//  SEO CONTENT GENERATORS
// ═══════════════════════════════════════════

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function cleanDesc(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 320);
}

function getTitle(anime) {
  return anime.title.english || anime.title.romaji || 'Unknown Anime';
}

function getRomaji(anime) {
  return anime.title.romaji || anime.title.english || 'Unknown';
}

function getImage(anime) {
  return anime.coverImage?.extraLarge || anime.coverImage?.large || `${SITE_URL}/og-image.png`;
}

function getISODate(d) {
  if (!d?.year) return new Date().toISOString().split('T')[0];
  return `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}`;
}

// ─── Dynamic Titles ───

function buildWatchTitle(anime, ep) {
  return `Watch ${getTitle(anime)} Episode ${ep} English Sub/Dub | ${SITE_NAME}`;
}

function buildAnimeTitle(anime) {
  const year = anime.seasonYear || anime.startDate?.year || '';
  return `${getTitle(anime)}${year ? ` (${year})` : ''} - Watch Online Free | ${SITE_NAME}`;
}

// ─── Multilingual Meta Description ───

function buildMultilingualDescription(anime, ep) {
  const en = getTitle(anime);
  const rom = getRomaji(anime);

  if (ep) {
    return `▶ Watch ${en} Episode ${ep} online free in HD. ` +
      `Ver ${rom} Episodio ${ep} Sub Español. ` +
      `Nonton ${rom} Episode ${ep} Sub Indo. ` +
      `Regarder ${rom} Épisode ${ep} VOSTFR. ` +
      `${en} Ep ${ep} 1080p stream on ${SITE_NAME}.`;
  }

  const desc = cleanDesc(anime.description);
  return `▶ Watch ${en} online free in HD on ${SITE_NAME}. ` +
    `Ver ${rom} Sub Español. Nonton ${rom} Sub Indo. ` +
    `Regarder ${rom} VOSTFR. ${desc}`;
}

// ─── Smart Keyword Generation ───

function buildKeywords(anime, ep) {
  const en = getTitle(anime);
  const rom = getRomaji(anime);
  const native = anime.title.native || '';
  const syns = (anime.synonyms || []).slice(0, 5);

  const kw = [
    en, rom, native,
    `${en} anime`, `watch ${en}`, `${en} online`, `${en} streaming`,
    `${en} sub`, `${en} dub`, `${en} english sub`, `${en} english dub`,
    `${en} 1080p`, `${en} HD`, `stream ${en}`,
    `${rom} sub`, `${rom} dub`,
    SITE_NAME, 'watch anime online', 'anime streaming', 'free anime',
    ...syns,
    ...(anime.genres || []),
  ];

  if (ep) {
    kw.push(
      `${en} episode ${ep}`, `${en} ep ${ep}`, `${rom} ep ${ep}`,
      `${en} e${ep}`, `watch ${en} episode ${ep}`,
      `${en} season`, `${rom} episode ${ep}`,
    );
  }

  return kw.filter(Boolean).map(k => esc(k)).join(', ');
}

// ─── Hreflang Tags ───

function buildHreflangTags(canonicalUrl) {
  let html = '';
  for (const lang of HREFLANG_LANGS) {
    html += `<link rel="alternate" hreflang="${lang}" href="${esc(canonicalUrl)}" />\n`;
  }
  html += `<link rel="alternate" hreflang="x-default" href="${esc(canonicalUrl)}" />\n`;
  return html;
}

// ═══════════════════════════════════════════
//  JSON-LD SCHEMA GENERATORS
// ═══════════════════════════════════════════

function buildVideoObjectLD(anime, ep, url) {
  const title = getTitle(anime);
  const desc = cleanDesc(anime.description) ||
    `Watch ${title} Episode ${ep} online in HD on ${SITE_NAME}.`;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `${title} Episode ${ep}`,
    description: desc,
    thumbnailUrl: [getImage(anime), anime.bannerImage].filter(Boolean),
    uploadDate: getISODate(anime.startDate),
    duration: anime.duration ? `PT${anime.duration}M` : 'PT24M',
    contentUrl: url,
    embedUrl: url,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: anime.popularity || 5000,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png` },
    },
    potentialAction: { '@type': 'WatchAction', target: url },
  });
}

function buildTVSeriesLD(anime, url) {
  const title = getTitle(anime);
  const studio = anime.studios?.nodes?.[0]?.name || '';
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: title,
    alternateName: [anime.title.romaji, anime.title.native].filter(Boolean),
    description: cleanDesc(anime.description) || `Watch ${title} on ${SITE_NAME}.`,
    image: getImage(anime),
    genre: anime.genres || [],
    url: url,
    numberOfEpisodes: anime.episodes || undefined,
  };
  if (studio) obj.productionCompany = { '@type': 'Organization', name: studio };
  if (anime.averageScore) {
    obj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (anime.averageScore / 10).toFixed(1),
      bestRating: '10',
      worstRating: '1',
      ratingCount: Math.max(500, Math.floor((anime.popularity || 5000) / 10)),
    };
  }
  return JSON.stringify(obj);
}

function buildBreadcrumbLD(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

function buildSearchActionLD() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/browse?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });
}

// ═══════════════════════════════════════════
//  HTMLREWRITER HANDLER CLASSES
// ═══════════════════════════════════════════

/** Replaces the <title> inner text */
class TitleRewriter {
  constructor(newTitle) { this.t = newTitle; }
  element(el) { el.setInnerContent(this.t); }
}

/** Overwrites existing <meta> tag content for description, OG, and Twitter */
class MetaRewriter {
  constructor(overrides) { this.o = overrides; }
  element(el) {
    const name = el.getAttribute('name');
    const prop = el.getAttribute('property');

    if (name === 'description' && this.o.description)
      el.setAttribute('content', this.o.description);
    if (name === 'title' && this.o.title)
      el.setAttribute('content', this.o.title);
    if (name === 'keywords' && this.o.keywords)
      el.setAttribute('content', this.o.keywords);

    // Open Graph
    if (prop === 'og:title' && this.o.title)
      el.setAttribute('content', this.o.title);
    if (prop === 'og:description' && this.o.description)
      el.setAttribute('content', this.o.description);
    if (prop === 'og:image' && this.o.image)
      el.setAttribute('content', this.o.image);
    if (prop === 'og:url' && this.o.url)
      el.setAttribute('content', this.o.url);
    if (prop === 'og:type' && this.o.ogType)
      el.setAttribute('content', this.o.ogType);

    // Twitter
    if (prop === 'twitter:title' && this.o.title)
      el.setAttribute('content', this.o.title);
    if (prop === 'twitter:description' && this.o.description)
      el.setAttribute('content', this.o.description);
    if (prop === 'twitter:image' && this.o.image)
      el.setAttribute('content', this.o.image);
    if (prop === 'twitter:url' && this.o.url)
      el.setAttribute('content', this.o.url);
  }
}

/** Overwrites the existing canonical <link> */
class CanonicalRewriter {
  constructor(url) { this.url = url; }
  element(el) {
    if (el.getAttribute('rel') === 'canonical') {
      el.setAttribute('href', this.url);
    }
  }
}

/** Appends new HTML tags just before </head> */
class HeadAppender {
  constructor(html) { this.html = html; this.done = false; }
  element(el) {
    if (!this.done) {
      el.append(this.html, { html: true });
      this.done = true;
    }
  }
}

/** Removes old JSON-LD scripts so we can inject fresh, page-specific ones */
class JsonLdRemover {
  element(el) {
    if (el.getAttribute('type') === 'application/ld+json') {
      el.remove();
    }
  }
}

// ═══════════════════════════════════════════
//  SEO PAGE HANDLER (Streaming HTMLRewriter)
// ═══════════════════════════════════════════

async function handleSEOPage(request, route, ctx) {
  const url = new URL(request.url);
  const canonicalUrl = `${SITE_URL}${url.pathname}${url.search}`;

  // 1. Check edge cache for the rewritten page
  const cache = caches.default;
  const cacheKey = `${SITE_URL}/cache/seo-page${url.pathname}${url.search}`;
  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log(`[SEO] Cache HIT: ${url.pathname}`);
    return cached;
  }

  // 2. Fetch HTML from CF Pages + anime data from AniList in parallel
  const [originRes, anime] = await Promise.all([
    fetch(`${FRONTEND_URL}${url.pathname}${url.search}`, {
      headers: { 'User-Agent': request.headers.get('User-Agent') || 'Tenzora-SEO-Worker' },
    }),
    fetchAnimeData(route.animeId),
  ]);

  // Fallback: if AniList fails, serve the un-rewritten page
  if (!anime) {
    console.log(`[SEO] AniList data unavailable for ID ${route.animeId}, serving raw origin`);
    return originRes;
  }

  const ep = url.searchParams.get('ep') || '1';
  const isWatch = route.type === 'watch';

  // 3. Build all SEO strings
  const seoTitle = isWatch ? buildWatchTitle(anime, ep) : buildAnimeTitle(anime);
  const seoDesc = buildMultilingualDescription(anime, isWatch ? ep : null);
  const seoKeywords = buildKeywords(anime, isWatch ? ep : null);
  const seoImage = getImage(anime);

  // 4. Build the HTML to append into <head>
  let appendHtml = '\n<!-- Tenzora SEO Engine v2.0 -->\n';

  // Hreflang tags
  appendHtml += buildHreflangTags(canonicalUrl);

  // JSON-LD schemas
  if (isWatch) {
    appendHtml += `<script type="application/ld+json">${buildVideoObjectLD(anime, ep, canonicalUrl)}</script>\n`;
    appendHtml += `<script type="application/ld+json">${buildBreadcrumbLD([
      { name: 'Home', url: SITE_URL },
      { name: getTitle(anime), url: `${SITE_URL}/anime/${route.animeId}` },
      { name: `Episode ${ep}`, url: canonicalUrl },
    ])}</script>\n`;
  } else {
    appendHtml += `<script type="application/ld+json">${buildTVSeriesLD(anime, canonicalUrl)}</script>\n`;
    appendHtml += `<script type="application/ld+json">${buildBreadcrumbLD([
      { name: 'Home', url: SITE_URL },
      { name: getTitle(anime), url: canonicalUrl },
    ])}</script>\n`;
  }
  appendHtml += `<script type="application/ld+json">${buildSearchActionLD()}</script>\n`;
  appendHtml += '<!-- /Tenzora SEO Engine v2.0 -->\n';

  // 5. Apply HTMLRewriter (streaming)
  const rewrittenResponse = new HTMLRewriter()
    .on('title', new TitleRewriter(seoTitle))
    .on('meta', new MetaRewriter({
      title: seoTitle,
      description: seoDesc,
      keywords: seoKeywords,
      image: seoImage,
      url: canonicalUrl,
      ogType: isWatch ? 'video.episode' : 'video.tv_show',
    }))
    .on('link', new CanonicalRewriter(canonicalUrl))
    .on('script[type="application/ld+json"]', new JsonLdRemover())
    .on('head', new HeadAppender(appendHtml))
    .transform(originRes);

  // 6. STREAMING RESPONSE TEEING
  //    Stream the rewritten HTML directly to the user while simultaneously
  //    piping a copy into the Cache API in the background.
  //    This keeps memory near zero — no .text() buffering.
  const { readable: userStream, writable: userWritable } = new TransformStream();
  const { readable: cacheStream, writable: cacheWritable } = new TransformStream();

  // Tee the HTMLRewriter output into both streams
  ctx.waitUntil(
    rewrittenResponse.body.pipeTo(new WritableStream({
      write(chunk) {
        const userWriter = userWritable.getWriter();
        const cacheWriter = cacheWritable.getWriter();
        return Promise.all([
          userWriter.write(chunk).then(() => userWriter.releaseLock()),
          cacheWriter.write(chunk).then(() => cacheWriter.releaseLock()),
        ]);
      },
      close() {
        return Promise.all([userWritable.close(), cacheWritable.close()]);
      },
      abort(reason) {
        userWritable.abort(reason);
        cacheWritable.abort(reason);
      },
    }))
  );

  // Background: put the cache stream copy into the CF edge cache
  const responseHeaders = {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': `s-maxage=${SEO_PAGE_CACHE_TTL}, public`,
    'X-SEO-Engine': 'Tenzora/2.0',
  };

  ctx.waitUntil(
    cache.put(cacheKey, new Response(cacheStream, { status: 200, headers: responseHeaders }))
  );

  console.log(`[SEO] Streaming & caching: ${url.pathname} → "${seoTitle}"`);
  return new Response(userStream, { status: 200, headers: responseHeaders });
}

// ═══════════════════════════════════════════
//  KV-BACKED SITEMAP ENGINE
// ═══════════════════════════════════════════
// Sitemaps are pre-computed by the daily cron and stored in KV.
// The fetch handler reads from KV for sub-10ms responses.
// Fallback: on-the-fly generation + edge cache if KV is empty.

function xmlResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': `s-maxage=${SITEMAP_CACHE_TTL}, public`,
      'X-Robots-Tag': 'noindex',
    },
  });
}

const EMPTY_SITEMAP = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`;

// ─── Sitemap XML Builders ───

function buildSitemapIndexXml() {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-static.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-recent.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  for (let i = 1; i <= SITEMAP_ANIME_PAGES; i++) {
    xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-anime-${i}.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  }
  xml += `</sitemapindex>`;
  return xml;
}

function buildStaticSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    '/', '/home', '/browse', '/popular', '/movies',
    '/schedule', '/community', '/random',
  ];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const path of staticPages) {
    xml += `  <url>\n    <loc>${escXml(SITE_URL + path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

function buildAnimeListSitemapXml(animeList, priority = 0.7) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const anime of animeList) {
    const slug = getWatchSlug(anime.id, anime.title);

    // Anime info page
    xml += `  <url>\n    <loc>${escXml(`${SITE_URL}/anime/${anime.id}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${(priority + 0.1).toFixed(1)}</priority>\n  </url>\n`;

    // Episode pages (use exact frontend slug)
    const eps = Math.min(anime.episodes || 12, 100);
    for (let ep = 1; ep <= eps; ep++) {
      const loc = slug
        ? `${SITE_URL}/watch/${anime.id}/${slug}?ep=${ep}`
        : `${SITE_URL}/watch/${anime.id}?ep=${ep}`;
      xml += `  <url>\n    <loc>${escXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>\n`;
    }
  }

  xml += `</urlset>`;
  return xml;
}

// ─── KV Read / Fallback ───

async function serveSitemap(kvKey, buildFallbackFn, env, ctx) {
  // 1. Try KV first (sub-10ms)
  if (env.SEO_KV) {
    const kvValue = await env.SEO_KV.get(kvKey);
    if (kvValue) {
      console.log(`[Sitemap] KV HIT: ${kvKey}`);
      return xmlResponse(kvValue);
    }
  }

  // 2. Fallback: edge cache
  const cache = caches.default;
  const edgeCacheKey = `${SITE_URL}/cache/${kvKey}`;
  const cached = await cache.match(edgeCacheKey);
  if (cached) {
    console.log(`[Sitemap] Edge cache HIT: ${kvKey}`);
    return cached;
  }

  // 3. Final fallback: build on-the-fly
  console.log(`[Sitemap] KV + cache MISS: ${kvKey}, building on-the-fly`);
  const xml = await buildFallbackFn();
  const res = xmlResponse(xml);
  ctx.waitUntil(cache.put(edgeCacheKey, res.clone()));
  return res;
}

// ─── Sitemap Route Handlers ───

async function handleSitemapIndex(env, ctx) {
  return serveSitemap('sitemap-index', () => buildSitemapIndexXml(), env, ctx);
}

async function handleSitemapStatic(env, ctx) {
  return serveSitemap('sitemap-static', () => buildStaticSitemapXml(), env, ctx);
}

async function handleSitemapRecent(env, ctx) {
  return serveSitemap('sitemap-recent', async () => {
    const data = await fetchAnimeList(1, 'TRENDING_DESC');
    if (!data?.media) return EMPTY_SITEMAP;
    return buildAnimeListSitemapXml(data.media, 0.9);
  }, env, ctx);
}

async function handleSitemapAnimePage(page, env, ctx) {
  if (page < 1 || page > SITEMAP_ANIME_PAGES) {
    return new Response('Not Found', { status: 404 });
  }
  return serveSitemap(`sitemap-anime-${page}`, async () => {
    const data = await fetchAnimeList(page, 'POPULARITY_DESC');
    if (!data?.media) return EMPTY_SITEMAP;
    return buildAnimeListSitemapXml(data.media, 0.6);
  }, env, ctx);
}

// ─── CRON: Pre-compute all sitemaps into KV ───

async function precomputeSitemaps(env) {
  if (!env.SEO_KV) {
    console.error('[Sitemap Cron] SEO_KV binding not found, skipping pre-computation');
    return;
  }

  console.log('[Sitemap Cron] Starting sitemap pre-computation...');
  const kvTtl = 60 * 60 * 48; // 48h expiration

  // 1. Sitemap index (pure computation, no API call)
  await env.SEO_KV.put('sitemap-index', buildSitemapIndexXml(), { expirationTtl: kvTtl });
  console.log('[Sitemap Cron] ✓ sitemap-index');

  // 2. Static sitemap
  await env.SEO_KV.put('sitemap-static', buildStaticSitemapXml(), { expirationTtl: kvTtl });
  console.log('[Sitemap Cron] ✓ sitemap-static');

  // 3. Recent/trending sitemap
  const recentData = await fetchAnimeList(1, 'TRENDING_DESC');
  if (recentData?.media) {
    await env.SEO_KV.put('sitemap-recent', buildAnimeListSitemapXml(recentData.media, 0.9), { expirationTtl: kvTtl });
    console.log('[Sitemap Cron] ✓ sitemap-recent');
  }

  // 4. Paginated anime sitemaps (with 1s delay between pages to respect AniList rate limits)
  for (let page = 1; page <= SITEMAP_ANIME_PAGES; page++) {
    const pageData = await fetchAnimeList(page, 'POPULARITY_DESC');
    if (pageData?.media) {
      await env.SEO_KV.put(
        `sitemap-anime-${page}`,
        buildAnimeListSitemapXml(pageData.media, 0.6),
        { expirationTtl: kvTtl }
      );
      console.log(`[Sitemap Cron] ✓ sitemap-anime-${page}`);
    }
    // Rate limit: 1s between AniList API calls
    if (page < SITEMAP_ANIME_PAGES) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('[Sitemap Cron] ✅ All sitemaps pre-computed and stored in KV');
}

// ═══════════════════════════════════════════
//  EXISTING: AniList & Jikan Edge Proxies
// ═══════════════════════════════════════════

function buildAnilistCacheKey(url, body) {
  try {
    const vars = body.variables || {};
    const keyParts = Object.keys(vars).sort().map(k => `${k}=${vars[k]}`).join('&');
    return new URL(`${url.origin}/cache/anilist?${keyParts}`);
  } catch {
    return null;
  }
}

async function handleAnilistProxy(request, origin) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const url = new URL(request.url);
    const cacheKey = buildAnilistCacheKey(url, body);

    if (cacheKey) {
      const cache = caches.default;
      const cached = await cache.match(new Request(cacheKey.toString()));
      if (cached) {
        const cachedBody = await cached.text();
        return new Response(cachedBody, {
          status: 200,
          headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        });
      }
    }

    const anilistResponse = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await anilistResponse.text();

    if (anilistResponse.ok && cacheKey) {
      try {
        const parsed = JSON.parse(responseText);
        const hasData = parsed?.data?.Media || parsed?.data?.Page;
        if (hasData && !parsed?.errors) {
          const cache = caches.default;
          await cache.put(
            new Request(cacheKey.toString()),
            new Response(responseText, {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Cache-Control': `s-maxage=${ANILIST_CACHE_TTL}` },
            })
          );
        }
      } catch { /* skip caching on parse failure */ }
    }

    return new Response(responseText, {
      status: anilistResponse.status,
      headers: { ...corsHeaders, 'X-Cache': 'MISS' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'AniList proxy failed', detail: error.message }), {
      status: 502,
      headers: corsHeaders,
    });
  }
}

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

    const cacheKeyUrl = new URL(`${url.origin}/cache/jikan${jikanPath}`);
    const cache = caches.default;
    const cached = await cache.match(new Request(cacheKeyUrl.toString()));
    if (cached) {
      const cachedBody = await cached.text();
      return new Response(cachedBody, {
        status: 200,
        headers: { ...corsHeaders, 'X-Cache': 'HIT' },
      });
    }

    const jikanResponse = await fetch(`https://api.jikan.moe${jikanPath}`, {
      headers: { 'Accept': 'application/json' },
    });

    const responseText = await jikanResponse.text();

    if (jikanResponse.ok) {
      await cache.put(
        new Request(cacheKeyUrl.toString()),
        new Response(responseText, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `s-maxage=${JIKAN_CACHE_TTL}` },
        })
      );
    }

    return new Response(responseText, {
      status: jikanResponse.status,
      headers: { ...corsHeaders, 'X-Cache': 'MISS' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Jikan proxy failed', detail: error.message }), {
      status: 502,
      headers: corsHeaders,
    });
  }
}

// ═══════════════════════════════════════════
//  ROBOTS.TXT
// ═══════════════════════════════════════════

function handleRobotsTxt() {
  const body = `User-agent: *
Allow: /
Allow: /anime/
Allow: /watch/
Allow: /browse
Allow: /popular
Allow: /movies
Allow: /schedule
Disallow: /api/
Disallow: /auth/
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL}
`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 's-maxage=86400' },
  });
}

// ═══════════════════════════════════════════
//  MAIN WORKER EXPORT
// ═══════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '*';
    const backendUrl = env.RENDER_BACKEND_URL || RENDER_BACKEND_URL;
    const url = new URL(request.url);

    // ── 0. OPTIONS PREFLIGHT ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ── 1. ROBOTS.TXT ──
    if (url.pathname === '/robots.txt') {
      return handleRobotsTxt();
    }

    // ── 2. SITEMAP ENGINE (KV-backed) ──
    const sitemapRoute = matchSitemapRoute(url.pathname);
    if (sitemapRoute) {
      switch (sitemapRoute.type) {
        case 'sitemap-index':  return handleSitemapIndex(env, ctx);
        case 'sitemap-static': return handleSitemapStatic(env, ctx);
        case 'sitemap-recent': return handleSitemapRecent(env, ctx);
        case 'sitemap-anime':  return handleSitemapAnimePage(sitemapRoute.page, env, ctx);
      }
    }

    // ── 3. ANILIST PROXY (edge-cached) ──
    if (url.pathname === '/api/anilist/proxy' && request.method === 'POST') {
      return handleAnilistProxy(request, origin);
    }

    // ── 4. JIKAN PROXY (edge-cached) ──
    if (url.pathname === '/api/jikan/proxy' && request.method === 'GET') {
      return handleJikanProxy(request, origin);
    }

    // ── 5. SEO ENGINE — intercept /anime/:id and /watch/:id/:slug ──
    if (request.method === 'GET') {
      const seoRoute = matchSEORoute(url.pathname);
      if (seoRoute) {
        try {
          return await handleSEOPage(request, seoRoute, ctx);
        } catch (err) {
          console.error('[SEO] Rewrite failed, falling back to origin:', err.message);
          return fetch(`${FRONTEND_URL}${url.pathname}${url.search}`);
        }
      }
    }

    // ── 6. ALL OTHER API REQUESTS — proxy to Render backend ──
    const proxyUrl = backendUrl + url.pathname + url.search;
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') || '127.0.0.1');
    proxyHeaders.set('X-Forwarded-Proto', 'https');
    proxyHeaders.set('X-Real-IP', request.headers.get('cf-connecting-ip') || '127.0.0.1');
    proxyHeaders.delete('cf-connecting-ip');
    proxyHeaders.delete('cf-ipcountry');
    proxyHeaders.delete('cf-ray');
    proxyHeaders.delete('cf-visitor');

    try {
      const proxyResponse = await fetch(proxyUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(proxyResponse.headers);
      responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.set('X-Edge-Location', request.cf?.colo || 'unknown');

      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('[CF Proxy] Failed to reach Render backend:', error);
      return new Response(
        JSON.stringify({ error: 'Edge proxy error: Backend unreachable', detail: error.message }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    }
  },

  // ═══════════════════════════════════════════
  //  CRON SCHEDULER
  // ═══════════════════════════════════════════

  async scheduled(event, env, ctx) {
    const backendUrl = env.RENDER_BACKEND_URL || RENDER_BACKEND_URL;

    try {
      // ── AI Bot Crons ──
      if (event.cron === '*/30 * * * *') {
        console.log('Running 30m cron: triggering checkAndPost');
        await fetch(`${backendUrl}/ai-bot/cron/post`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
      } else if (event.cron === '*/10 * * * *') {
        console.log('Running 10m cron: triggering checkAndReply');
        await fetch(`${backendUrl}/ai-bot/cron/reply`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
      } else if (event.cron === '*/15 * * * *') {
        console.log('Running 15m cron: triggering episode comments');
        await fetch(`${backendUrl}/ai-bot/cron/episode-comment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
      }

      // ── Sitemap Pre-computation Cron (daily at midnight UTC) ──
      if (event.cron === '0 0 * * *') {
        console.log('Running daily cron: pre-computing sitemaps into KV');
        await precomputeSitemaps(env);
      }
    } catch (error) {
      console.error('Scheduled cron proxy failed:', error);
    }
  },
};
