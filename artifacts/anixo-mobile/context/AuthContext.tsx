import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMe, clearToken, saveToken } from "@/services/authService";

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginAuth: (user: User, token: string) => Promise<void>;
  logoutAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("token");
        if (!stored) { setLoading(false); return; }
        setToken(stored);
        const res = await getMe();
        if (res?.user) {
          setUser(res.user);
        } else {
          await clearToken();
          setToken(null);
        }
      } catch {
        await clearToken();
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loginAuth = async (newUser: User, newToken: string) => {
    await saveToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logoutAuth = async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      if (res?.user) setUser(res.user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginAuth, logoutAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
