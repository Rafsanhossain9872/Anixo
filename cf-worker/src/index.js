/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Anixo/Tenzora Cloudflare Worker — Programmatic SEO Engine v2.1
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   1. SEO ENGINE    — HTMLRewriter injects dynamic meta/JSON-LD for /anime/* and /watch/*
 *   2. SITEMAP ENGINE — Edge-cached sitemaps (built on-demand, 48h TTL)
 *   3. EDGE PROXY    — Caches AniList & Jikan responses, proxies API calls to Render
 *   4. CRON SCHEDULER — AI bot triggers
 *
 * v2.1 Improvements over v2.0:
 *   - Fixed streaming tee race condition (uses native .tee())
 *   - Fixed watch route matching for URLs without slug
 *   - Fixed Twitter meta tags (check both name and property)
 *   - Cache key sanitization (strips tracking params like utm_source, fbclid)
 *   - Missing meta tags (keywords, robots) now always injected
 *   - Removed dead KV code paths for cleaner edge-cache-only architecture
 */

// ═══════════════════════════════════════════
//  CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════

import {
  SEO_SITE_URL,
  buildCharacterSlug,
  getEpisode,
  isUsefulAnime,
  isUsefulEpisode,
  normalizeAnime,
  normalizeSearchText,
} from '../../seoCatalogModel.mjs';

// This is an internal origin fetch target only. It must never be used in
// canonical, Open Graph, schema, robots, or sitemap output.
const FRONTEND_URL = 'https://anixo.pages.dev';
const SITE_NAME = 'Tenzora';
const SITE_URL = SEO_SITE_URL;

const MISSING_BACKEND_URL_MESSAGE = 'RENDER_BACKEND_URL environment variable is missing in Cloudflare Worker settings.';

function getBackendUrl(env = {}) {
  return String(env.RENDER_BACKEND_URL || '').trim().replace(/\/+$/, '');
}

function missingBackendUrlResponse(origin = '*') {
  return new Response(JSON.stringify({ success: false, message: MISSING_BACKEND_URL_MESSAGE }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
    },
  });
}

const STATIC_SEO_ROUTES = Object.freeze({
  '/home': {
    canonicalPath: '/',
    title: 'Watch Free Anime Online, Stream Subbed & Dubbed HD - TenZora',
    description: 'Discover anime series, movies, and episodes on TenZora. Explore popular titles and watch subbed and dubbed anime online.',
  },
  '/browse': {
    canonicalPath: '/browse',
    title: 'Browse Anime Series and Movies - TenZora',
    description: 'Browse anime series and movies on TenZora. Discover titles by genre, format, season, and popularity.',
  },
  '/schedule': {
    canonicalPath: '/schedule',
    title: 'Anime Release Schedule - TenZora',
    description: 'Find upcoming anime episodes and airing times with the TenZora anime release schedule.',
  },
  '/dmca': {
    canonicalPath: '/dmca',
    title: 'DMCA and Copyright Policy - TenZora',
    description: 'Read the TenZora copyright policy and learn how to submit a copyright removal request.',
  },
  '/terms': {
    canonicalPath: '/terms',
    title: 'Terms of Service - TenZora',
    description: 'Read the terms of service for using TenZora anime discovery and streaming services.',
  },
});

// Cache TTLs (seconds)
const ANILIST_CACHE_TTL = 60 * 60 * 2;       // 2h  — new episodes surface faster
const JIKAN_CACHE_TTL = 60 * 60;             // 1h  — Jikan data is fairly static
const CATALOG_REFRESH_LIMIT = 12;
const CATALOG_LIST_CACHE_TTL = 60 * 10;

// Hreflang target languages (global audience)
const HREFLANG_LANGS = [
  'en', 'es', 'id', 'fr', 'de', 'pt', 'pt-BR', 'ar', 'ja',
  'ko', 'zh', 'ru', 'it', 'tr', 'th', 'vi', 'hi', 'ms', 'tl'
];

// Default sitemap pages used only when the catalog version endpoint is
// unavailable. When the catalog is available, both the index and child routes
// use its page count so the index never advertises unreachable child files.
const SITEMAP_ANIME_PAGES = 10;

// Retry configuration for AniList API
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;
const PROVIDER_TIMEOUT_MS = 10000;
const PROVIDER_CIRCUIT_OPEN_MS = 30000;
const providerCircuit = new Map();

// ═══════════════════════════════════════════
//  EXACT FRONTEND SLUG MATCHING
// ═══════════════════════════════════════════
// Mirror of src/utils/url.js — slugify() and getWatchUrl()
// Must be a 1:1 match to avoid sitemap URLs 404-ing

function _slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars (keeps underscores via \w)
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

// ═══════════════════════════════════════════
//  ROUTE MATCHING
// ═══════════════════════════════════════════

function matchSEORoute(pathname) {
  const safeDecode = value => {
    try { return decodeURIComponent(value); } catch { return null; }
  };
  const episodeMatch = pathname.match(/^\/anime\/([^/]+)\/episode\/(\d+)$/);
  if (episodeMatch) {
    const slug = safeDecode(episodeMatch[1]);
    return slug ? { type: 'anime-episode', slug, episode: Number(episodeMatch[2]) } : null;
  }

  const animeMatch = pathname.match(/^\/anime\/([^/]+)$/);
  if (animeMatch) {
    const slug = safeDecode(animeMatch[1]);
    if (!slug) return null;
    return /^\d{1,12}$/.test(slug) ? { type: 'anime-id', animeId: slug } : { type: 'anime', slug };
  }

  const characterMatch = pathname.match(/^\/character\/([^/]+)$/);
  if (characterMatch) {
    const slug = safeDecode(characterMatch[1]);
    if (!slug) return null;
    return /^\d{1,12}$/.test(slug) ? { type: 'character-id', characterId: slug } : { type: 'character', slug };
  }

  // Legacy routes remain crawlable and playable, but their canonical URL is
  // resolved through the normalized catalog below.
  const watchMatch = pathname.match(/^\/watch\/(\d+)/);
  if (watchMatch) return { type: 'watch', animeId: watchMatch[1] };

  return null;
}

function matchStaticSEORoute(pathname) {
  return STATIC_SEO_ROUTES[pathname] ? { pathname, ...STATIC_SEO_ROUTES[pathname] } : null;
}

