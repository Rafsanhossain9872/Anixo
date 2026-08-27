import { authApi, backendApi } from "./api";

export const login = async (email, password) => {
  const { data } = await authApi.post("/auth/login", { email, password });
  return data;
};

export const loginWithGoogle = async (token) => {
  const { data } = await authApi.post("/auth/google", { token });
  return data;
};

export const register = async (username, email, password) => {
  const { data } = await authApi.post("/auth/register", { username, email, password });
  return data;
};

export const getMe = async () => {
  const { data } = await authApi.get("/auth/me");
  return data;
};

export const updateMe = async (profileData) => {
  const { data } = await authApi.put("/auth/me", profileData);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await authApi.post("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await authApi.post(`/auth/reset-password/${token}`, { password });
  return data;
};

export const getAnilistAuthUrl = () => {
  const token = localStorage.getItem('token');
  const baseUrl = backendApi.defaults.baseURL || "";
  
  return `${baseUrl}/auth/anilist?token=${token}`;
};

export const disconnectAnilist = async () => {
  const { data } = await authApi.post("/auth/anilist/disconnect");
  return data;
};

export const syncAnilist = async () => {
  const { data } = await authApi.post("/auth/anilist/sync");
  return data;
};
