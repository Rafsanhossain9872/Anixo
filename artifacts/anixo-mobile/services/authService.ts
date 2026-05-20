import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND = "https://anixo-254s.onrender.com";

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  const data = await res.json();
  return data;
}

export async function login(email: string, password: string) {
  return authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(username: string, email: string, password: string) {
  return authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function getMe() {
  return authFetch("/auth/me");
}

export async function forgotPassword(email: string) {
  return authFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function saveToken(token: string) {
  return AsyncStorage.setItem("token", token);
}

export async function clearToken() {
  return AsyncStorage.removeItem("token");
}
