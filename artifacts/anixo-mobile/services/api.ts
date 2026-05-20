const PYTHON_API = "https://ritesh0997-index.hf.space";
const JIKAN_BASE = "https://api.jikan.moe/v4";

const ANIME_QUERY = `
  query ($page: Int, $sort: [MediaSort], $status_in: [MediaStatus]) {
    Page(page: $page, perPage: 20) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(type: ANIME, sort: $sort, status_in: $status_in) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        format
        episodes
        averageScore
        status
        isAdult
      }
    }
  }
`;

const BROWSE_QUERY = `
  query ($page: Int, $search: String, $sort: [MediaSort], $genre_in: [String], $status: MediaStatus, $format_in: [MediaFormat]) {
    Page(page: $page, perPage: 24) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(type: ANIME, search: $search, sort: $sort, genre_in: $genre_in, status: $status, format_in: $format_in) {
        id
        title { romaji english native }
        coverImage { extraLarge large medium }
        format
        episodes
        averageScore
        status
        isAdult
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { extraLarge large medium }
      bannerImage
      description(asHtml: false)
      format
      status
      episodes
      duration
      genres
      averageScore
      popularity
      season
      seasonYear
      studios(isMain: true) { nodes { name } }
      characters(sort: [ROLE, RELEVANCE], perPage: 12) {
        edges {
          role
          node { id name { full } image { large medium } }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english }
            coverImage { large medium }
            format
            status
            type
          }
        }
      }
      nextAiringEpisode { airingAt episode }
      isAdult
    }
  }
`;

async function fetchFromAniList(query: string, variables: Record<string, unknown> = {}) {
  try {
    const cleanVars = Object.fromEntries(
      Object.entries(variables).filter(([, v]) =>
        v !== null && v !== undefined && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
      )
    );

    const res = await fetch(`${PYTHON_API}/api/anilist/proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: cleanVars }),
    });

    const data = await res.json();
    if (!data) return { media: [], pageInfo: {} };

    const result = data.data?.Page || data.Page || data.data || data;
    return result || { media: [], pageInfo: {} };
  } catch (err) {
    console.error("AniList fetch error:", err);
    return { media: [], pageInfo: {} };
  }
}

export async function getTrendingAnime(page = 1) {
  return fetchFromAniList(ANIME_QUERY, {
    page,
    sort: ["TRENDING_DESC"],
    status_in: ["RELEASING", "FINISHED"],
  });
}

export async function getPopularAnime(page = 1) {
  return fetchFromAniList(ANIME_QUERY, {
    page,
    sort: ["POPULARITY_DESC"],
    status_in: ["RELEASING", "FINISHED"],
  });
}

export async function getNewReleases(page = 1) {
  return fetchFromAniList(ANIME_QUERY, {
    page,
    sort: ["START_DATE_DESC", "TRENDING_DESC"],
    status_in: ["RELEASING"],
  });
}

export async function searchAnime(
  search: string,
  filters: {
    genre?: string;
    status?: string;
    format?: string;
    sort?: string;
    page?: number;
  } = {}
) {
  return fetchFromAniList(BROWSE_QUERY, {
    page: filters.page || 1,
    search: search || undefined,
    sort: [filters.sort || "POPULARITY_DESC"],
    genre_in: filters.genre ? [filters.genre] : undefined,
    status: filters.status || undefined,
    format_in: filters.format ? [filters.format] : undefined,
  });
}

export async function getAnimeDetails(id: number) {
  try {
    const res = await fetch(`${PYTHON_API}/api/anilist/proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: DETAIL_QUERY, variables: { id } }),
    });
    const data = await res.json();
    return data.data?.Media || data.Media || null;
  } catch (err) {
    console.error("getAnimeDetails error:", err);
    return null;
  }
}

export async function getJikanEpisodes(malId: number, page = 1) {
  try {
    const res = await fetch(`${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`);
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export const GENRES = [
  "Action","Adventure","Comedy","Drama","Fantasy","Horror",
  "Mystery","Psychological","Romance","Sci-Fi","Slice of Life",
  "Sports","Supernatural","Thriller",
];
