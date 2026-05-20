import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { addToWatchlist, removeFromWatchlist, getWatchlist } from "../services/watchlistService";

/**
 * Custom hook for managing backend watchlist state and operations.
 * Extracted from Watch.jsx for cleaner separation of concerns.
 */
export function useWatchlist(id, anime, getTitle) {
  const { user, triggerAuthToast } = useAuth();
  const [backendWatchlist, setBackendWatchlist] = useState([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);

  // Fetch watchlist on mount / user change
  useEffect(() => {
    if (user) {
      getWatchlist().then(res => {
        if (res.success) {
          setBackendWatchlist(res.watchlist);
        }
      });
    }
  }, [user]);

  const isBookmarked = backendWatchlist.some(item => item.animeId === String(id));

  const handleToggleBackendWatchlist = () => {
    if (!user) return triggerAuthToast("Sign in to manage your watchlist");
    setShowWatchlistDropdown(!showWatchlistDropdown);
  };

  const handleUpdateWatchlistStatus = async (status) => {
    if (!user) return triggerAuthToast("Sign in to manage your watchlist");

    setIsWatchlistLoading(true);
    setShowWatchlistDropdown(false);
    try {
      if (status === "Remove") {
        const res = await removeFromWatchlist(id);
        if (res.success) setBackendWatchlist(res.watchlist);
      } else {
        const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
        const res = await addToWatchlist(String(id), getTitle(anime?.title), coverImg, status);
        if (res.success) setBackendWatchlist(res.watchlist);
      }
    } catch (err) {
      console.error("Watchlist error:", err);
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  return {
    backendWatchlist,
    isBookmarked,
    isWatchlistLoading,
    showWatchlistDropdown,
    setShowWatchlistDropdown,
    handleToggleBackendWatchlist,
    handleUpdateWatchlistStatus,
  };
}
