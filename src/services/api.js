import axios from "axios";

export const PYTHON_API = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? "http://localhost:7860"
  : (import.meta.env.VITE_PYTHON_API || "");

export const PYTHON_API_BACKUP = import.meta.env.VITE_PYTHON_API_BACKUP || "";



export const ANILIST_URL = `${PYTHON_API}/api/anilist/proxy`;
export const TENZORA_SERVER = PYTHON_API;
export const JIKAN_BASE_URL = import.meta.env.VITE_JIKAN_API || "https://api.jikan.moe/v4";

export const CHAT_SERVER = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? "http://localhost:8080"
  : (import.meta.env.VITE_CHAT_API || "");

export const WT_SERVER = import.meta.env.VITE_WATCH2GETHER_API || import.meta.env.VITE_WT_API || (
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
    ? "http://localhost:8081"
    : ""
);


// --- ADVANCED HYBRID CACHE MANAGER ---
const CACHE_TTL = {
  GENRES: 1000 * 60 * 60 * 24 * 30, // 30 days
  RECENT_DUBS: 1000 * 60 * 60 * 2,  // 2 hours
  BROWSE: 1000 * 60 * 60 * 24,      // 24 hours
  TRENDING: 1000 * 60 * 60 * 2,     // 2 hours
  POPULAR: 1000 * 60 * 60 * 24,     // 24 hours
  DETAILS: 1000 * 60 * 60 * 2,      // 2 hours
  SCHEDULE: 1000 * 60 * 60 * 6,     // 6 hours
};

const MemoryCache = new Map();

const cache = {
  get: (key) => {
    try {
      const cacheKey = `tenzora_cache_${key}`;

      // 1. Check In-Memory Cache (Fastest)
      if (MemoryCache.has(cacheKey)) {
        const { value, expiry } = MemoryCache.get(cacheKey);
        if (new Date().getTime() < expiry) return value;
        MemoryCache.delete(cacheKey);
      }

      // 2. Check LocalStorage (Persistent)
      const item = localStorage.getItem(cacheKey);
      if (!item) return null;

      const { value, expiry } = JSON.parse(item);
      if (new Date().getTime() > expiry) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // 3. Sync back to memory for next request
      MemoryCache.set(cacheKey, { value, expiry });
      return value;
    } catch { return null; }
  },

  set: (key, value, ttl) => {
    try {
      const cacheKey = `tenzora_cache_${key}`;
      const expiry = new Date().getTime() + ttl;
      const cacheData = { value, expiry };

      // Update both layers
      MemoryCache.set(cacheKey, cacheData);
      
      // Strict LRU for MemoryCache to prevent RAM bloat
      if (MemoryCache.size > 50) {
        const firstKey = MemoryCache.keys().next().value;
        MemoryCache.delete(firstKey);
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Cleanup older entries if localStorage gets full (simple pruning)
      if (localStorage.length > 50) {
        cache.prune();
      }
    } catch {
      // Storage might be full or in private mode, silently fail
    }
  },

  prune: () => {
    try {
      const now = new Date().getTime();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tenzora_cache_')) {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expiry < now) localStorage.removeItem(key);
        }
      });
    } catch {
      // Silently fail if pruning fails due to invalid JSON in storage
    }
  }
};


// Helper to filter out adult and Rx (Hentai) rated anime from media lists
function cleanMediaList(media, allowAdult = false) {
  if (!media || !Array.isArray(media)) return [];
  if (allowAdult) return media; // Return all if adult is explicitly requested
  
  return media.filter(anime => {
    if (!anime) return false;
    const isAdult = anime.isAdult === true;
    const isRxRating = typeof anime.rating === 'string' && anime.rating.includes("Rx");
    const isRxAgeRating = typeof anime.ageRating === 'string' && anime.ageRating.includes("Rx");
    const hasHentaiGenre = Array.isArray(anime.genres) && anime.genres.some(g => typeof g === 'string' && g.toLowerCase() === 'hentai');
    return !isAdult && !isRxRating && !isRxAgeRating && !hasHentaiGenre;
  });
}

// Mapper to convert Jikan data to AniList-like structure used by the UI
function mapJikanToAnilist(j) {
  if (!j) return null;
  return {
    id: j.mal_id,
    idMal: j.mal_id,
    title: {
      romaji: j.title,
      english: j.title_english || j.title,
      native: j.title_japanese
    },
    coverImage: {
      extraLarge: j.images?.jpg?.large_image_url,
      large: j.images?.jpg?.image_url,
      medium: j.images?.jpg?.small_image_url
    },
    bannerImage: j.trailer?.images?.maximum_image_url || null, // Best approximation for banners
    episodes: j.episodes,
    status: j.status === "Currently Airing" ? "RELEASING" :
      j.status === "Finished Airing" ? "FINISHED" : "NOT_YET_RELEASED",
    format: j.type === "Movie" ? "MOVIE" : (j.type?.toUpperCase() || "TV"),
    averageScore: j.score ? Math.round(j.score * 10) : null,
    genres: j.genres?.map(g => g.name) || [],
    description: j.synopsis,
    seasonYear: j.year || j.aired?.prop?.from?.year,
    season: j.season?.toUpperCase(),
    isAdult: j.rating?.includes("Rx") || false,
    nextAiringEpisode: j.airing ? { episode: (j.episodes || 0) + 1 } : null
  };
}

