import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMe } from "../services/authService";
import { getWatchlist } from "../services/watchlistService";
import { getProgress } from "../services/progressService";
import { getSettings } from "../services/settingsService";
import { getNotifications } from "../services/notificationService";

export const AuthProvider = ({ children }) => {
  // FIX 3: Instantly restore cached user from localStorage (no flicker on reload)
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [globalWatchlist, setGlobalWatchlist] = useState([]);
  const [globalProgress, setGlobalProgress] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_settings");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authToast, setAuthToast] = useState(null);

  // Apply custom theme color if present
  useEffect(() => {
    if (globalSettings?.themeColor) {
      document.documentElement.style.setProperty('--discord-600', globalSettings.themeColor);
      document.documentElement.style.setProperty('--discord-500', globalSettings.themeColor);
      document.documentElement.style.setProperty('--discord-700', globalSettings.themeColor);
      document.documentElement.style.setProperty('--discord-400', globalSettings.themeColor);
      document.documentElement.style.setProperty('--discord-800', globalSettings.themeColor);
      document.documentElement.style.setProperty('--discord-900', globalSettings.themeColor);
      localStorage.setItem("tenzora_theme_color", globalSettings.themeColor);
    } else {
      document.documentElement.style.removeProperty('--discord-600');
      document.documentElement.style.removeProperty('--discord-500');
      document.documentElement.style.removeProperty('--discord-700');
      document.documentElement.style.removeProperty('--discord-400');
      document.documentElement.style.removeProperty('--discord-800');
      document.documentElement.style.removeProperty('--discord-900');
      localStorage.removeItem("tenzora_theme_color");
    }
  }, [globalSettings?.themeColor]);

  const triggerAuthToast = (msg) => {
    setAuthToast(msg);
    setTimeout(() => setAuthToast(null), 4000);
  };

  const fetchNotifications = async () => {
    try {
      const notifRes = await getNotifications();
      if (notifRes?.success) setGlobalNotifications(notifRes.notifications);
    } catch (e) { console.warn("Notifications fetch failed:", e.message); }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Step 1: Verify token with backend
      try {
        const res = await getMe();
        if (res.success) {
          setUser(res.user);
          // Cache user data for instant restore on next visit
          localStorage.setItem("cached_user", JSON.stringify(res.user));
        } else {
          // Backend explicitly said token is bad → clear everything
          localStorage.removeItem("token");
          localStorage.removeItem("cached_user");
          setUser(null);
          setLoading(false);
          return; // Don't fetch secondary data with a bad token
        }
      } catch (error) {
        // FIX 1: Only delete token if backend EXPLICITLY returns 401 (token invalid)
        // Network errors, timeouts, cold starts should NOT log the user out
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          console.warn("Token invalid (401/403), logging out.");
          localStorage.removeItem("token");
          localStorage.removeItem("cached_user");
          setUser(null);
          setLoading(false);
          return; // Don't fetch secondary data with an invalid token
        } else {
          // Network error / timeout / cold start — keep user logged in with cached data
          console.warn("Auth check failed (network/timeout), keeping cached session.", error.message);
        }
      }

      // FIX 2: Secondary data fetches in separate try-catch blocks
      // Only runs if user is still authenticated (token was valid or network error kept cache)
      try {
        const wlRes = await getWatchlist();
        if (wlRes?.success) setGlobalWatchlist(wlRes.watchlist);
      } catch (e) { console.warn("Watchlist fetch failed on init:", e.message); }

      try {
        const progRes = await getProgress();
        if (progRes?.success) setGlobalProgress(progRes.continueWatching);
      } catch (e) { console.warn("Progress fetch failed on init:", e.message); }

      try {
        const settRes = await getSettings();
        if (settRes?.success) {
          setGlobalSettings(settRes.settings);
          localStorage.setItem("cached_settings", JSON.stringify(settRes.settings));
        }
      } catch (e) { console.warn("Settings fetch failed on init:", e.message); }

      await fetchNotifications();

      setLoading(false);
    };

    initAuth();
  }, []);

  // Listen for user changes to update progress source
  useEffect(() => {
    if (user) {
      // User logged in: load from backend
      getProgress().then(progRes => {
        if (progRes?.success) setGlobalProgress(progRes.continueWatching);
      }).catch(e => console.warn("Progress fetch on user change failed:", e));
    } else {
      // User logged out: reset progress to empty array
      Promise.resolve().then(() => {
        setGlobalProgress([]);
      });
    }
  }, [user]);

  // Set up smart polling for notifications every 60 seconds (only when tab is visible)
  useEffect(() => {
    if (!user) return;
    const fetchIfVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    const interval = setInterval(fetchIfVisible, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const loginAuth = async (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("cached_user", JSON.stringify(userData));
    setUser(userData);
    triggerAuthToast("Welcome back!");
    
    // Fetch data immediately after manual login (each in its own try-catch)
    try {
      const wlRes = await getWatchlist();
      if (wlRes?.success) setGlobalWatchlist(wlRes.watchlist);
    } catch (e) { console.warn("Watchlist fetch failed on login:", e.message); }

    try {
      const progRes = await getProgress();
      if (progRes?.success) setGlobalProgress(progRes.continueWatching);
    } catch (e) { console.warn("Progress fetch failed on login:", e.message); }

    try {
      const settRes = await getSettings();
      if (settRes?.success) setGlobalSettings(settRes.settings);
    } catch (e) { console.warn("Settings fetch failed on login:", e.message); }

    await fetchNotifications();
  };

  const logoutAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cached_user");
    localStorage.removeItem("tenzora_theme_color");
    setUser(null);
    setGlobalWatchlist([]);
    setGlobalProgress([]);
    setGlobalSettings(null);
    setGlobalNotifications([]);
  };

  const updateUser = (userData) => {
    localStorage.setItem("cached_user", JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loginAuth, logoutAuth, updateUser, loading, globalWatchlist, setGlobalWatchlist, globalProgress, setGlobalProgress, globalSettings, setGlobalSettings, globalNotifications, setGlobalNotifications, fetchNotifications, authToast, triggerAuthToast }}>
      {children}
    </AuthContext.Provider>
  );
};
