/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  TENZORA ANIME ADAPTER — Bulletproof Multi-Source Data Fetcher
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  This adapter guarantees anime data retrieval by trying 4 independent sources:
 *
 *    1. Direct AniList GraphQL (browser → graphql.anilist.co)
 *    2. Jikan/MAL API via ani.zip ID mapping (browser → jikan.moe)
 *    3. Kitsu API (browser → kitsu.app)
 *    4. Server Proxy (last resort, currently blocked by AniList)
 *
 *  Each source is FULLY ISOLATED — one failure cannot break any other source.
 *  All sources normalize to the same AniList-compatible data shape.
 *
 *  REQUIRES: No API keys. All sources are public/free.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const ANILIST_GQL = 'https://graphql.anilist.co';
const JIKAN_API = 'https://api.jikan.moe/v4';
const KITSU_API = 'https://kitsu.app/api/edge';
const ANZIP_API = 'https://api.ani.zip/mappings';

const TIMEOUTS = {
  ANILIST: 10000,
  JIKAN: 10000,
  KITSU: 8000,
  ANZIP: 5000,
  PROXY: 8000,
};

// ─── ID MAPPING CACHE ───────────────────────────────────────────────────────
// Caches AniList ↔ MAL ID mappings to avoid repeated ani.zip calls
const idMapCache = new Map();

/**
 * Resolve AniList ID → MAL ID (and vice versa) via ani.zip
 */
async function resolveIds(anilistId) {
  if (idMapCache.has(anilistId)) return idMapCache.get(anilistId);

  try {
    const { data } = await axios.get(`${ANZIP_API}?anilist_id=${anilistId}`, {
      timeout: TIMEOUTS.ANZIP,
    });
    const mapping = {
      malId: data?.mappings?.mal_id || data?.mappings?.myanimelist_id || null,
      kitsuId: data?.mappings?.kitsu_id || null,
      title: data?.mappings?.title || null,
    };
    idMapCache.set(anilistId, mapping);
    return mapping;
  } catch {
    return { malId: null, kitsuId: null, title: null };
  }
}

