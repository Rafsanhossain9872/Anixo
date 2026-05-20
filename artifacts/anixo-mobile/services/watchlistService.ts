import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND = "https://anixo-254s.onrender.com";

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  return res.json();
}

export async function getWatchlist() {
  try {
    return authFetch("/watchlist");
  } catch {
    return { success: false, watchlist: [] };
  }
}

export async function addToWatchlist(
  animeId: number,
  title: string,
  coverImage: string,
  status = "Planning"
) {
  try {
    return authFetch("/watchlist/add", {
      method: "POST",
      body: JSON.stringify({ animeId, title, coverImage, status }),
    });
  } catch {
    return { success: false };
  }
}

export async function removeFromWatchlist(animeId: number) {
  try {
    return authFetch(`/watchlist/remove/${animeId}`, { method: "DELETE" });
  } catch {
    return { success: false };
  }
}

export async function updateWatchlistEntry(
  animeId: number,
  updates: { status?: string; progress?: number; score?: number }
) {
  try {
    return authFetch(`/watchlist/update/${animeId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  } catch {
    return { success: false };
  }
}