function matchSitemapRoute(pathname) {
  if (pathname === '/sitemap.xml') return { type: 'sitemap-index' };
  if (pathname === '/sitemap-static.xml') return { type: 'sitemap-static' };
  if (pathname === '/sitemap-recent.xml') return { type: 'sitemap-recent' };
  const pageMatch = pathname.match(/^\/sitemap-anime-(\d+)\.xml$/);
  if (pageMatch) return { type: 'sitemap-anime', page: parseInt(pageMatch[1]) };
  return null;
}

function setNoStore(headers) {
  headers.set('Cache-Control', 'no-store');
  headers.set('CDN-Cache-Control', 'no-store');
}

function setImmutableAssetCache(headers) {
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
}

function isHashedAssetPath(pathname) {
  return /^\/assets\//u.test(pathname);
}

function noStoreResponse(response) {
  const headers = new Headers(response.headers);
  setNoStore(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sitemapUnavailableResponse() {
  return new Response(EMPTY_SITEMAP, {
    status: 503,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Retry-After': '30',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
    },
  });
}

// ═══════════════════════════════════════════
//  RESILIENT FETCH (Exponential Backoff)
// ═══════════════════════════════════════════

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  const requestOptions = options || {};
  let origin = 'unknown';
  try { origin = new URL(url).origin; } catch { /* validation is handled by the upstream request */ }
  const circuit = providerCircuit.get(origin);
  if (circuit?.openUntil > Date.now()) throw new Error(`Provider circuit open for ${origin}`);

  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('upstream_timeout'), requestOptions.timeoutMs || PROVIDER_TIMEOUT_MS);
    const parentSignal = requestOptions.signal;
    const abortParent = () => controller.abort(parentSignal.reason);
    if (parentSignal) {
      if (parentSignal.aborted) controller.abort(parentSignal.reason);
      else parentSignal.addEventListener('abort', abortParent, { once: true });
    }
    try {
      const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = requestOptions;
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      // Success or client error (4xx except 429) — don't retry
      if (res.ok) {
        providerCircuit.delete(origin);
        return res;
      }
      if (res.status === 429 || res.status >= 500) {
        // Rate limited or server error — retry after backoff
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < retries - 1) {
          const retryAfter = Number(res.headers.get('retry-after'));
          const delay = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 10000) : RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
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
    } finally {
      clearTimeout(timeout);
      if (parentSignal) parentSignal.removeEventListener('abort', abortParent);
    }
  }
  const failures = (providerCircuit.get(origin)?.failures || 0) + 1;
  providerCircuit.set(origin, { failures, openUntil: failures >= retries ? Date.now() + PROVIDER_CIRCUIT_OPEN_MS : 0 });
  throw lastError || new Error('fetchWithRetry exhausted all attempts');
}

function catalogApiBase(env = {}) {
  return getBackendUrl(env);
}

function catalogSecret(env = {}) {
  return env.INTERNAL_SERVICE_SECRET || env.CRON_SECRET || '';
}

async function fetchCatalogApi(pathname, env = {}, { internal = false } = {}) {
  const headers = { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
  if (internal && catalogSecret(env)) headers['x-seo-catalog-secret'] = catalogSecret(env);
  const response = await fetchWithRetry(`${catalogApiBase(env)}${pathname}`, { headers });
  if (!response.ok) return null;
  const body = await response.json();
  return body?.entry || body;
}

async function fetchCatalogBySlug(slug, env = {}) {
  if (!slug || slug.length > 120) return null;
  try {
    return await fetchCatalogApi(`/api/seo/catalog/resolve/${encodeURIComponent(slug)}`, env);
  } catch (error) {
    console.warn(`[Catalog] slug lookup failed: ${error.message}`);
    return null;
  }
}

async function fetchCatalogByProvider(provider, id, env = {}) {
  if (!id || !/^\d{1,12}$/.test(String(id))) return null;
  try {
    return await fetchCatalogApi(`/api/seo/catalog/provider/${provider}/${encodeURIComponent(id)}`, env);
  } catch (error) {
    console.warn(`[Catalog] provider lookup failed: ${error.message}`);
    return null;
  }
}

async function fetchCatalogSearch(query, env = {}) {
  const safeQuery = normalizeSearchText(query, { maxLength: 256 });
  if (!safeQuery) return [];
  try {
    const data = await fetchCatalogApi(`/api/seo/catalog/search?q=${encodeURIComponent(safeQuery)}`, env);
    return data?.results || [];
  } catch (error) {
    console.warn(`[Catalog] search lookup failed: ${error.message}`);
    return [];
  }
}

async function fetchCatalogState(env = {}) {
  try {
    const version = await fetchCatalogApi('/api/seo/catalog/version', env);
    const revision = version?.revision;
    if (revision === null || revision === undefined || !/^\d+$/u.test(String(revision))) return null;
    const pages = Number(version?.pages);
    return {
      revision: String(revision),
      pages: Number.isSafeInteger(pages) && pages > 0 ? pages : SITEMAP_ANIME_PAGES,
    };
  } catch {
    return null;
  }
}

function catalogRevision(value) {
  if (value === null || value === undefined || !/^\d+$/u.test(String(value))) return null;
  return String(value);
}

function sitemapPageCount(catalogState = {}) {
  const pages = Number(catalogState.pages);
  return Math.min(10000, Math.max(1, Number.isFinite(pages) ? Math.ceil(pages) : SITEMAP_ANIME_PAGES));
}

async function fetchCatalogVersion(env = {}) {
  return (await fetchCatalogState(env))?.revision || null;
}

async function fetchCatalogSitemapPage(page, env = {}) {
  try {
    const data = await fetchCatalogApi(`/api/seo/catalog/sitemap?page=${page}&limit=50`, env);
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch {
    return null;
  }
}

async function upsertCatalogEntry(env, media) {
  const normalized = media?.titles?.canonical ? media : normalizeAnime(media);
  if (!normalized || !catalogSecret(env)) return null;
  try {
    const response = await fetchWithRetry(`${catalogApiBase(env)}/api/seo/catalog/upsert`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-seo-catalog-secret': catalogSecret(env),
      },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) {
      console.warn(`[Catalog] upsert failed with status ${response.status}`);
      return null;
    }
    return (await response.json())?.entry || normalized;
  } catch (error) {
    console.warn(`[Catalog] upsert failed: ${error.message}`);
    return null;
  }
}

const ANILIST_SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(type: ANIME, search: $search, isAdult: false) {
        id idMal
        title { romaji english native userPreferred }
        synonyms
        description(asHtml: false)
        coverImage { large extraLarge }
        bannerImage
        episodes duration status format season seasonYear
        genres averageScore popularity
        startDate { year month day }
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

const ANILIST_CHARACTER_QUERY = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name { full native userPreferred }
      image { large }
      description(asHtml: false)
      gender
      age
      media(type: ANIME, perPage: 6, sort: POPULARITY_DESC) {
        nodes { id title { english romaji native } coverImage { large } }
      }
    }
  }