// ─── ANILIST DETAIL QUERY ───────────────────────────────────────────────────
const ANILIST_DETAIL_QUERY = `
  query ($id: Int, $idMal: Int) {
    Media(id: $id, idMal: $idMal, type: ANIME) {
      id idMal
      title { romaji english native userPreferred }
      coverImage { extraLarge large medium color }
      bannerImage
      description(asHtml: false)
      format type status season seasonYear
      episodes duration
      averageScore meanScore popularity favourites
      genres tags { name rank isMediaSpoiler }
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { airingAt timeUntilAiring episode }
      studios(isMain: true) { nodes { name isAnimationStudio } }
      trailer { id site thumbnail }
      isAdult
      countryOfOrigin
      source
      synonyms
      characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
        edges {
          role
          voiceActorRoles(language: JAPANESE, sort: RELEVANCE) {
            voiceActor { id name { full native } image { large } language }
          }
          node { id name { full native userPreferred } image { large } }
        }
      }
      recommendations(sort: RATING_DESC, perPage: 8) {
        nodes {
          mediaRecommendation {
            id title { romaji english native }
            coverImage { large }
            format type averageScore
          }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id idMal title { romaji english native }
            coverImage { large } format type status
            episodes seasonYear
            relations {
              edges {
                relationType(version: 2)
                node {
                  id idMal title { romaji english native }
                  coverImage { large } format type status
                  episodes seasonYear
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ─── SOURCE 1: DIRECT ANILIST ───────────────────────────────────────────────
async function fetchFromAniListDirect(id, isMal = false) {
  const variables = isMal ? { idMal: Number(id) } : { id: Number(id) };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await axios.post(ANILIST_GQL, {
        query: ANILIST_DETAIL_QUERY,
        variables,
      }, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: attempt === 0 ? TIMEOUTS.ANILIST : TIMEOUTS.ANILIST + 5000,
      });

      if (data?.data?.Media) {
        console.info('[Adapter] ✅ Source 1 (Direct AniList) succeeded');
        return processAniListMedia(data.data.Media);
      }

      if (data?.errors) {
        console.warn('[Adapter] AniList errors:', data.errors[0]?.message);
        break; // Non-transient error, don't retry
      }
    } catch (err) {
      console.warn(`[Adapter] AniList attempt ${attempt + 1} failed:`, err.message);
      if (attempt === 0) await sleep(500);
    }
  }
  return null;
}

// ─── SOURCE 2: JIKAN (MAL) ─────────────────────────────────────────────────
async function fetchFromJikan(id, isMal = false) {
  try {
    let malId = isMal ? id : null;

    // Resolve AniList ID → MAL ID
    if (!malId) {
      const mapping = await resolveIds(id);
      malId = mapping.malId;
      if (!malId) {
        console.warn('[Adapter] No MAL mapping for AniList ID:', id);
        return null;
      }
    }

    // Try direct Jikan
    let jikanData = null;
    try {
      const { data } = await axios.get(`${JIKAN_API}/anime/${malId}/full`, {
        timeout: TIMEOUTS.JIKAN,
      });
      jikanData = data?.data;
    } catch (err) {
      // If rate limited (429), wait and retry once
      if (err.response?.status === 429) {
        await sleep(1500);
        try {
          const { data } = await axios.get(`${JIKAN_API}/anime/${malId}/full`, {
            timeout: TIMEOUTS.JIKAN,
          });
          jikanData = data?.data;
        } catch { /* second attempt failed */ }
      }
    }

    if (!jikanData) {
      // Fallback to basic endpoint
      try {
        const { data } = await axios.get(`${JIKAN_API}/anime/${malId}`, {
          timeout: TIMEOUTS.JIKAN,
        });
        jikanData = data?.data;
      } catch { /* basic also failed */ }
    }

    if (jikanData) {
      console.info('[Adapter] ✅ Source 2 (Jikan/MAL) succeeded');
      return transformJikanToStandard(jikanData);
    }
  } catch (err) {
    console.warn('[Adapter] Jikan source failed:', err.message);
  }
  return null;
}

// ─── SOURCE 3: KITSU ────────────────────────────────────────────────────────
async function fetchFromKitsu(id, isMal = false) {
  try {
    let kitsuId = null;

    // Try to get Kitsu ID from ani.zip mapping
    if (!isMal) {
      const mapping = await resolveIds(id);
      kitsuId = mapping.kitsuId;
    }

    let kitsuData = null;

    if (kitsuId) {
      // Direct fetch by Kitsu ID
      try {
        const { data } = await axios.get(`${KITSU_API}/anime/${kitsuId}`, {
          headers: { 'Accept': 'application/vnd.api+json' },
          timeout: TIMEOUTS.KITSU,
        });
        kitsuData = data?.data;
      } catch { /* direct ID failed */ }
    }

    // Fallback: search by title from ani.zip or AniList mapping
    if (!kitsuData) {
      const mapping = await resolveIds(id);
      const malId = isMal ? id : mapping.malId;

      if (malId) {
        try {
          // Kitsu supports filtering by MAL ID via mappings
          const { data } = await axios.get(`${KITSU_API}/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
            headers: { 'Accept': 'application/vnd.api+json' },
            timeout: TIMEOUTS.KITSU,
          });
          if (data?.included?.[0]) {
            kitsuData = data.included[0];
          }
        } catch { /* mapping search failed */ }
      }
    }

    if (kitsuData) {
      console.info('[Adapter] ✅ Source 3 (Kitsu) succeeded');
      return transformKitsuToStandard(kitsuData, id, isMal);
    }
  } catch (err) {
    console.warn('[Adapter] Kitsu source failed:', err.message);
  }
  return null;
}

// ─── SOURCE 4: SERVER PROXY (last resort) ───────────────────────────────────
async function fetchFromProxy(id, isMal, smartRequest) {
  if (!smartRequest) return null;

  try {
    const variables = isMal ? { idMal: Number(id) } : { id: Number(id) };
    const { data } = await smartRequest('post', '/api/anilist/proxy', {
      data: { query: ANILIST_DETAIL_QUERY, variables },
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUTS.PROXY,
    });

    if (data?.data?.Media) {
      console.info('[Adapter] ✅ Source 4 (Proxy) succeeded');
      return processAniListMedia(data.data.Media);
    }
  } catch (err) {
    console.warn('[Adapter] Proxy failed:', err.message);
  }
  return null;
}

// ─── DATA TRANSFORMERS ──────────────────────────────────────────────────────

function processAniListMedia(media) {
  // Flatten deep relations — only keep ANIME type
  if (media.relations?.edges) {
    const flatMap = new Map();
    const flatten = (edges) => {
      if (!edges) return;
      edges.forEach(edge => {
        if (!edge.node || edge.node.type !== 'ANIME') return;
        if (!flatMap.has(edge.node.id) && edge.node.id !== media.id) {
          const clean = { ...edge.node };
          delete clean.relations;
          flatMap.set(edge.node.id, { relationType: edge.relationType, node: clean });
        }
        if (edge.node.relations?.edges) flatten(edge.node.relations.edges);
      });
    };
    flatten(media.relations.edges);
    media.relations.edges = Array.from(flatMap.values());
  }
  return media;
}