async function fetchFromJikan(endpoint, params = {}, signal) {
  try {
    const query = new URLSearchParams({ sfw: true, ...params }).toString();
    const { data } = await axios.get(`${JIKAN_BASE_URL}${endpoint}${query ? `?${query}` : ""}`, { signal });

    return {
      media: cleanMediaList(data.data?.map(mapJikanToAnilist) || []),
      pageInfo: {
        hasNextPage: data.pagination?.has_next_page || false,
        lastPage: data.pagination?.last_visible_page || 1,
        total: data.pagination?.items?.total || 0
      }
    };
  } catch (err) {
    if (axios.isCancel(err)) return { media: [], pageInfo: { total: 0 } };
    console.error("Jikan Fetch Error:", err.message);
    return { media: [], pageInfo: { total: 0 } };
  }
}

// Helper for automatic failover
async function smartRequest(method, path, options = {}) {
  const primaryUrl = `${PYTHON_API}${path}`;
  const backupUrl = PYTHON_API_BACKUP ? `${PYTHON_API_BACKUP}${path}` : null;

  try {
    return await axios({ method, url: primaryUrl, ...options });
  } catch (err) {
    const isNetworkError = !err.response || err.response.status >= 500 || err.code === 'ERR_NETWORK';
    if (backupUrl && isNetworkError) {
      console.warn(`[Failover] Primary backend failed, trying backup: ${backupUrl}`);
      return await axios({ method, url: backupUrl, ...options });
    }
    throw err;
  }
}

export const backendApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API || "https://anixo-wckh.onrender.com",
});

// Auth-specific API instance — same-origin, proxied by Cloudflare Pages Functions.
export const authApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API || "https://anixo-wckh.onrender.com",
});

backendApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add a special header to help Vercel distinguish API calls from page refreshes
  config.headers['x-api'] = 'true';
  return config;
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['x-api'] = 'true';
  return config;
});

// Fields that are used internally but are NOT valid AniList GraphQL variables
const NON_GRAPHQL_FIELDS = new Set(["genres", "language"]);

async function fetchFromAniList(query, variables = {}, signal) {
  try {
    // Clean up variables: strip non-GraphQL fields and empty values
    const cleanVariables = Object.fromEntries(
      Object.entries(variables).filter(([k, v]) =>
        !NON_GRAPHQL_FIELDS.has(k) &&
        v !== null &&
        v !== undefined &&
        v !== "" &&
        (Array.isArray(v) ? v.length > 0 : true)
      )
    );

    const payload = { query, variables: cleanVariables };
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };

    // 1. Try proxy first
    try {
      const { data } = await smartRequest("post", "/api/anilist/proxy", {
        data: payload,
        headers,
        timeout: 10000,
        signal,
      });

      if (data) {
        if (data.source) console.info(`[API] Data source: ${data.source}`);
        if (data.errors && Array.isArray(data.errors)) {
          console.error("AniList GraphQL Errors:", data.errors);
        } else {
          let result = data.data?.Page || data.Page || data.data || data;
          if (result) {
            if (Array.isArray(result.media)) {
              result.media = cleanMediaList(result.media);
            } else if (result.Page && Array.isArray(result.Page.media)) {
              result.Page.media = cleanMediaList(result.Page.media);
            }
            if (result.media || result.Page || result.Media) {
              return result;
            }
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors?.some(e => e.message?.includes("Page depth exceeds maximum allowed"))) {
         return { media: [], pageInfo: { total: 0, hasNextPage: false } };
      }
      console.warn("[AniList] Proxy failed, trying direct...", err.message);
    }

    // 2. Fallback to direct AniList GraphQL
    try {
      const { data } = await axios.post("https://graphql.anilist.co", payload, {
        headers,
        timeout: 10000,
        signal,
      });

      if (data) {
        if (data.errors && Array.isArray(data.errors)) {
          console.error("AniList GraphQL Errors:", data.errors);
        } else {
          let result = data.data?.Page || data.Page || data.data || data;
          if (result) {
            if (Array.isArray(result.media)) {
              result.media = cleanMediaList(result.media);
            } else if (result.Page && Array.isArray(result.Page.media)) {
              result.Page.media = cleanMediaList(result.Page.media);
            }
            if (result.media || result.Page || result.Media) {
              console.info("[AniList] ✓ Direct AniList succeeded");
              return result;
            }
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors?.some(e => e.message?.includes("Page depth exceeds maximum allowed"))) {
         return { media: [], pageInfo: { total: 0, hasNextPage: false } };
      }
      console.warn("[AniList] Direct AniList failed:", err.message);
    }

    return { media: [], pageInfo: { total: 0 } };
  } catch (err) {
    if (axios.isCancel(err)) return { media: [], pageInfo: { total: 0 } };
    console.error("AniList Fetch Error:", err.message);
    return { media: [], pageInfo: { total: 0 } };
  }
}

const SCHEDULE_QUERY = `
  query ($page: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { total hasNextPage }
      airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          title { romaji english native }
          coverImage { extraLarge large medium }
          format
          popularity
          isAdult
        }
      }
    }
  }
`;

export async function getSchedule(startTimestamp, endTimestamp) {
  const cacheKey = `schedule_${startTimestamp}_${endTimestamp}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const variables = {
    page: 1,
    airingAt_greater: startTimestamp,
    airingAt_lesser: endTimestamp,
  };
  const payload = { query: SCHEDULE_QUERY, variables };
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };

  let data = null;

  // 1. Try proxy
  try {
    const response = await smartRequest("post", "/api/anilist/proxy", {
      data: payload,
      headers,
      timeout: 10000,
    });
    data = response.data;
  } catch (err) {
    console.warn("[Schedule] Proxy failed, trying direct AniList...", err.message);
  }

  // 2. Fallback to direct AniList
  if (!data) {
    try {
      const response = await axios.post("https://graphql.anilist.co", payload, {
        headers,
        timeout: 10000,
      });
      data = response.data;
      console.info("[Schedule] ✓ Direct AniList succeeded");
    } catch (err) {
      console.warn("[Schedule] Direct AniList failed:", err.message);
    }
  }

  if (data) {
    if (data.errors) {
      console.error("AniList Schedule Errors:", data.errors);
      return [];
    }
    const scheduleData = data.data?.Page?.airingSchedules || [];
    if (scheduleData.length > 0) cache.set(cacheKey, scheduleData, CACHE_TTL.SCHEDULE);
    return scheduleData;
  }

  return [];
}

export const SEARCH_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 50) {
      media(type: ANIME, search: $search, isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        episodes
        nextAiringEpisode {
          airingAt
          episode
        }
        format
        status
        seasonYear
        averageScore
        isAdult
      }
    }
  }
`;

// Format search queries to fix AniList's strict string matching
function formatSearchQuery(q) {
  if (!q || typeof q !== "string") return q;
  return q
    .replace(/\brezero\b/gi, "re zero")
    .replace(/\bdanmachi\b/gi, "dungeon ni deai")
    .replace(/\bkonosuba\b/gi, "kono subarashii")
    .replace(/\boregairu\b/gi, "yahari ore no seishun")
    .replace(/\bsao\b/gi, "sword art online")
    .replace(/\baot\b/gi, "attack on titan")
    .replace(/\bfmab\b/gi, "fullmetal alchemist brotherhood")
    .replace(/\bhxh\b/gi, "hunter x hunter")
    .replace(/\bmha\b/gi, "my hero academia")
    .replace(/\btensura\b/gi, "tensei shitara slime");
}

export async function searchAnime(query, filters = {}) {
  if (!query && Object.keys(filters).length === 0) return [];
  try {
    const formattedQuery = formatSearchQuery(query);
    // Priority: Search using AniList for standard IDs and metadata
    const variables = {
      search: formattedQuery || undefined,
      perPage: 15,
      ...filters
    };

    const anilistRes = await fetchFromAniList(BROWSE_QUERY, variables);

    if (anilistRes?.media?.length > 0) {
      // Allow adult content if the user explicitly typed a search query
      const allowAdult = !!query;
      let resultMedia = cleanMediaList(anilistRes.media, allowAdult);
      
      // SMART SEARCH: Augment navbar quick search with Jikan if < 10 results
      if (query && resultMedia.length < 10) {
        try {
          const jikanRes = await fetchFromJikan("/anime", { q: query, limit: 15 });
          if (jikanRes?.media?.length > 0) {
            const jikanClean = cleanMediaList(jikanRes.media, allowAdult);
            const existingIds = new Set(resultMedia.map(m => m.id));
            const extra = jikanClean.filter(m => !existingIds.has(m.id));
            resultMedia = [...resultMedia, ...extra];
          }
        } catch (e) {
          console.warn("[Search] Smart Search augmentation failed:", e.message);
        }
      }
      return resultMedia;
    }

    // Fallback: Search using Jikan (MyAnimeList) if AniList is unreachable or returns no results
    if (query) {
      console.warn("[Search] AniList search returned no results, falling back to Jikan...");
      const jikanRes = await fetchFromJikan("/anime", { q: query, limit: 15 });
      return jikanRes.media || [];
    }
    return [];
  } catch (err) {
    console.error("Search failed:", err);
    return [];
  }
}

export async function getGenres() {
  const query = `{ GenreCollection }`;
  try {
    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: { query },
      headers: { "Content-Type": "application/json" },
    });
    return data.data?.GenreCollection || [];
  } catch (err) {
    console.error("Error fetching genres:", err);
    return [];
  }
}

export const BROWSE_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $format_in: [MediaFormat], $sort: [MediaSort], $seasonYear: Int, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $country: CountryCode, $averageScore_greater: Int, $isAdult: Boolean) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, search: $search, format_in: $format_in, sort: $sort, seasonYear: $seasonYear, status: $status, genre_in: $genre_in, tag_in: $tag_in, season: $season, countryOfOrigin: $country, averageScore_greater: $averageScore_greater, isAdult: $isAdult) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        format
        episodes
        seasonYear
        genres
        tags { name }
        nextAiringEpisode {
          airingAt
          episode
        }
        averageScore
        status
        countryOfOrigin
        isAdult
      }
    }
  }