`;

async function fetchAnimeBySlug(slug) {
  const searchSlug = String(slug || '').replace(/--[a-z0-9]{8}$/i, '').replace(/[-_]+/g, ' ').trim();
  const search = normalizeSearchText(searchSlug, { maxLength: 180 });
  if (!search) return null;
  try {
    const response = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: ANILIST_SEARCH_QUERY, variables: { search } }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const media = data?.data?.Page?.media || [];
    return media[0] || null;
  } catch (error) {
    console.warn(`[AniList] slug resolution failed: ${error.message}`);
    return null;
  }
}

async function fetchCharacterById(id) {
  if (!/^\d{1,12}$/.test(String(id))) return null;
  try {
    const response = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: ANILIST_CHARACTER_QUERY, variables: { id: Number(id) } }),
    });
    if (!response.ok) return null;
    return (await response.json())?.data?.Character || null;
  } catch (error) {
    console.warn(`[AniList] character resolution failed: ${error.message}`);
    return null;
  }
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

async function fetchAnimeData(animeId, { bypassCache = false } = {}) {
  const cache = caches.default;
  const cacheKey = `${SITE_URL}/cache/seo-anilist?id=${animeId}`;

  // 1. Check edge cache
  if (!bypassCache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached.json();
  }

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

async function fetchAnimeList(page, sort = 'POPULARITY_DESC', { bypassCache = false } = {}) {
  const cache = caches.default;
  const cacheKey = `${SITE_URL}/cache/seo-anilist-list?page=${page}&sort=${sort}`;

  if (!bypassCache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached.json();
  }

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
        'Cache-Control': `s-maxage=${CATALOG_LIST_CACHE_TTL}`,
      },
    });
    await cache.put(cacheKey, cacheRes);
    return pageData;
  } catch (err) {
    console.error(`[AniList] fetchAnimeList(page=${page}) failed after retries:`, err.message);
    return null;
  }
}

async function refreshCatalog(env = {}) {
  const data = await fetchAnimeList(1, 'TRENDING_DESC');
  const media = data?.media || [];
  const selected = media.slice(0, CATALOG_REFRESH_LIMIT);
  for (const item of selected) {
    try {
      const full = await fetchAnimeData(item.id, { bypassCache: true });
      if (full) await upsertCatalogEntry(env, full);
    } catch (error) {
      console.warn(`[Catalog] scheduled refresh failed for ${item.id}: ${error.message}`);
    }
  }
  return selected.length;
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

function sitemapLastmodTag(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    const dateParts = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/u);
    if (!dateParts) continue;
    const calendarDate = new Date(`${dateParts[1]}-${dateParts[2]}-${dateParts[3]}T00:00:00.000Z`);
    if (Number.isNaN(calendarDate.getTime())
      || calendarDate.getUTCFullYear() !== Number(dateParts[1])
      || calendarDate.getUTCMonth() !== Number(dateParts[2]) - 1
      || calendarDate.getUTCDate() !== Number(dateParts[3])) continue;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) continue;
    return `\n    <lastmod>${date.toISOString()}</lastmod>`;
  }
  return '';
}

/** Safely serialize JSON-LD — prevents XSS via </script> injection in anime titles */
function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/<\//g, '<\\/');
}

/** Clean and truncate description at word boundary to avoid broken entities/words */
function cleanDesc(text, maxLen = 300) {
  if (!text) return '';
  const clean = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.substring(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function getTitle(anime) {
  return anime.title?.english || anime.title?.romaji || anime.title?.canonical || anime.title?.userPreferred || anime.title?.native || 'Unknown Anime';
}

function getRomaji(anime) {
  return anime.title?.romaji || anime.title?.english || anime.title?.canonical || anime.title?.native || 'Unknown';
}

function getImage(anime) {
  return anime.coverImage?.extraLarge || anime.coverImage?.large || `${SITE_URL}/og-image.png`;
}

// ─── Dynamic Titles ───

function buildWatchTitle(anime, ep) {
  return `Watch ${getTitle(anime)} Episode ${ep} English Sub/Dub | ${SITE_NAME}`;
}

function buildSeriesTitle(anime) {
  const title = getTitle(anime);
  return `${title} | Watch Anime Online on ${SITE_NAME}`;
}

function buildCharacterTitle(character) {
  return `${character.names?.[0] || 'Anime Character'} | Character Profile | ${SITE_NAME}`;
}

function buildCharacterDescription(character, anime) {
  const bio = cleanDesc(character.description, 220);
  const context = anime ? ` Featured in ${getTitle(anime)}.` : '';
  return `${character.names?.[0] || 'This anime character'} character profile on ${SITE_NAME}.${context}${bio ? ` ${bio}` : ''}`;
}

function buildCharacterKeywords(character, anime) {
  return [
    ...(character.names || []),
    'anime character',
    'character profile',
    SITE_NAME,
    anime ? getTitle(anime) : '',
  ].filter(Boolean).map(esc).join(', ');
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
  const native = anime.title?.native || anime.title?.canonical || '';
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

function buildVideoObjectLD(anime, ep, url, episodeMeta) {
  const title = getTitle(anime);
  const desc = cleanDesc(anime.description) ||
    `Watch ${title} Episode ${ep} online in HD on ${SITE_NAME}.`;
  if (!episodeMeta?.uniqueMetadata) return null;
  const video = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `${title} Episode ${ep}`,
    description: desc,
    thumbnailUrl: [episodeMeta.thumbnail, getImage(anime), anime.bannerImage].filter(Boolean),
    url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png` },
    },
    potentialAction: { '@type': 'WatchAction', target: url },
  };
  if (episodeMeta.airDate) video.uploadDate = episodeMeta.airDate;
  if (episodeMeta.duration) video.duration = `PT${episodeMeta.duration}M`;
  return safeJsonLd(video);
}

function buildTVSeriesLD(anime, url) {
  const title = getTitle(anime);
  const studio = anime.studios?.nodes?.[0]?.name || '';
  const obj = {
    '@context': 'https://schema.org',
    '@type': anime.format === 'MOVIE' ? 'Movie' : 'TVSeries',
    name: title,
    alternateName: [anime.title.romaji, anime.title.native].filter(Boolean),
    description: cleanDesc(anime.description) || `Watch ${title} on ${SITE_NAME}.`,
    image: getImage(anime),
    genre: anime.genres || [],
    url: url,
    numberOfEpisodes: anime.episodes || undefined,
  };
  if (studio) obj.productionCompany = { '@type': 'Organization', name: studio };
  return safeJsonLd(obj);
}

