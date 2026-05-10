import axios from "axios";

export const PYTHON_API = import.meta.env.VITE_PYTHON_API || "https://ritesh0997-index.hf.space";

export const PYTHON_API_BACKUP = import.meta.env.VITE_PYTHON_API_BACKUP || "";

export const ALLANIME_API = import.meta.env.VITE_ALLANIME_API || "https://allanime-api.allanime3rdtime.workers.dev";

export const MIRURO_API = import.meta.env.VITE_MIRURO_API || "https://miruro-hono-worker.miruro-api.workers.dev";
// --- MIRURO (Server 6) --- Fetches stream iframe from Miruro Cloudflare Worker
export async function getMiruroStream(anilistId, episodeNumber = 1) {
  if (!anilistId) return null;
  try {
    const { data } = await axios.get(`${MIRURO_API}/watch`, {
      params: { id: anilistId, ep: episodeNumber },
      timeout: 15000,
    });
    return data;
  } catch (err) {
    console.error("[Miruro] Stream fetch failed:", err.message);
    return null;
  }
}

export const ANILIST_URL = `${PYTHON_API}/api/anilist/proxy`;
export const ANIXO_SERVER = PYTHON_API;
export const JIKAN_BASE_URL = import.meta.env.VITE_JIKAN_API || "https://api.jikan.moe/v4";


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
      const cacheKey = `anixo_cache_${key}`;
      
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
      const cacheKey = `anixo_cache_${key}`;
      const expiry = new Date().getTime() + ttl;
      const cacheData = { value, expiry };

      // Update both layers
      MemoryCache.set(cacheKey, cacheData);
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
        if (key.startsWith('anixo_cache_')) {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expiry < now) localStorage.removeItem(key);
        }
      });
    } catch {
      // Silently fail if pruning fails due to invalid JSON in storage
    }
  }
};


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

