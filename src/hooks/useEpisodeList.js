import { useState, useMemo, useEffect } from "react";

export const EPISODES_PER_PAGE = 50;

/**
 * useEpisodeList
 * Handles computing the total episodes list, filtering by search query,
 * filtering out filler episodes, and managing pagination state.
 */
export function useEpisodeList({ anime, malEpisodes, activeEpisode, setActiveEpisode, id, fillerData, hideFillerEpisodes }) {
  const [episodePage, setEpisodePage] = useState(0);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [isEpisodeSearchOpen, setIsEpisodeSearchOpen] = useState(false);

  // Reset or set active episode when navigating to a different anime
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetEp = parseInt(params.get("ep")) || 1;

    setTimeout(() => {
      setActiveEpisode(targetEp);
      setEpisodePage(0);
    }, 0);
  }, [id, setActiveEpisode]);

  // Auto-jump to the correct page when active episode changes
  useEffect(() => {
    const targetPage = Math.floor((activeEpisode - 1) / EPISODES_PER_PAGE);
    setTimeout(() => setEpisodePage(targetPage), 0);
  }, [activeEpisode]);

  const episodesList = useMemo(() => {
    if (!anime) return [];

    let count = anime.status === "FINISHED" ? anime.episodes || 0 : 0;

    // 1. Check AniList Airing Info
    if (anime.nextAiringEpisode) {
      count = Math.max(count, anime.nextAiringEpisode.episode - 1);
    }

    // 2. Check Jikan (MAL) Count
    if (malEpisodes && malEpisodes.length > 0) {
      count = Math.max(count, malEpisodes.length);
    }

    // 3. Final fallback for airing shows
    if (
      !count &&
      anime.status === "RELEASING" &&
      anime.streamingEpisodes &&
      anime.streamingEpisodes.length > 0
    ) {
      count = anime.streamingEpisodes.length;
    }

    // Last Resort
    if (!count && anime.status === "FINISHED") count = anime.episodes || 1;
    if (!count) count = 1;

    return Array.from({ length: count }, (_, i) => i + 1);
  }, [anime, malEpisodes]);

  const filteredEpisodes = useMemo(() => {
    let result = episodesList;

    // Filter out filler episodes if the toggle is ON
    if (hideFillerEpisodes && fillerData) {
      result = result.filter(ep => {
        const isFiller = fillerData[ep]?.isFiller;
        // Don't hide the episode if the user is currently watching it
        if (ep === activeEpisode) return true;
        return !isFiller;
      });
    }

    if (!episodeSearchQuery) return result;
    
    // Filter by search query
    const query = episodeSearchQuery.toLowerCase().trim();
    return result.filter((ep) => {
      const epStr = String(ep);
      const jikanData = malEpisodes?.find((e) => e.mal_id === ep);
      const title = (jikanData?.title || "").toLowerCase();
      return epStr.includes(query) || title.includes(query);
    });
  }, [episodesList, episodeSearchQuery, malEpisodes, hideFillerEpisodes, fillerData, activeEpisode]);

  // Clamp episodePage when filteredEpisodes changes (e.g. searching or toggling fillers)
  useEffect(() => {
    const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
    if (episodePage >= totalPages && totalPages > 0) {
      setTimeout(() => setEpisodePage(totalPages - 1), 0);
    } else if (filteredEpisodes.length === 0 && episodePage !== 0) {
      setTimeout(() => setEpisodePage(0), 0);
    }
  }, [filteredEpisodes, episodePage]);

  return {
    episodesList,
    filteredEpisodes,
    episodePage,
    setEpisodePage,
    episodeSearchQuery,
    setEpisodeSearchQuery,
    isEpisodeSearchOpen,
    setIsEpisodeSearchOpen,
    EPISODES_PER_PAGE
  };
}