`;

export async function getBrowseAnime(variables, signal) {
  // Apply formatting to search query if present
  if (variables.search) {
    variables.search = formatSearchQuery(variables.search);
  }
  
  const varKey = JSON.stringify(variables);
  const cachedData = cache.get(`browse_${varKey}`);
  if (cachedData) return cachedData;

  // Clean variables for AniList GraphQL (strip non-GraphQL fields)
  const cleanVars = Object.fromEntries(
    Object.entries(variables).filter(([k, v]) =>
      !NON_GRAPHQL_FIELDS.has(k) &&
      v !== null && v !== undefined && v !== "" &&
      (Array.isArray(v) ? v.length > 0 : true)
    )
  );

  // If isAdult is explicitly true or user is searching by text, allow both 18+ and normal
  const allowAdult = cleanVars.isAdult === true || !!cleanVars.search;
  
  if (allowAdult) {
    delete cleanVars.isAdult;
  } else {
    cleanVars.isAdult = false;
  }

  const payload = { query: BROWSE_QUERY, variables: cleanVars };
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };

  // 1. Try local API proxy
  try {
    const { data } = await axios.post("/api/anilist/proxy", payload, { headers, timeout: 12000, signal });
    const page = data?.data?.Page || data?.Page;
    if (page?.media?.length > 0) {
      console.info("[Browse] ✓ Local proxy succeeded (AniList)");
      const result = { media: cleanMediaList(page.media, allowAdult), pageInfo: page.pageInfo };
      cache.set(`browse_${varKey}`, result, CACHE_TTL.BROWSE);
      return result;
    }
  } catch (err) {
    console.warn("[Browse] Local proxy failed:", err.message);
  }

  // Helper function for Smart Search Augmentation
  const applySmartSearch = async (media, pageInfo) => {
    let resultMedia = cleanMediaList(media, allowAdult);
    // SMART SEARCH: If text search returns few results, augment with Jikan's fuzzy search
    if (variables.search && resultMedia.length < 10) {
      try {
        console.info("[Browse] Smart Search: Augmenting with Jikan for:", variables.search);
        const jikanRes = await getBrowseAnimeJikanDirect(variables);
        if (jikanRes?.media?.length > 0) {
          const jikanClean = cleanMediaList(jikanRes.media, allowAdult);
          const existingIds = new Set(resultMedia.map(m => m.id));
          const extra = jikanClean.filter(m => !existingIds.has(m.id));
          if (extra.length > 0) {
            resultMedia = [...resultMedia, ...extra];
            pageInfo.total = Math.max(pageInfo.total, resultMedia.length);
          }
        }
      } catch (e) {
        console.warn("[Browse] Smart Search augmentation failed:", e.message);
      }
    }
    return { media: resultMedia, pageInfo };
  };

  // 2. Direct AniList GraphQL call
  try {
    const { data } = await axios.post("https://graphql.anilist.co", payload, { headers, timeout: 12000, signal });
    const page = data?.data?.Page;
    if (page?.media?.length > 0) {
      console.info("[Browse] ✓ Direct AniList succeeded");
      const result = await applySmartSearch(page.media, page.pageInfo);
      cache.set(`browse_${varKey}`, result, CACHE_TTL.BROWSE);
      return result;
    }
  } catch (err) {
    console.warn("[Browse] Direct AniList failed:", err.message);
  }

  // 3. HuggingFace proxy
  try {
    const proxyRes = await fetchFromAniList(BROWSE_QUERY, variables);
    if (proxyRes?.media?.length > 0) {
      const result = await applySmartSearch(proxyRes.media, proxyRes.pageInfo);
      cache.set(`browse_${varKey}`, result, CACHE_TTL.BROWSE);
      return result;
    }
  } catch (err) {
    console.warn("[Browse] HF proxy failed:", err.message);
  }

  // 4. Jikan Fallback (CRITICAL: AniList API currently returns 0 results for text searches)
  if (variables.search) {
    console.warn("[Browse] All AniList attempts returned 0 results for search. Falling back to Jikan...");
    try {
      const directRes = await getBrowseAnimeJikanDirect(variables);
      if (directRes?.media?.length > 0) {
        const finalRes = { ...directRes, media: cleanMediaList(directRes.media, allowAdult), isJikanFallback: true };
        cache.set(`browse_${varKey}`, finalRes, CACHE_TTL.BROWSE);
        return finalRes;
      }
    } catch (err) {
      console.error("[Browse] Direct Jikan also failed:", err.message);
    }
  }

  return { media: [], pageInfo: { total: 0, hasNextPage: false } };
}

export const ANIME_QUERY = `
  query ($page: Int, $sort: [MediaSort], $status_in: [MediaStatus]) {
    Page(page: $page, perPage: 24) {
      pageInfo { total hasNextPage lastPage }
      media(type: ANIME, sort: $sort, status_in: $status_in, isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        bannerImage
        description
        genres
        episodes
        nextAiringEpisode {
          airingAt
          episode
        }
        format
        status
        seasonYear
        averageScore
        isAdult
      }
    }
  }