function buildCharacterLD(character, url, anime) {
  return safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#character`,
    name: character.names?.[0] || 'Anime Character',
    alternateName: (character.names || []).slice(1),
    description: cleanDesc(character.description) || `Anime character profile for ${character.names?.[0] || 'this character'} on ${SITE_NAME}.`,
    image: character.image || undefined,
    url,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    subjectOf: anime ? { '@type': anime.format === 'MOVIE' ? 'Movie' : 'TVSeries', name: getTitle(anime), url: `${SITE_URL}/anime/${encodeURIComponent(anime.slug || '')}` } : undefined,
  });
}

function buildBrandLD() {
  return safeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'TenZora',
        alternateName: ['Tenzora'],
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
        image: `${SITE_URL}/og-image.png`,
        description: 'TenZora is an independent anime streaming and discovery platform at tenzora.top.',
        knowsAbout: ['anime streaming', 'anime discovery', 'anime episodes', 'anime movies'],
        brand: { '@id': `${SITE_URL}/#brand` },
      },
      {
        '@type': 'Brand',
        '@id': `${SITE_URL}/#brand`,
        name: 'TenZora',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/logo.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'TenZora',
        alternateName: ['Tenzora'],
        url: `${SITE_URL}/`,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/browse?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  });
}

function buildBreadcrumbLD(items) {
  return safeJsonLd({
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
    if (name === 'robots' && this.o.robots)
      el.setAttribute('content', this.o.robots);

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

    // Twitter — standard uses name= but some frameworks use property=
    const key = name || prop;
    if (key === 'twitter:title' && this.o.title)
      el.setAttribute('content', this.o.title);
    if (key === 'twitter:description' && this.o.description)
      el.setAttribute('content', this.o.description);
    if (key === 'twitter:image' && this.o.image)
      el.setAttribute('content', this.o.image);
    if (key === 'twitter:url' && this.o.url)
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

function catalogToMedia(entry) {
  if (!entry) return null;
  return {
    id: entry.providerIds?.anilist || entry.providerIds?.mal,
    anilistId: entry.providerIds?.anilist || null,
    idMal: entry.providerIds?.mal || null,
    title: entry.titles || { english: entry.slug },
    synonyms: entry.titles?.synonyms || [],
    description: entry.description || '',
    coverImage: { extraLarge: entry.image, large: entry.image },
    bannerImage: entry.bannerImage,
    episodes: entry.episodeCount,
    episodeList: entry.episodes || [],
    characters: entry.characters || [],
    format: entry.format,
    season: entry.season,
    seasonYear: entry.seasonYear,
    metadataState: entry.metadataState,
    indexable: entry.indexable,
    canonicalId: entry.canonicalId,
    slug: entry.slug,
  };
}

async function resolveRouteCatalog(route, env) {
  if (route.type === 'anime' || route.type === 'anime-episode') {
    return fetchCatalogBySlug(route.slug, env);
  }
  if (route.type === 'watch' || route.type === 'anime-id') {
    return fetchCatalogByProvider(route.mal ? 'mal' : 'anilist', route.animeId, env);
  }
  if (route.type === 'character') {
    const result = (await fetchCatalogSearch(route.slug, env)).find(item => item.matchType === 'character' && item.matchedCharacter);
    return result ? { entry: result, character: result.matchedCharacter } : null;
  }
  if (route.type === 'character-id') {
    const data = await fetchCharacterById(route.characterId);
    if (!data) return null;
    const names = [data.name?.full, data.name?.userPreferred, data.name?.native].filter(Boolean);
    return {
      entry: null,
      character: {
        id: String(data.id),
        names,
        aliases: names.map(normalizeSearchText),
        slug: buildCharacterSlug(names[0] || `character-${data.id}`, String(data.id)),
        image: data.image?.large || null,
        description: data.description || null,
        media: data.media?.nodes || [],
      },
    };
  }
  return null;
}

function routeProviderIdentity(route, catalog) {
  return catalog?.providerIds?.anilist || catalog?.providerIds?.mal || route.animeId || null;
}

function buildOriginPath(route, catalog, anime, episode) {
  if (route.type === 'character' || route.type === 'character-id') {
    return `/character/${encodeURIComponent(route.slug || route.characterId || 'character')}`;
  }
  const providerId = routeProviderIdentity(route, catalog) || anime?.id;
  if (!providerId) return null;
  const isMal = !catalog?.providerIds?.anilist && Boolean(catalog?.providerIds?.mal);
  const playbackQuery = new URLSearchParams();
  if (episode && (route.type === 'watch' || route.type === 'anime-id')) playbackQuery.set('ep', String(episode));
  if (isMal) playbackQuery.set('mal', 'true');
  const idQuery = playbackQuery.toString() ? `?${playbackQuery}` : '';
  if (route.type === 'anime-episode') {
    return `/anime/${encodeURIComponent(catalog?.slug || route.slug)}/episode/${episode || 1}`;
  }
  if (route.type === 'anime') return `/anime/${encodeURIComponent(catalog?.slug || route.slug)}`;
  if (route.type === 'anime-id') return `/watch/${providerId}${idQuery}`;
  if (route.type === 'watch') return `/watch/${providerId}${catalog?.slug ? `/${encodeURIComponent(catalog.slug)}` : ''}${idQuery}`;
  return null;
}

async function handleSEOPage(request, route, ctx, env = {}) {
  const url = new URL(request.url);
  const isEpisodeRoute = route.type === 'anime-episode';
  const resolvedRoute = { ...route, mal: url.searchParams.get('mal') === 'true' };
  const routeCatalog = await resolveRouteCatalog(resolvedRoute, env);
  const isCharacterRoute = route.type === 'character' || route.type === 'character-id';
  const catalog = isCharacterRoute ? routeCatalog?.entry : routeCatalog;
  const character = isCharacterRoute ? routeCatalog?.character : null;
  const revision = catalogRevision(catalog?.revision) ?? await fetchCatalogVersion(env);
  const requestedEpisode = route.episode || Number.parseInt(url.searchParams.get('ep'), 10) || null;
  const cacheKey = revision === null
    ? null
    : `${SITE_URL}/cache/seo-page${url.pathname}?revision=${encodeURIComponent(revision)}${requestedEpisode ? `&ep=${requestedEpisode}` : ''}${resolvedRoute.mal ? '&mal=true' : ''}`;

  // Resolve the catalog revision before reading the page cache. A changed
  // catalog entry therefore moves the request to a new cache key immediately,
  // without requiring a global edge-cache purge. If the revision cannot be
  // established, bypass the internal cache rather than serving stale HTML.
  const cache = caches.default;
  if (cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      console.log(`[SEO] Cache HIT: ${url.pathname}`);
      return cached;
    }
  }

  let anime = null;
  if (catalog?.providerIds?.anilist) anime = await fetchAnimeData(catalog.providerIds.anilist);
  if (!anime && (resolvedRoute.type === 'watch' || resolvedRoute.type === 'anime-id') && !resolvedRoute.mal) anime = await fetchAnimeData(resolvedRoute.animeId);
  if (!anime && (resolvedRoute.type === 'anime' || isEpisodeRoute)) {
    const discovered = await fetchAnimeBySlug(resolvedRoute.slug);
    if (discovered?.id) anime = await fetchAnimeData(discovered.id) || discovered;
  }
  if (!anime && route.type === 'character-id') {
    anime = null;
  }
  if (!anime && catalog) anime = catalogToMedia(catalog);

  const episode = requestedEpisode && requestedEpisode > 0 && requestedEpisode <= 100000 ? requestedEpisode : null;
  const originPath = buildOriginPath(resolvedRoute, routeCatalog, anime, episode);
  const originUrl = originPath ? `${env.FRONTEND_URL || FRONTEND_URL}${originPath}` : `${env.FRONTEND_URL || FRONTEND_URL}${url.pathname}${url.search}`;
  const originRes = await fetch(originUrl, {
    headers: { 'User-Agent': request.headers.get('User-Agent') || 'Tenzora-SEO-Worker' },
  });

  // Fallback: if AniList fails, serve the un-rewritten page
  if (!anime && !isCharacterRoute) {
    console.log(`[SEO] Metadata unavailable for ${url.pathname}, serving raw origin`);
    return noStoreResponse(originRes);
  }

  if (isCharacterRoute && !character) return noStoreResponse(originRes);

  const normalized = anime ? normalizeAnime({
    ...anime,
    canonicalId: catalog?.canonicalId || anime.canonicalId,
    slug: catalog?.slug || anime.slug,
    episodeList: catalog?.episodes?.length ? catalog.episodes : anime.episodeList,
    episodeCount: catalog?.episodeCount || anime.episodeCount,
  }) : null;
  if (!isCharacterRoute && !normalized) return noStoreResponse(originRes);
  if (normalized && ctx?.waitUntil) ctx.waitUntil(upsertCatalogEntry(env, normalized));

  const episodeMeta = getEpisode(normalized, episode);
  const indexableEpisode = Boolean(episode && isUsefulEpisode(episodeMeta));
  const seriesCanonicalPath = normalized ? `/anime/${encodeURIComponent(normalized.slug)}` : null;
  const characterCanonicalPath = isCharacterRoute && character
    ? `/character/${encodeURIComponent(character.slug || route.slug || character.id)}`
    : null;
  const canonicalPath = indexableEpisode ? `${seriesCanonicalPath}/episode/${episode}` : seriesCanonicalPath;
  const canonicalUrl = `${SITE_URL}${isCharacterRoute ? characterCanonicalPath : canonicalPath}`;

  // 3. Build all SEO strings
  const seoTitle = isCharacterRoute
    ? buildCharacterTitle(character)
    : indexableEpisode ? buildWatchTitle(anime, episode) : buildSeriesTitle(anime);
  const seoDesc = isCharacterRoute
    ? buildCharacterDescription(character, anime)
    : buildMultilingualDescription(anime, indexableEpisode ? episode : null);
  const seoKeywords = isCharacterRoute
    ? buildCharacterKeywords(character, anime)
    : buildKeywords(anime, indexableEpisode ? episode : null);
  const seoImage = character?.image || (anime ? getImage(anime) : `${SITE_URL}/og-image.png`);

  // 4. Build the HTML to append into <head>.
  //    The SPA shell owns one copy of the standard metadata tags and
  //    MetaRewriter updates those tags in place. Only tags that do not exist
  //    in the shell (hreflang and page-specific JSON-LD) are appended here.
  let appendHtml = '\n<!-- Tenzora SEO Engine v2.1 -->\n';

  // Hreflang tags
  appendHtml += buildHreflangTags(canonicalUrl);

  // JSON-LD schemas — only emit episode video data when the catalog has
  // unique episode metadata; never fabricate duration, upload dates, or views.
  const videoObject = indexableEpisode ? buildVideoObjectLD(anime, episode, canonicalUrl, episodeMeta) : null;
  if (videoObject) appendHtml += `<script type="application/ld+json">${videoObject}</script>\n`;
  if (isCharacterRoute) {
    appendHtml += `<script type="application/ld+json">${buildCharacterLD(character, canonicalUrl, normalized || anime)}</script>\n`;
    appendHtml += `<script type="application/ld+json">${buildBreadcrumbLD([
      { name: 'Home', url: SITE_URL },
      { name: character.names?.[0] || 'Character', url: canonicalUrl },
    ])}</script>\n`;
  } else {
    appendHtml += `<script type="application/ld+json">${buildTVSeriesLD(anime, canonicalUrl)}</script>\n`;
    appendHtml += `<script type="application/ld+json">${buildBreadcrumbLD([
      { name: 'Home', url: SITE_URL },
      { name: getTitle(anime), url: `${SITE_URL}${seriesCanonicalPath}` },
      ...(indexableEpisode ? [{ name: `Episode ${episode}`, url: canonicalUrl }] : []),
    ])}</script>\n`;
  }
  appendHtml += `<script type="application/ld+json">${buildBrandLD()}</script>\n`;
  appendHtml += '<!-- /Tenzora SEO Engine v2.1 -->\n';

  // 5. Apply HTMLRewriter (streaming)
  const rewrittenResponse = new HTMLRewriter()
    .on('title', new TitleRewriter(seoTitle))
    .on('meta', new MetaRewriter({
      title: seoTitle,
      description: seoDesc,
      keywords: seoKeywords,
      robots: `${isCharacterRoute || indexableEpisode || !episode ? 'index, follow' : 'noindex, follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`,
      image: seoImage,
      url: canonicalUrl,
       ogType: indexableEpisode ? 'video.episode' : 'website',
    }))
    .on('link', new CanonicalRewriter(canonicalUrl))
    .on('script[type="application/ld+json"]', new JsonLdRemover())
    .on('head', new HeadAppender(appendHtml))
    .transform(originRes);

  // 6. STREAMING RESPONSE TEEING (v2.1 — fixed race condition)
  //    Uses the native ReadableStream.tee() to split the stream safely.
  //    Previous v2.0 had a race condition with getWriter()/releaseLock() inside write().
  const responseHeaders = {
    'Content-Type': 'text/html; charset=UTF-8',
     // The Worker cache is revision-keyed. Disable an outer CDN cache so a
      // new catalog revision always reaches the revision check first.
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'X-SEO-Engine': 'Tenzora/3.0',
      ...(revision === null ? {} : { 'X-SEO-Revision': revision }),
  };

  if (cacheKey && ctx?.waitUntil) {
    const [userBody, cacheBody] = rewrittenResponse.body.tee();
    ctx.waitUntil(
      cache.put(cacheKey, new Response(cacheBody, { status: 200, headers: responseHeaders }))
    );
    console.log(`[SEO] Streaming & caching: ${url.pathname} → "${seoTitle}"`);
    return new Response(userBody, { status: 200, headers: responseHeaders });
  }

  console.log(`[SEO] Streaming without cache: ${url.pathname} → "${seoTitle}"`);
  return new Response(rewrittenResponse.body, { status: 200, headers: responseHeaders });
}

function buildStaticPageLd(route, canonicalUrl, indexable) {
  return safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: route.title,
    description: route.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    ...(indexable ? {} : { robots: 'noindex, follow' }),
  });
}