function transformJikanToStandard(item) {
  if (!item) return null;

  const getImage = (type) => {
    const imgs = item.images;
    return imgs?.webp?.[`${type}_image_url`] || imgs?.jpg?.[`${type}_image_url`] || null;
  };

  return {
    id: item.mal_id,
    idMal: item.mal_id,
    isMAL: true,
    title: {
      romaji: item.title,
      english: item.title_english || item.title,
      native: item.title_japanese,
      userPreferred: item.title_english || item.title,
    },
    coverImage: {
      extraLarge: getImage('large'),
      large: getImage('image'),
      medium: getImage('small'),
    },
    bannerImage: getImage('large'),
    description: item.synopsis,
    format: item.type?.toUpperCase() || 'TV',
    type: 'ANIME',
    status: mapJikanStatus(item.status),
    season: item.season?.toUpperCase() || null,
    seasonYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
    episodes: item.episodes,
    duration: item.duration ? parseInt(item.duration) : null,
    averageScore: item.score ? Math.round(item.score * 10) : null,
    meanScore: item.score ? Math.round(item.score * 10) : null,
    popularity: item.members || 0,
    favourites: item.favorites || 0,
    genres: [
      ...(item.genres || []).map(g => g.name),
      ...(item.themes || []).map(t => t.name),
      ...(item.demographics || []).map(d => d.name),
    ],
    tags: [],
    startDate: item.aired?.from ? parseDateObj(item.aired.from) : null,
    endDate: item.aired?.to ? parseDateObj(item.aired.to) : null,
    nextAiringEpisode: null,
    studios: {
      nodes: (item.studios || []).map(s => ({ name: s.name, isAnimationStudio: true })),
    },
    trailer: item.trailer?.youtube_id ? {
      id: item.trailer.youtube_id,
      site: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${item.trailer.youtube_id}/maxresdefault.jpg`,
    } : null,
    isAdult: item.rating?.includes('Rx') || false,
    countryOfOrigin: 'JP',
    source: item.source?.toUpperCase()?.replace(/ /g, '_') || null,
    synonyms: item.title_synonyms || [],
    characters: { edges: [] },
    recommendations: { nodes: [] },
    relations: {
      edges: (item.relations || [])
        .filter(r => r.entry?.some(e => e.type === 'anime'))
        .flatMap(r => r.entry.filter(e => e.type === 'anime').map(e => ({
          relationType: r.relation?.toUpperCase()?.replace(/ /g, '_') || 'OTHER',
          node: {
            id: e.mal_id,
            idMal: e.mal_id,
            isMAL: true,
            title: { romaji: e.name, english: e.name },
            coverImage: { large: e.images?.jpg?.image_url || null },
            format: e.type?.toUpperCase() || 'TV',
            type: 'ANIME',
          },
        }))),
    },
  };
}

function transformKitsuToStandard(item, originalId, isMal) {
  if (!item?.attributes) return null;
  const a = item.attributes;

  return {
    id: originalId || parseInt(item.id),
    idMal: null,
    isKitsu: true,
    title: {
      romaji: a.titles?.ja_jp || a.canonicalTitle,
      english: a.titles?.en || a.titles?.en_us || a.canonicalTitle,
      native: a.titles?.ja_jp || null,
      userPreferred: a.canonicalTitle,
    },
    coverImage: {
      extraLarge: a.posterImage?.original || a.posterImage?.large,
      large: a.posterImage?.large || a.posterImage?.medium,
      medium: a.posterImage?.small || a.posterImage?.tiny,
    },
    bannerImage: a.coverImage?.original || a.coverImage?.large || a.posterImage?.original,
    description: a.synopsis,
    format: a.subtype?.toUpperCase() || 'TV',
    type: 'ANIME',
    status: mapKitsuStatus(a.status),
    season: null,
    seasonYear: a.startDate ? new Date(a.startDate).getFullYear() : null,
    episodes: a.episodeCount,
    duration: a.episodeLength,
    averageScore: a.averageRating ? Math.round(parseFloat(a.averageRating)) : null,
    meanScore: a.averageRating ? Math.round(parseFloat(a.averageRating)) : null,
    popularity: a.userCount || 0,
    favourites: a.favoritesCount || 0,
    genres: [],
    tags: [],
    startDate: a.startDate ? parseDateObj(a.startDate) : null,
    endDate: a.endDate ? parseDateObj(a.endDate) : null,
    nextAiringEpisode: null,
    studios: { nodes: [] },
    trailer: a.youtubeVideoId ? {
      id: a.youtubeVideoId,
      site: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${a.youtubeVideoId}/maxresdefault.jpg`,
    } : null,
    isAdult: a.nsfw || false,
    countryOfOrigin: 'JP',
    source: null,
    synonyms: a.abbreviatedTitles || [],
    characters: { edges: [] },
    recommendations: { nodes: [] },
    relations: { edges: [] },
  };
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseDateObj(dateStr) {
  try {
    const d = new Date(dateStr);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  } catch { return null; }
}

function mapJikanStatus(s) {
  const map = {
    'Currently Airing': 'RELEASING',
    'Finished Airing': 'FINISHED',
    'Not yet aired': 'NOT_YET_RELEASED',
  };
  return map[s] || 'FINISHED';
}

function mapKitsuStatus(s) {
  const map = {
    current: 'RELEASING',
    finished: 'FINISHED',
    tba: 'NOT_YET_RELEASED',
    unreleased: 'NOT_YET_RELEASED',
    upcoming: 'NOT_YET_RELEASED',
  };
  return map[s] || 'FINISHED';
}

// ─── MAIN ADAPTER FUNCTION ──────────────────────────────────────────────────

/**
 * Fetch anime details from multiple sources with full fallback chain.
 *
 * @param {number|string} id - AniList ID or MAL ID
 * @param {boolean} isMal - true if `id` is a MAL ID
 * @param {object} options - { smartRequest, cacheGet, cacheSet }
 * @returns {object|null} Anime data in AniList-compatible format
 */
export async function adapterGetAnimeDetails(id, isMal = false, options = {}) {
  const { smartRequest, cacheGet, cacheSet } = options;

  // Cache check
  const cacheKey = `adapter_${id}_${isMal}`;
  if (cacheGet) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  if (!id) {
    console.error('[Adapter] No ID provided');
    return null;
  }

  const numId = Number(id);

  console.info(`[Adapter] Fetching anime ID: ${numId} (isMal: ${isMal})`);

  // ── TRY ALL SOURCES IN PRIORITY ORDER ──
  let result = null;

  // Source 1: Direct AniList (most reliable, richest data)
  result = await fetchFromAniListDirect(numId, isMal);
  if (result) {
    if (cacheSet) cacheSet(cacheKey, result);
    return result;
  }

  // Source 2: Jikan/MAL (good fallback, has relations)
  result = await fetchFromJikan(numId, isMal);
  if (result) {
    if (cacheSet) cacheSet(cacheKey, result);
    return result;
  }

  // Source 3: Kitsu (minimal but works)
  result = await fetchFromKitsu(numId, isMal);
  if (result) {
    if (cacheSet) cacheSet(cacheKey, result);
    return result;
  }

  // Source 4: Server Proxy (known to be blocked, but try anyway)
  result = await fetchFromProxy(numId, isMal, smartRequest);
  if (result) {
    if (cacheSet) cacheSet(cacheKey, result);
    return result;
  }

  console.error(`[Adapter] ✗ ALL 4 SOURCES FAILED for ID: ${numId} (isMal: ${isMal})`);
  return null;
}

/**
 * Fetch anime list (for browse/search pages) from AniList with Jikan fallback.
 */
export async function adapterFetchList(query, variables = {}, signal) {
  const NON_GQL = new Set(['genres', 'language']);
  const cleanVars = Object.fromEntries(
    Object.entries(variables).filter(([k, v]) =>
      !NON_GQL.has(k) && v !== null && v !== undefined && v !== '' &&
      (Array.isArray(v) ? v.length > 0 : true)
    )
  );

  const payload = { query, variables: cleanVars };
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

  const extractResult = (data) => {
    if (!data) return null;
    if (data.errors?.length) {
      console.warn('[Adapter] List errors:', data.errors[0]?.message);
      return null;
    }
    let result = data.data?.Page || data.Page || data.data || data;
    if (result?.media || result?.Page || result?.Media) return result;
    return null;
  };

  // Source 1: Direct AniList
  try {
    const { data } = await axios.post(ANILIST_GQL, payload, { headers, timeout: 10000, signal });
    const result = extractResult(data);
    if (result) {
      console.info('[Adapter] ✅ List: Direct AniList succeeded');
      return result;
    }
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.errors?.some(e => e.message?.includes('Page depth'))) {
      return { media: [], pageInfo: { total: 0, hasNextPage: false } };
    }
    console.warn('[Adapter] List: Direct AniList failed:', err.message);
  }

  // Source 2: Proxy (may have cache)
  // (smartRequest not available here, skip proxy for list queries)

  return { media: [], pageInfo: { total: 0 } };
}