`;

export async function getTrendingAnime(page = 1, signal) {
  const cacheKey = `trending_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, {
      page,
      sort: ["TRENDING_DESC", "POPULARITY_DESC"]
    }, signal);
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.TRENDING);
    return anilistRes;
  }

  console.warn("[Failover] AniList Trending failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/top/anime", { page, filter: "airing", limit: 24 }, signal);
  return jikanRes;
}

const TOP_MOVIES_QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: 10) {
      media(type: ANIME, format: MOVIE, sort: [SCORE_DESC, POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        format
        seasonYear
        episodes
        averageScore
      }
    }
  }
`;

export async function getTopMovies(page = 1) {
  const cacheKey = `top_movies_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  try {
    const anilistRes = await fetchFromAniList(TOP_MOVIES_QUERY, { page });
    if (anilistRes?.media?.length > 0) {
      cache.set(cacheKey, anilistRes, CACHE_TTL.TRENDING); // Share TTL with trending
      return anilistRes;
    }
  } catch (error) {
    console.error("Failed to fetch top movies from AniList:", error);
  }
  return null;
}

export async function getPopularAnime(page = 1, signal) {
  const cacheKey = `popular_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, {
      page,
      sort: ["POPULARITY_DESC"]
    }, signal);
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.POPULAR);
    return anilistRes;
  }

  console.warn("[Failover] AniList Popular failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/top/anime", { page, filter: "bypopularity", limit: 24 }, signal);
  return jikanRes;
}

export async function getUpcomingAnime(page = 1, signal) {
  const cacheKey = `upcoming_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, {
    page,
    sort: ["TRENDING_DESC"],
    status_in: ["NOT_YET_RELEASED"]
  }, signal);
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.TRENDING); // Share TTL with trending
    return anilistRes;
  }

  console.warn("[Failover] AniList Upcoming failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/seasons/upcoming", { page, limit: 24 }, signal);
  return jikanRes;
}