async function handleStaticSEOPage(request, route, ctx, env = {}) {
  const url = new URL(request.url);
  const indexable = ![...url.searchParams.keys()].some(key => !/^(?:utm_.+|fbclid|gclid|msclkid)$/u.test(key));
  const canonicalUrl = `${SITE_URL}${route.canonicalPath}`;
  const originRes = await fetch(`${env.FRONTEND_URL || FRONTEND_URL}${url.pathname}${url.search}`, {
    headers: { 'User-Agent': request.headers.get('User-Agent') || 'Tenzora-SEO-Worker' },
  });
  if (typeof HTMLRewriter === 'undefined') return noStoreResponse(originRes);
  const appendHtml = `\n${buildHreflangTags(canonicalUrl)}<script type="application/ld+json">${buildBrandLD()}</script><script type="application/ld+json">${buildStaticPageLd(route, canonicalUrl, indexable)}</script>\n`;
  const rewritten = new HTMLRewriter()
    .on('title', new TitleRewriter(route.title))
    .on('meta', new MetaRewriter({
      title: route.title,
      description: route.description,
      image: `${SITE_URL}/og-image.png`,
      url: canonicalUrl,
      ogType: 'website',
      robots: `${indexable ? 'index, follow' : 'noindex, follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`,
    }))
    .on('link', new CanonicalRewriter(canonicalUrl))
    .on('script[type="application/ld+json"]', new JsonLdRemover())
    .on('head', new HeadAppender(appendHtml))
    .transform(originRes);

  const headers = new Headers(rewritten.headers);
  headers.set('Content-Type', 'text/html; charset=UTF-8');
  setNoStore(headers);
  headers.set('X-SEO-Engine', 'Tenzora/3.0');
  return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
}