async function fetchFromJikan(endpoint, params = {}) {
  try {
    const query = new URLSearchParams({ ...params }).toString();
    const { data } = await axios.get(`${JIKAN_BASE_URL}${endpoint}${query ? `?${query}` : ""}`);

    return {
      media: data.data?.map(mapJikanToAnilist) || [],
      pageInfo: {
        hasNextPage: data.pagination?.has_next_page || false,
        lastPage: data.pagination?.last_visible_page || 1,
        total: data.pagination?.items?.total || 0
      }
    };
  } catch (err) {
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
  baseURL: (typeof window !== "undefined" && window.location.hostname === "localhost")
    ? (import.meta.env.VITE_BACKEND_API || "http://localhost:5001")
    : (import.meta.env.VITE_BACKEND_API || ""), 
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

async function fetchFromAniList(query, variables = {}) {
  try {
    // Clean up variables to remove null/undefined/empty-string values
    const cleanVariables = Object.fromEntries(
      Object.entries(variables).filter(([, v]) =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        (Array.isArray(v) ? v.length > 0 : true)
      )
    );

    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: {
        query,
        variables: cleanVariables
      },
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    if (!data) throw new Error("No data received from proxy");

    if (data.errors) {
      console.error("AniList GraphQL Errors:", data.errors);
      return { media: [], pageInfo: { total: 0 } };
    }

    // Support both direct data and data.data (depending on proxy implementation)
    const result = data.data?.Page || data.Page || data.data || data;
    if (!result || (!result.media && !result.Page)) {
      // If it's a direct Media query (not Page)
      return result;
    }
    return result || { media: [], pageInfo: { total: 0 } };
  } catch (err) {
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

  try {
    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: {
        query: SCHEDULE_QUERY,
        variables: {
          page: 1,
          airingAt_greater: startTimestamp,
          airingAt_lesser: endTimestamp,
        },
      },
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList Schedule Errors:", data.errors);
      return [];
    }
    const scheduleData = data.data?.Page?.airingSchedules || [];
    if (scheduleData.length > 0) cache.set(cacheKey, scheduleData, CACHE_TTL.SCHEDULE);
    return scheduleData;
  } catch (err) {
    console.error("Schedule Fetch Error:", err);
    return [];
  }
}

export const SEARCH_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 50) {
      media(type: ANIME, search: $search) {
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

export async function searchAnime(query, filters = {}) {
  if (!query && Object.keys(filters).length === 0) return [];
  try {
    // Priority: Search using AniList for standard IDs and metadata
    const variables = {
      search: query || undefined,
      perPage: 15,
      ...filters
    };

    const anilistRes = await fetchFromAniList(BROWSE_QUERY, variables);

    if (anilistRes?.media?.length > 0) {
      return anilistRes.media;
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
  query ($page: Int, $perPage: Int, $search: String, $format_in: [MediaFormat], $sort: [MediaSort], $seasonYear: Int, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $country: CountryCode, $averageScore_greater: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, search: $search, format_in: $format_in, sort: $sort, seasonYear: $seasonYear, status: $status, genre_in: $genre_in, tag_in: $tag_in, season: $season, countryOfOrigin: $country, averageScore_greater: $averageScore_greater) {
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

export async function getBrowseAnime(variables) {
  // Create a unique cache key based on variables
  const varKey = JSON.stringify(variables);
  const cachedData = cache.get(`browse_${varKey}`);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(BROWSE_QUERY, variables);
  if (anilistRes?.media?.length > 0) {
    cache.set(`browse_${varKey}`, anilistRes, CACHE_TTL.BROWSE);
    return anilistRes;
  }

  console.warn("[Failover] AniList Browse failed, switching to Jikan...");
  const jikanRes = await getBrowseAnimeMAL(variables);
  return jikanRes;
}

export const ANIME_QUERY = `
  query ($page: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: 50) {
      pageInfo { total hasNextPage }
      media(type: ANIME, sort: $sort) {
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

export async function getTrendingAnime(page = 1) {
  const cacheKey = `trending_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, { page, sort: ["TRENDING_DESC"] });
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.TRENDING);
    return anilistRes;
  }

  console.warn("[Failover] AniList Trending failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/top/anime", { page, filter: "airing", limit: 20 });
  return jikanRes;
}

export async function getPopularAnime(page = 1) {
  const cacheKey = `popular_p${page}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  const anilistRes = await fetchFromAniList(ANIME_QUERY, { page, sort: ["POPULARITY_DESC"] });
  if (anilistRes?.media?.length > 0) {
    cache.set(cacheKey, anilistRes, CACHE_TTL.POPULAR);
    return anilistRes;
  }

  console.warn("[Failover] AniList Popular failed, switching to Jikan...");
  const jikanRes = await fetchFromJikan("/top/anime", { page, filter: "bypopularity", limit: 20 });
  return jikanRes;
}

export async function getNewReleases(page = 1) {
  const anilistRes = await fetchFromAniList(ANIME_QUERY, { page, sort: ["START_DATE_DESC", "TRENDING_DESC"] });
  if (anilistRes?.media?.length > 0) return anilistRes;

  console.warn("[Failover] AniList New Releases failed, switching to Jikan...");
  return fetchFromJikan("/seasons/upcoming", { page, limit: 20 });
}

const SEASONAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $page: Int) {
    Page(page: $page, perPage: 30) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: $sort) {
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

  let season = "WINTER";
  if (month >= 2 && month <= 4) season = "SPRING";
  else if (month >= 5 && month <= 7) season = "SUMMER";
  else if (month >= 8 && month <= 10) season = "FALL";

  return fetchFromAniList(SEASONAL_QUERY, {
    season,
    seasonYear: year,
    sort: ["POPULARITY_DESC"],
    page
  });
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

  if (!variables.id && !finalIsMal && !finalId) {
    console.error("[Watch] Aborting AniList query: No ID provided.");
    return null;
  }

  try {
    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: {
        query: DETAIL_QUERY,
        variables,
      },
      headers: { "Content-Type": "application/json" },
    });

    if (!data) {
      console.error("AniList Detail: No response from proxy");
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
        if (jikanData) return transformJikanToAnilist(jikanData);
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
        if (jikanData) return transformJikanToAnilist(jikanData);
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

export async function getBrowseAnimeMAL(variables) {
  const { page = 1, genres = [], search = "", status = "", sort = "popularity" } = variables;

  // Map genre names to MAL IDs
  const MAL_GENRE_MAP = {
    "Action": 1, "Adventure": 2, "Avant Garde": 5, "Boys Love": 28, "Comedy": 4, "Demons": 6, "Drama": 8, "Ecchi": 9, "Fantasy": 10, "Girls Love": 26, "Gourmet": 47, "Harem": 35, "Horror": 14, "Isekai": 62, "Iyashikei": 63, "Josei": 43, "Kids": 15, "Magic": 16, "Mahou Shoujo": 66, "Martial Arts": 17, "Mecha": 18, "Military": 38, "Music": 19, "Mystery": 7, "Parody": 20, "Psychological": 40, "Reverse Harem": 73, "Romance": 22, "School": 23, "Sci-Fi": 24, "Seinen": 42, "Shoujo": 25, "Shounen": 27, "Slice of Life": 36, "Space": 29, "Sports": 30, "Super Power": 31, "Supernatural": 37, "Suspense": 41, "Thriller": 45, "Vampire": 32
  };

  const malGenreIds = genres.map(g => MAL_GENRE_MAP[g]).filter(Boolean);
  const limit = 54;
  let url = `${PYTHON_API}/api/jikan/proxy?path=/v4/anime&page=${page}&limit=${limit}`;
  if (search) url += `&q=${encodeURIComponent(search)}`;
  if (malGenreIds.length > 0) url += `&genres=${malGenreIds.join(',')}`;

  if (status === "RELEASING") url += "&status=airing";
  if (status === "FINISHED") url += "&status=complete";

  if (sort.includes("POPULARITY")) url += "&order_by=popularity&sort=desc";
  else if (sort.includes("SCORE")) url += "&order_by=score&sort=desc";
  else url += "&order_by=popularity&sort=desc";

  try {
    const { data } = await smartRequest("get", url.replace(PYTHON_API, ""));
    return {
      media: data.data.map(item => ({
        id: item.mal_id,
        idMal: item.mal_id,
        isMAL: true,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese
        },
        coverImage: {
          large: item.images.webp.large_image_url || item.images.jpg.large_image_url,
          medium: item.images.webp.image_url || item.images.jpg.image_url
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
      })),
      pageInfo: {
        total: data.pagination.items.total,
        currentPage: data.pagination.current_page,
        lastPage: data.pagination.last_visible_page,
        hasNextPage: data.pagination.has_next_page,
      }
    };
  } catch (err) {
    console.error("Jikan API Error:", err);
    throw err;
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

export async function getMalSyncMapping(malId) {
  if (!malId) return null;
  try {
    const { data } = await smartRequest("get", `/api/malsync/${malId}`);
    return data;
  } catch (err) {
    console.error("MalSync mapping failed:", err);
    return null;
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
  try {
    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: {
        query: CHARACTER_QUERY,
        variables: { id: parseInt(id) },
      },
      headers: { "Content-Type": "application/json" },
    });
    return data.data?.Character || null;
  } catch (err) {
    console.error("getCharacterDetails Error:", err);
    return null;
  }
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
  try {
    const { data } = await smartRequest("post", "/api/anilist/proxy", {
      data: {
        query: STAFF_QUERY,
        variables: { id: parseInt(id) },
      },
      headers: { "Content-Type": "application/json" },
    });
    return data.data?.Staff || null;
  } catch (err) {
    console.error("getStaffDetails Error:", err);
    return null;
  }
}