export async function getNewReleases(page = 1, signal) {
  const cacheKey = `newReleases_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, {
      page,
      sort: ["START_DATE_DESC"]
    }, signal);
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.TRENDING); // Similar TTL as trending
    return anilistRes;
  }

  console.warn("[Failover] AniList New Releases failed, switching to Jikan...");
  // Use 'airing' or 'upcoming' depending on context, but here we want things with episodes
  const jikanRes = await fetchFromJikan("/top/anime", { page, filter: "airing", limit: 24 }, signal);
  return jikanRes;
}

export async function getJustCompletedAnime(page = 1, signal) {
  const cacheKey = `justCompleted_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, {
    page,
    sort: ["END_DATE_DESC"],
    status_in: ["FINISHED"]
  }, signal);
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.POPULAR);
    return anilistRes;
  }

  console.warn("[Failover] AniList Just Completed failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/top/anime", { page, limit: 24 }, signal);
  return jikanRes;
}


const SEASONAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $page: Int, $status_in: [MediaStatus]) {
    Page(page: $page, perPage: 30) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: $sort, status_in: $status_in, isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        format
        episodes
        nextAiringEpisode {
          airingAt
          episode
        }
        averageScore
        status
        isAdult
      }
    }
  }
`;

export async function getPopularThisSeason(page = 1) {
  const date = new Date();
  const month = date.getMonth();
  const year = date.getFullYear();

  let season;
  if (month >= 0 && month <= 2) season = "WINTER"; // Jan-Mar
  else if (month >= 3 && month <= 5) season = "SPRING"; // Apr-Jun
  else if (month >= 6 && month <= 8) season = "SUMMER"; // Jul-Sep
  else season = "FALL"; // Oct-Dec

  const anilistRes = await fetchFromAniList(SEASONAL_QUERY, {
    season,
    seasonYear: year,
    sort: ["POPULARITY_DESC"],
    page,
    status_in: ["RELEASING", "FINISHED"]
  });

  if (anilistRes?.media?.length > 0) {
    return anilistRes;
  }

  console.warn("[Failover] AniList Popular This Season failed, switching to Jikan...");
  return fetchFromJikan("/top/anime", { page, filter: "airing", limit: 20 });
}






const DETAIL_QUERY = `
fragment RelationFields on Media {
  id
  idMal
  title { romaji english native }
  coverImage { extraLarge large }
  episodes
  format
  type
  startDate { year month day }
}