// ═══════════════════════════════════════════
//  EDGE-CACHED SITEMAP ENGINE
// ═══════════════════════════════════════════
// Sitemaps are built on-demand and edge-cached for 48h.
// First request builds the XML, subsequent requests are served from cache.

function xmlResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
    },
  });
}

const EMPTY_SITEMAP = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`;

// ─── Sitemap XML Builders ───

async function buildSitemapIndexXml(env = {}, catalogState = null) {
  const today = new Date().toISOString().split('T')[0];
  const state = catalogState || await fetchCatalogState(env);
  const sitemapPages = sitemapPageCount(state);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-static.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-recent.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  for (let i = 1; i <= sitemapPages; i++) {
    xml += `  <sitemap>\n    <loc>${SITE_URL}/sitemap-anime-${i}.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  }
  xml += `</sitemapindex>`;
  return xml;
}

function buildStaticSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    '/', '/browse', '/schedule', '/dmca', '/terms',
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
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const anime of animeList) {
    const normalized = normalizeAnime(anime);
    if (!isUsefulAnime(normalized)) continue;
    const slug = normalized.slug;

    // Canonical anime page. Legacy /watch URLs are compatibility aliases.
    const detailLoc = `${SITE_URL}/anime/${encodeURIComponent(slug)}`;
    const detailLastmod = sitemapLastmodTag(anime.updatedAt);
    xml += `  <url>\n    <loc>${escXml(detailLoc)}</loc>${detailLastmod}\n    <changefreq>weekly</changefreq>\n    <priority>${(priority + 0.1).toFixed(1)}</priority>\n  </url>\n`;

    // Do not manufacture episode URLs when no episode metadata exists.
    for (const episode of normalized.episodes.filter(item => isUsefulEpisode(item))) {
      const loc = `${SITE_URL}/anime/${encodeURIComponent(slug)}/episode/${episode.number}`;
      const lastmod = sitemapLastmodTag(episode.updatedAt, episode.airDate);
      xml += `  <url>\n    <loc>${escXml(loc)}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>\n`;
    }
  }

  xml += `</urlset>`;
  return xml;
}

function buildCatalogSitemapXml(entries, priority = 0.8) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const entry of entries || []) {
    if (!isUsefulAnime(entry) || !entry.slug) continue;
    const detailLoc = `${SITE_URL}/anime/${encodeURIComponent(entry.slug)}`;
    const detailLastmod = sitemapLastmodTag(entry.lastEpisodeUpdatedAt, entry.updatedAt, entry.lastFetchedAt);
    xml += `  <url>\n    <loc>${escXml(detailLoc)}</loc>${detailLastmod}\n    <changefreq>weekly</changefreq>\n    <priority>${Math.min(1, priority + 0.1).toFixed(1)}</priority>\n  </url>\n`;
    for (const episode of (entry.episodes || []).filter(item => isUsefulEpisode(item))) {
      const loc = `${SITE_URL}/anime/${encodeURIComponent(entry.slug)}/episode/${episode.number}`;
      const lastmod = sitemapLastmodTag(
        episode.updatedAt,
        episode.airDate,
        entry.lastEpisodeUpdatedAt,
        entry.updatedAt,
        entry.lastFetchedAt,
      );
      xml += `  <url>\n    <loc>${escXml(loc)}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>\n`;
    }
    for (const character of (entry.characters || []).filter(item => item.slug && item.names?.length)) {
      const loc = `${SITE_URL}/character/${encodeURIComponent(character.slug)}`;
      xml += `  <url>\n    <loc>${escXml(loc)}</loc>${detailLastmod}\n    <changefreq>monthly</changefreq>\n    <priority>${Math.max(0.3, priority - 0.1).toFixed(1)}</priority>\n  </url>\n`;
    }
  }
  return `${xml}</urlset>`;
}

