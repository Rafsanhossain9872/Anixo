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
          setBackendWatchlist(res.watchlist || []);
        }
      });
    }
  }, [user]);

  const isBookmarked = backendWatchlist.some(item => String(item.animeId) === String(id));

  const handleToggleBackendWatchlist = async () => {
    if (!user) return triggerAuthToast("Sign in to manage your watchlist");
    
    // Optimistic UI update
    const previousWatchlist = [...backendWatchlist];
    if (isBookmarked) {
      setBackendWatchlist(prev => prev.filter(item => String(item.animeId) !== String(id)));
    } else {
      setBackendWatchlist(prev => [...prev, { animeId: String(id), status: 'Watching' }]);
    }
    
    // setIsWatchlistLoading(true);
    try {
      if (isBookmarked) {
        const res = await removeFromWatchlist(id);
        if (res.success) {
          setBackendWatchlist(res.watchlist || []);
        } else {
          setBackendWatchlist(previousWatchlist); // revert on failure
          console.error("Failed to remove from watchlist: " + res.message);
        }
      } else {
        const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
        const res = await addToWatchlist(String(id), getTitle(anime?.title), coverImg, 'Watching');
        if (res.success) {
          setBackendWatchlist(res.watchlist || []);
        } else {
          setBackendWatchlist(previousWatchlist); // revert on failure
          console.error("Failed to add to watchlist: " + res.message);
        }
      }
    } catch (err) {
      console.error("Watchlist error:", err);
      setBackendWatchlist(previousWatchlist); // revert on error
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  const handleUpdateWatchlistStatus = async (status) => {
    if (!user) return triggerAuthToast("Sign in to manage your watchlist");

    setIsWatchlistLoading(true);
    setShowWatchlistDropdown(false);
    try {
      if (status === "Remove") {
        const res = await removeFromWatchlist(id);
        if (res.success) setBackendWatchlist(res.watchlist || []);
      } else {
        const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
        const res = await addToWatchlist(String(id), getTitle(anime?.title), coverImg, status);
        if (res.success) setBackendWatchlist(res.watchlist || []);
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