query ($id: Int, $idMal: Int) {
  Media(id: $id, idMal: $idMal, type: ANIME) {
    id
    idMal
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    description
    format
    episodes
    status
    averageScore
    genres
    seasonYear
    isAdult
    countryOfOrigin
    startDate { year month day }
    endDate { year month day }
    duration
    synonyms
    studios {
      edges {
        isMain
        node { name }
      }
    }
    nextAiringEpisode {
      airingAt
      episode
    }
    streamingEpisodes {
      title
      thumbnail
    }
    relations {
      edges {
        relationType
        node {
          ...RelationFields
          relations {
            edges {
              relationType
              node {
                ...RelationFields
                relations {
                  edges {
                    relationType
                    node {
                      ...RelationFields
                      relations {
                        edges {
                          relationType
                          node {
                            ...RelationFields
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    trailer {
      id
      site
      thumbnail
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { large }
        }
        voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
          id
          name { full userPreferred }
          image { large }
        }
      }
    }
    staff(perPage: 6, sort: [RELEVANCE]) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { large }
        }
      }
    }
    recommendations(sort: [RATING_DESC], perPage: 50) {
      nodes {
        mediaRecommendation {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          format
          episodes
          averageScore
        }
      }
    }
  }
}
`;

export async function getAnimeDetails(id, isMal = false) {
  const cacheKey = `details_${id}_${isMal}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  let finalId = id;
  let finalIsMal = isMal;

  const variables = finalIsMal ? { idMal: finalId } : { id: finalId };
  const payload = { query: DETAIL_QUERY, variables };
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };

  if (!variables.id && !finalIsMal && !finalId) {
    console.error("[Watch] Aborting AniList query: No ID provided.");
    return null;
  }

  try {
    let data = null;

    // 1. Try proxy first
    try {
      const response = await smartRequest("post", "/api/anilist/proxy", {
        data: payload,
        headers,
        timeout: 10000,
      });
      data = response.data;
    } catch (err) {
      console.warn("[AnimeDetails] Proxy failed, trying direct AniList...", err.message);
    }

    // 2. Fallback to direct AniList
    if (!data) {
      try {
        const response = await axios.post("https://graphql.anilist.co", payload, {
          headers,
          timeout: 10000,
        });
        data = response.data;
        console.info("[AnimeDetails] ✓ Direct AniList succeeded");
      } catch (err) {
        console.warn("[AnimeDetails] Direct AniList failed:", err.message);
      }
    }

    if (!data) {
      console.error("AniList Detail: No response from any source");
      // FALLBACK TO JIKAN if we have a MAL ID
      if (finalIsMal) {
        console.info(`[Fallback] Attempting Jikan fallback for MAL ID: ${finalId}`);
        const jikanData = await getJikanAnimeDetails(finalId);
        if (jikanData) {
          const result = transformJikanToAnilist(jikanData);
          cache.set(cacheKey, result, CACHE_TTL.DETAILS);
          return result;
        }
      }
      return null;
    }

    if (data.errors) {
      console.error("AniList Detail Errors [ID:", finalId, "]:", data.errors);
      return null;
    }

    const media = data.data?.Media || data.Media;
    if (!media) {
      console.warn("AniList Detail: No media found in response for ID:", finalId);
      // FALLBACK TO JIKAN if we have a MAL ID
      if (finalIsMal) {
        console.info(`[Fallback] Attempting Jikan fallback for MAL ID: ${finalId}`);
        const jikanData = await getJikanAnimeDetails(finalId);
        if (jikanData) {
          const result = transformJikanToAnilist(jikanData);
          cache.set(cacheKey, result, CACHE_TTL.DETAILS);
          return result;
        }
      }
      return null;
    }

    // Flatten deep relations for season navigation
    if (media.relations?.edges) {
      const flatRelationsMap = new Map();

      const flattenEdges = (edges) => {
        if (!edges) return;
        edges.forEach(edge => {
          if (!edge.node) return;
          // IMPORTANT: Only include ANIME media. Clicking on Manga/LN causes "Anime Not Found" errors.
          if (edge.node.type !== 'ANIME') return;

          if (!flatRelationsMap.has(edge.node.id) && edge.node.id !== media.id) {
            const cleanNode = { ...edge.node };
            delete cleanNode.relations;
            flatRelationsMap.set(edge.node.id, {
              relationType: edge.relationType,
              node: cleanNode
            });
          }
          if (edge.node.relations?.edges) {
            flattenEdges(edge.node.relations.edges);
          }
        });
      };

      flattenEdges(media.relations.edges);
      media.relations.edges = Array.from(flatRelationsMap.values());
    }

    cache.set(cacheKey, media, CACHE_TTL.DETAILS);
    return media;
  } catch (err) {
    console.error("getAnimeDetails Error:", err);

    // FALLBACK TO JIKAN on error if we have a MAL ID
    if (finalIsMal) {
      try {
        console.info(`[Fallback] AniList Down. Attempting Jikan for MAL ID: ${finalId}`);
        const jikanData = await getJikanAnimeDetails(finalId);
        if (jikanData) {
          const result = transformJikanToAnilist(jikanData);
          cache.set(cacheKey, result, CACHE_TTL.DETAILS);
          return result;
        }
      } catch (fallbackErr) {
        console.error("[Fallback] Jikan fallback failed:", fallbackErr);
      }
    }

    return null;
  }
}

// Helper to transform Jikan response to match the AniList structure expected by the app
function transformJikanToAnilist(item) {
  return {
    id: item.mal_id,
    idMal: item.mal_id,
    isMAL: true,
    title: {
      romaji: item.title,
      english: item.title_english || item.title,
      native: item.title_japanese
    },
    coverImage: {
      extraLarge: item.images.webp.large_image_url || item.images.jpg.large_image_url,
      large: item.images.webp.image_url || item.images.jpg.image_url
    },
    bannerImage: item.images.webp.large_image_url || item.images.jpg.large_image_url,
    description: item.synopsis,
    genres: [
      ...(item.genres || []).map(g => g.name),
      ...(item.themes || []).map(t => t.name),
      ...(item.demographics || []).map(d => d.name)
    ],
    format: item.type?.toUpperCase(),
    episodes: item.episodes,
    seasonYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
    averageScore: item.score ? item.score * 10 : null,
    status: item.status === "Currently Airing" ? "RELEASING" : "FINISHED",
    startDate: item.aired?.from ? {
      year: new Date(item.aired.from).getFullYear(),
      month: new Date(item.aired.from).getMonth() + 1,
      day: new Date(item.aired.from).getDate()
    } : null,
    relations: { edges: [] },
    recommendations: { nodes: [] }
  };
}

export async function checkDubAvailability(anilistId) {
  try {
    const { data } = await smartRequest("get", `/api/check-dub/${anilistId}`);
    return data;
  } catch (err) {
    console.error("Dub check failed:", err.message);
    // Strict Validation: On error, do NOT assume DUB exists.
    return { hasSub: true, hasDub: false, subCount: 0, dubCount: 0 };
  }
}

// Map Jikan anime item to the AniList-like structure used by Browse
function mapJikanBrowseItem(item) {
  return {
    id: item.mal_id,
    idMal: item.mal_id,
    isMAL: true,
    title: {
      romaji: item.title,
      english: item.title_english || item.title,
      native: item.title_japanese
    },
    coverImage: {
      large: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
      medium: item.images?.webp?.image_url || item.images?.jpg?.image_url
    },
    genres: [
      ...(item.genres || []).map(g => g.name),
      ...(item.themes || []).map(t => t.name),
      ...(item.demographics || []).map(d => d.name)
    ],
    format: item.type?.toUpperCase(),
    episodes: item.episodes,
    seasonYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
    averageScore: item.score ? item.score * 10 : null,
    status: item.status === "Currently Airing" ? "RELEASING" : "FINISHED",
    rating: item.rating ? item.rating.split(' - ')[0].trim() : null,
    isAdult: item.rating?.includes("Rx") || false,
  };
}

const MAL_GENRE_MAP = {
  "Action": 1, "Adventure": 2, "Avant Garde": 5, "Boys Love": 28, "Comedy": 4, "Demons": 6, "Drama": 8, "Ecchi": 9, "Fantasy": 10, "Girls Love": 26, "Gourmet": 47, "Harem": 35, "Horror": 14, "Isekai": 62, "Iyashikei": 63, "Josei": 43, "Kids": 15, "Magic": 16, "Mahou Shoujo": 66, "Martial Arts": 17, "Mecha": 18, "Military": 38, "Music": 19, "Mystery": 7, "Parody": 20, "Psychological": 40, "Reverse Harem": 73, "Romance": 22, "School": 23, "Sci-Fi": 24, "Seinen": 42, "Shoujo": 25, "Shounen": 27, "Slice of Life": 36, "Space": 29, "Sports": 30, "Super Power": 31, "Supernatural": 37, "Suspense": 41, "Thriller": 45, "Vampire": 32
};

function buildJikanParams(variables) {
  const { page = 1, genres = [], search = "", status = "", sort = "popularity" } = variables;
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", "25");
  if (search) params.set("q", search);

  const malGenreIds = genres.map(g => Object.prototype.hasOwnProperty.call(MAL_GENRE_MAP, g) ? MAL_GENRE_MAP[g] : null).filter(Boolean);
  if (malGenreIds.length > 0) params.set("genres", malGenreIds.join(","));

  if (status === "RELEASING") params.set("status", "airing");
  if (status === "FINISHED") params.set("status", "complete");

  // Handle AniList sort formats like ["POPULARITY_DESC"] or simple string "popularity"
  const sortStr = Array.isArray(sort) ? sort[0]?.toUpperCase() : sort?.toUpperCase();

  if (sortStr?.includes("SCORE")) {
    params.set("order_by", "score");
    params.set("sort", "desc");
  }
  else {
    // Default to 'members' descending for popularity.
    // WARNING: In Jikan v4, 'order_by=popularity&sort=desc' returns the LEAST popular anime 
    // because MAL popularity is a rank (1 = most popular). We want 'members' desc.
    params.set("order_by", "members");
    params.set("sort", "desc");
  }

  return params;
}

function parseJikanResponse(data) {
  // Handle various response shapes from proxy vs direct API
  const items = data?.data || data?.results || [];
  if (!Array.isArray(items) || items.length === 0) return null;

  // Deduplicate items based on mal_id to prevent double cards
  const uniqueItemsMap = new Map();
  items.forEach(item => {
    if (item?.mal_id && !uniqueItemsMap.has(item.mal_id)) {
      uniqueItemsMap.set(item.mal_id, item);
    }
  });

  const uniqueItems = Array.from(uniqueItemsMap.values());

  const pagination = data?.pagination || {};
  return {
    media: cleanMediaList(uniqueItems.map(mapJikanBrowseItem)),
    pageInfo: {
      total: pagination?.items?.total || uniqueItems.length,
      currentPage: pagination?.current_page || 1,
      lastPage: pagination?.last_visible_page || 1,
      hasNextPage: pagination?.has_next_page || false,
    }
  };
}

export async function getBrowseAnimeMAL(variables) {
  const params = buildJikanParams(variables);
  const proxyPath = `/api/jikan/proxy?path=/v4/anime&${params.toString()}`;

  try {
    const { data } = await smartRequest("get", proxyPath);
    const result = parseJikanResponse(data);
    if (result) return result;
    throw new Error("Proxy returned empty data");
  } catch (err) {
    console.error("Jikan Proxy Error:", err.message);
    return { media: [], pageInfo: { total: 0, hasNextPage: false } };
  }
}

// Direct Jikan API fallback (bypasses the proxy entirely)
async function getBrowseAnimeJikanDirect(variables) {
  const params = buildJikanParams(variables);
  const url = `${JIKAN_BASE_URL}/anime?${params.toString()}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const result = parseJikanResponse(data);
    if (result) return result;
    throw new Error("Direct Jikan returned empty data");
  } catch (err) {
    console.error("Direct Jikan API Error:", err.message);
    return { media: [], pageInfo: { total: 0, hasNextPage: false } };
  }
}


export async function getEpisodeTitles(malId) {
  if (!malId) return [];
  try {
    let allEpisodes = [];
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage && page <= 3) {
      try {
        const { data: json } = await smartRequest("get", "/api/jikan/proxy", {
          params: { path: `/v4/anime/${malId}/episodes`, page },
        });
        if (json.data && json.data.length > 0) {
          allEpisodes = [...allEpisodes, ...json.data];
          hasNextPage = json.pagination?.has_next_page;
          page++;
        } else {
          hasNextPage = false;
        }
      } catch (err) {
        if (err.response?.status === 429) {
          await new Promise(r => setTimeout(r, 1200));
          try {
            const { data: retryJson } = await smartRequest("get", "/api/jikan/proxy", {
              params: { path: `/v4/anime/${malId}/episodes`, page },
            });
            if (retryJson.data?.length > 0) {
              allEpisodes = [...allEpisodes, ...retryJson.data];
              hasNextPage = retryJson.pagination?.has_next_page;
              page++;
            } else {
              hasNextPage = false;
            }
          } catch {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }
    }
    const now = new Date();
    const filteredEpisodes = allEpisodes.filter(ep => {
      if (!ep.aired) return true; // Keep if no date available (usually means it aired)
      return new Date(ep.aired) <= now;
    });
    return filteredEpisodes;
  } catch (err) {
    console.error("MAL Episodes Fetch Error:", err);
    return [];
  }
}

export async function getJikanAnimeDetails(malId) {
  if (!malId) return null;
  try {
    const { data } = await smartRequest("get", "/api/jikan/proxy", {
      params: { path: `/v4/anime/${malId}` }
    });
    return data?.data || null;
  } catch (err) {
    console.error("Jikan Anime Details Fetch Error:", err);
    return null;
  }
}

export async function getSecondaryEpisodeMeta(title, altTitle = "", kitsuId = "") {
  if (!title && !altTitle && !kitsuId) return {};
  try {
    const { data } = await smartRequest("get", "/api/meta/episodes", {
      params: { title, alt_title: altTitle, kitsu_id: kitsuId },
    });
    return data;
  } catch (err) {
    console.error("Secondary metadata fetch failed:", err);
    return {};
  }
}

export async function getStreamingEpisodes(id) {
  try {
    const { data } = await smartRequest("get", `/api/episodes/${id}`);
    return data;
  } catch (err) {
    console.error("Error fetching streaming episodes:", err);
    return [];
  }
}

// ------------------------------------------------------------------
// NEW: Filler & Recap Episode Tracking (via Jikan V4 API)
// ------------------------------------------------------------------
export async function getFillerEpisodes(malId, title) {
  if (!title && !malId) return {};

  try {
    // Attempt AnimeFillerList first if title is available
    if (title) {
      try {
        const { data: aflData } = await smartRequest("get", "/api/afl/fillers", {
          params: { title: title }
        });
        
        if (aflData && Object.keys(aflData).length > 0) {
          return aflData;
        }
      } catch (err) {
        console.warn("AFL Fetch failed, falling back to Jikan:", err.message);
      }
    }
    
    // Fallback to Jikan using MAL ID if AFL failed or title wasn't provided
    if (!malId) return {};
    
    const fillerMap = {};
    let responseData = null;
    try {
      const res = await smartRequest("get", "/api/jikan/proxy", {
        params: { path: `/v4/anime/${malId}/episodes?page=1` }
      });
      responseData = res.data;
    } catch (err) {
      console.warn("Jikan proxy failed, using direct public Jikan API:", err.message);
      const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/episodes?page=1`);
      responseData = res.data;
    }
    
    const data = responseData?.data;
    const pagination = responseData?.pagination;
    
    if (data && Array.isArray(data)) {
      data.forEach(ep => {
        fillerMap[ep.mal_id] = {
          isFiller: ep.filler || false,
          isRecap: ep.recap || false
        };
      });
    }

    const lastPage = pagination?.last_visible_page || 1;
    
    if (lastPage > 1) {
      const maxPages = Math.min(lastPage, 15);
      
      // Fetch sequentially to avoid Jikan 429 rate limits
      for (let p = 2; p <= maxPages; p++) {
        try {
          let pageData = null;
          try {
            const res = await smartRequest("get", "/api/jikan/proxy", {
              params: { path: `/v4/anime/${malId}/episodes?page=${p}` }
            });
            pageData = res.data?.data;
          } catch (err) {
            const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/episodes?page=${p}`);
            pageData = res.data?.data;
          }
          if (pageData) {
            pageData.forEach(ep => {
              if (ep.filler || ep.recap) {
                fillerMap[ep.mal_id] = { isFiller: ep.filler, isRecap: ep.recap };
              }
            });
          }
          // Small delay to respect rate limit
          await new Promise(r => setTimeout(r, 400));
        } catch (err) {
          console.error(`Jikan fallback failed on page ${p}:`, err.message);
        }
      }
    }

    return fillerMap;
  } catch (err) {
    console.error("Error fetching filler episodes:", err.message);
    return {};
  }
}

export async function getMalSyncMapping(malId) {
  if (!malId) return null;
  try {
    const { data } = await smartRequest("get", `/api/malsync/${malId}`);
    return data;
  } catch (err) {
    console.warn("MalSync proxy failed, using direct public API:", err.message);
    try {
      const { data } = await axios.get(`https://api.malsync.moe/mal/anime/${malId}`);
      return data;
    } catch (fallbackErr) {
      console.error("MalSync fallback failed:", fallbackErr.message);
      return null;
    }
  }
}

const CHARACTER_QUERY = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name { full native userPreferred }
      image { large }
      description(asHtml: true)
      gender
      age
      dateOfBirth { year month day }
      bloodType
      favourites
      media(sort: START_DATE_DESC, type: ANIME, perPage: 25) {
        edges {
          characterRole
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name { full native userPreferred }
            image { large }
          }
          node {
            id
            title { romaji english }
            coverImage { large }
            format
            averageScore
          }
        }
      }
    }
  }
`;

export async function getCharacterDetails(id) {
  if (!id) return null;
  const variables = { id: parseInt(id) };
  const payload = { query: CHARACTER_QUERY, variables };
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  let data = null;

  // 1. Try proxy
  try {
    const response = await smartRequest("post", "/api/anilist/proxy", {
      data: payload,
      headers,
      timeout: 10000,
    });
    data = response.data;
  } catch (err) {
    console.warn("[CharacterDetails] Proxy failed, trying direct AniList...", err.message);
  }

  // 2. Fallback to direct AniList
  if (!data) {
    try {
      const response = await axios.post("https://graphql.anilist.co", payload, {
        headers,
        timeout: 10000,
      });
      data = response.data;
      console.info("[CharacterDetails] ✓ Direct AniList succeeded");
    } catch (err) {
      console.warn("[CharacterDetails] Direct AniList failed:", err.message);
    }
  }

  if (data) {
    if (data.errors) {
      console.error("CharacterDetails Errors:", data.errors);
      return null;
    }
    return data.data?.Character || null;
  }
  return null;
}

const STAFF_QUERY = `
  query ($id: Int) {
    Staff(id: $id) {
      id
      name { full native userPreferred }
      image { large }
      description(asHtml: true)
      languageV2
      primaryOccupations
      gender
      dateOfBirth { year month day }
      dateOfDeath { year month day }
      age
      homeTown
      favourites
      characterMedia(sort: START_DATE_DESC, perPage: 50) {
        edges {
          characterRole
          node {
            id
            title { romaji english }
            coverImage { large }
            format
            type
            averageScore
          }
          characters {
            id
            name { full userPreferred }
            image { large }
          }
        }
      }
    }
  }
`;

export async function getStaffDetails(id) {
  if (!id) return null;
  const variables = { id: parseInt(id) };
  const payload = { query: STAFF_QUERY, variables };
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  let data = null;

  // 1. Try proxy
  try {
    const response = await smartRequest("post", "/api/anilist/proxy", {
      data: payload,
      headers,
      timeout: 10000,
    });
    data = response.data;
  } catch (err) {
    console.warn("[StaffDetails] Proxy failed, trying direct AniList...", err.message);
  }

  // 2. Fallback to direct AniList
  if (!data) {
    try {
      const response = await axios.post("https://graphql.anilist.co", payload, {
        headers,
        timeout: 10000,
      });
      data = response.data;
      console.info("[StaffDetails] ✓ Direct AniList succeeded");
    } catch (err) {
      console.warn("[StaffDetails] Direct AniList failed:", err.message);
    }
  }

  if (data) {
    if (data.errors) {
      console.error("StaffDetails Errors:", data.errors);
      return null;
    }
    return data.data?.Staff || null;
  }
  return null;
}