// ─── Edge Cache Read / Build ───

async function serveSitemap(cacheId, buildFn, ctx, env, catalogState = null) {
  // 1. Check edge cache
  const cache = caches.default;
  const state = catalogState || await fetchCatalogState(env);
  if (!state) return sitemapUnavailableResponse();
  const revision = state.revision;
  const edgeCacheKey = `${SITE_URL}/cache/${cacheId}?revision=${encodeURIComponent(revision)}`;
  const cached = await cache.match(edgeCacheKey);
  if (cached) {
    console.log(`[Sitemap] Edge cache HIT: ${cacheId}`);
    return cached;
  }

  // 2. Cache miss: build on-the-fly and store
  console.log(`[Sitemap] Cache MISS: ${cacheId}, building on-the-fly`);
  const xml = await buildFn();
  if (xml === null) return sitemapUnavailableResponse();
  const res = xmlResponse(xml);
  if (ctx?.waitUntil) ctx.waitUntil(cache.put(edgeCacheKey, res.clone()));
  return res;
}

// ─── Sitemap Route Handlers ───

async function handleSitemapIndex(env, ctx) {
  const catalogState = await fetchCatalogState(env);
  if (!catalogState) return sitemapUnavailableResponse();
  return serveSitemap('sitemap-index', () => buildSitemapIndexXml(env, catalogState), ctx, env, catalogState);
}

async function handleSitemapStatic() {
  return xmlResponse(buildStaticSitemapXml());
}

async function handleSitemapRecent(env, ctx) {
  const catalogState = await fetchCatalogState(env);
  if (!catalogState) return sitemapUnavailableResponse();
  return serveSitemap('sitemap-recent', async () => {
    const catalogEntries = await fetchCatalogSitemapPage(1, env);
    if (catalogEntries === null) return null;
    if (catalogEntries.length) return buildCatalogSitemapXml(catalogEntries, 0.9);
    const data = await fetchAnimeList(1, 'TRENDING_DESC', { bypassCache: true });
    if (!data?.media) return EMPTY_SITEMAP;
    return buildAnimeListSitemapXml(data.media, 0.9);
  }, ctx, env, catalogState);
}

async function handleSitemapAnimePage(page, env, ctx) {
  const catalogState = await fetchCatalogState(env);
  if (!catalogState) return sitemapUnavailableResponse();
  if (page < 1 || page > sitemapPageCount(catalogState)) {
    return new Response('Not Found', { status: 404 });
  }
  return serveSitemap(`sitemap-anime-${page}`, async () => {
    const catalogEntries = await fetchCatalogSitemapPage(page, env);
    if (catalogEntries === null) return null;
    if (catalogEntries.length) return buildCatalogSitemapXml(catalogEntries, 0.6);
    const data = await fetchAnimeList(page, 'POPULARITY_DESC', { bypassCache: true });
    if (!data?.media) return EMPTY_SITEMAP;
    return buildAnimeListSitemapXml(data.media, 0.6);
  }, ctx, env, catalogState);
}

// ═══════════════════════════════════════════
//  EXISTING: AniList & Jikan Edge Proxies
// ═══════════════════════════════════════════

async function buildAnilistCacheKey(url, body) {
  try {
    const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(body))));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return new URL(`${url.origin}/cache/anilist/${key}`);
  } catch {
    return null;
  }
}

async function handleAnilistProxy(request, origin, env = {}, ctx) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
  };

  try {
    const body = await request.json();
    const url = new URL(request.url);
    const cacheKey = await buildAnilistCacheKey(url, body);

    if (cacheKey) {
      const cache = caches.default;
      const cached = await cache.match(new Request(cacheKey.toString()));
      if (cached) {
        const cachedBody = await cached.text();
        return new Response(cachedBody, {
          status: 200,
          headers: { ...corsHeaders, 'X-Cache': 'HIT', 'Cache-Control': 'no-store' },
        });
      }
    }

    const anilistResponse = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: 12000,
    });

    const responseText = await anilistResponse.text();

    if (anilistResponse.ok) {
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
        if (ctx?.waitUntil) {
          const mediaItems = parsed?.data?.Media
            ? [parsed.data.Media]
            : parsed?.data?.Page?.media || [];
          if (mediaItems.length) {
            ctx.waitUntil(Promise.all(mediaItems.slice(0, 50).map(media => upsertCatalogEntry(env, media))));
          }
        }
      } catch { /* skip caching on parse failure */ }
    }

    return new Response(responseText, {
      status: anilistResponse.status,
      headers: { ...corsHeaders, 'X-Cache': 'MISS', 'Cache-Control': 'no-store' },
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
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
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

    const target = new URL(jikanPath, 'https://api.jikan.moe');
    if (target.origin !== 'https://api.jikan.moe' || !target.pathname.startsWith('/v4/')) return Response.json({ error: 'Invalid Jikan path' }, { status: 400, headers: corsHeaders });
    for (const [key, value] of url.searchParams) if (key !== 'path') target.searchParams.set(key, value);
    target.searchParams.sort();
    const cacheKeyUrl = new URL(`${url.origin}/cache/jikan${target.pathname}${target.search}`);
    const cache = caches.default;
    const cached = await cache.match(new Request(cacheKeyUrl.toString()));
    if (cached) {
      const cachedBody = await cached.text();
      return new Response(cachedBody, {
        status: 200,
        headers: { ...corsHeaders, 'X-Cache': 'HIT', 'Cache-Control': 'no-store' },
      });
    }

    const jikanResponse = await fetchWithRetry(target.href, {
      headers: { 'Accept': 'application/json' },
      timeoutMs: 15000,
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
      headers: { ...corsHeaders, 'X-Cache': 'MISS', 'Cache-Control': 'no-store' },
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
Disallow: /api/
Allow: /api/seo/catalog/
Disallow: /auth/
Disallow: /admin/
Disallow: /profile
Disallow: /settings
Disallow: /chat
Disallow: /community
Disallow: /watchlist
Disallow: /watching
Disallow: /notifications
Disallow: /import
Disallow: /nsfw/
Disallow: /stats
Disallow: /user/
Disallow: /watch2gether
Disallow: /staff/
Disallow: /stories
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'CDN-Cache-Control': 'public, max-age=300, must-revalidate',
    },
  });
}

const BACKEND_PREFIXES = [
  '/api/', '/auth', '/watchlist', '/progress', '/settings', '/notifications',
  '/users', '/ai', '/ai-bot', '/community', '/contact', '/reports', '/support',
];

const FRONTEND_OVERLAP_PATHS = ['/settings', '/watchlist', '/notifications', '/community'];

function isBackendPath(pathname, request) {
  const isFrontendOverlap = FRONTEND_OVERLAP_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
  if (isFrontendOverlap) return request.headers.get('x-api') === 'true';
  return BACKEND_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// ═══════════════════════════════════════════
//  MAIN WORKER EXPORT
// ═══════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '*';
    const url = new URL(request.url);
    const backendUrl = getBackendUrl(env);
    const backendPath = isBackendPath(url.pathname, request);
    const providerProxyPath = url.pathname === '/api/anilist/proxy' || url.pathname === '/api/jikan/proxy';
    if (backendPath && !providerProxyPath && !backendUrl) return missingBackendUrlResponse(origin);

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

    // ── 2. SITEMAP ENGINE (edge-cached) ──
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
      return handleAnilistProxy(request, origin, env, ctx);
    }

    // ── 4. JIKAN PROXY (edge-cached) ──
    if (url.pathname === '/api/jikan/proxy' && request.method === 'GET') {
      return handleJikanProxy(request, origin);
    }

    // ── 5. STATIC SEO ENGINE ──
    if (request.method === 'GET') {
      const staticSeoRoute = matchStaticSEORoute(url.pathname);
      if (staticSeoRoute) {
        try {
          return await handleStaticSEOPage(request, staticSeoRoute, ctx, env);
        } catch (err) {
          console.error('[SEO] Static rewrite failed, falling back to origin:', err.message);
          return noStoreResponse(await fetch(`${env.FRONTEND_URL || FRONTEND_URL}${url.pathname}${url.search}`));
        }
      }
    }

    // ── 6. SEO ENGINE — intercept /anime/:id and /watch/:id(/:slug) ──
    if (request.method === 'GET') {
      const seoRoute = matchSEORoute(url.pathname);
      if (seoRoute) {
        try {
            return await handleSEOPage(request, seoRoute, ctx, env);
        } catch (err) {
          console.error('[SEO] Rewrite failed, falling back to origin:', err.message);
          return noStoreResponse(await fetch(`${env.FRONTEND_URL || FRONTEND_URL}${url.pathname}${url.search}`));
        }
      }
    }

    // ── 7. API requests proxy to the backend; all page/assets requests go
    // to the Pages origin. This is required when the Worker is attached to
    // tenzora.top/*, otherwise static assets would be sent to Render. ──
    const targetBase = backendPath ? backendUrl : (env.FRONTEND_URL || FRONTEND_URL);
    const targetUrl = targetBase + url.pathname + url.search;
    const targetHeaders = new Headers(request.headers);
    targetHeaders.delete('host');
    if (backendPath) {
      targetHeaders.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') || '127.0.0.1');
      targetHeaders.set('X-Forwarded-Proto', 'https');
      targetHeaders.set('X-Real-IP', request.headers.get('cf-connecting-ip') || '127.0.0.1');
      targetHeaders.delete('cf-connecting-ip');
      targetHeaders.delete('cf-ipcountry');
      targetHeaders.delete('cf-ray');
      targetHeaders.delete('cf-visitor');
    }

    try {
      const targetResponse = await fetch(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(targetResponse.headers);
      if (backendPath) {
        responseHeaders.set('Access-Control-Allow-Origin', origin);
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      }
      if (backendPath || !isHashedAssetPath(url.pathname)) setNoStore(responseHeaders);
      else setImmutableAssetCache(responseHeaders);
      responseHeaders.set('X-Edge-Location', request.cf?.colo || 'unknown');

      return new Response(targetResponse.body, {
        status: targetResponse.status,
        statusText: targetResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[Edge Proxy] Failed to reach ${backendPath ? 'backend' : 'frontend'} origin:`, error.message);
      return new Response(
        JSON.stringify({ error: 'Edge origin unavailable' }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'CDN-Cache-Control': 'no-store',
            ...(backendPath ? { 'Access-Control-Allow-Origin': origin } : {}),
          },
        },
      );
    }
  },

  // ═══════════════════════════════════════════
  //  CRON SCHEDULER
  // ═══════════════════════════════════════════

  async scheduled(event, env) {
    const backendUrl = getBackendUrl(env);
    if (!backendUrl) {
      console.error(MISSING_BACKEND_URL_MESSAGE);
      return;
    }

    try {
      // ── AI Bot Crons ──
      if (event.cron === '*/30 * * * *') {
        console.log('Running 30m cron: triggering checkAndPost');
        const response = await fetch(`${backendUrl}/ai-bot/cron/post`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
        if (!response.ok) throw new Error(`Bot post cron failed: ${response.status}`);
      } else if (event.cron === '*/10 * * * *') {
        try {
          const refreshed = await refreshCatalog(env);
          console.log(`Catalog refresh completed: ${refreshed} titles checked`);
        } catch (error) {
          console.error('Catalog refresh failed:', error.message);
        }
        console.log('Running 10m cron: triggering checkAndReply');
        const response = await fetch(`${backendUrl}/ai-bot/cron/reply`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
        if (!response.ok) throw new Error(`Bot reply cron failed: ${response.status}`);
      } else if (event.cron === '*/15 * * * *') {
        console.log('Running 15m cron: triggering episode comments');
        const response = await fetch(`${backendUrl}/ai-bot/cron/episode-comment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.CRON_SECRET || ''}` },
        });
        if (!response.ok) throw new Error(`Episode comment cron failed: ${response.status}`);
      }

      // ── Daily Cron (midnight UTC) — reserved for future use ──
      if (event.cron === '0 0 * * *') {
        console.log('Running daily cron: sitemap edge cache will auto-refresh on next request');
      }
    } catch (error) {
      console.error('Scheduled cron proxy failed:', error);
    }
  },
};
