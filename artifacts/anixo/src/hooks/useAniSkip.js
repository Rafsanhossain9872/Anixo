import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Custom hook for fetching and managing OP/ED skip times from AniSkip API.
 * Extracted from Watch.jsx for cleaner separation of concerns.
 */
export function useAniSkip(id, anime, activeEpisode, isMal) {
  const getSafeStorage = (key, defaultVal) => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return defaultVal;
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  };

  const [skipTimes, setSkipTimes] = useState(() => getSafeStorage(`skipTimes_${id}`, {}));

  // Persist skip times to localStorage
  useEffect(() => {
    localStorage.setItem(`skipTimes_${id}`, JSON.stringify(skipTimes));
  }, [skipTimes, id]);

  // Auto-fetch skip times from AniSkip API
  useEffect(() => {
    if (!anime || !activeEpisode || skipTimes[activeEpisode]) return;

    const fetchAniSkip = async () => {
      try {
        const targetId = anime.id;
        const isMalId = isMal && !anime.id;

        const ANISKIP_BASE = import.meta.env.VITE_ANISKIP_API || 'https://api.aniskip.com/v2';
        let apiUrl = `${ANISKIP_BASE}/skip-times/${targetId}/${activeEpisode}?types[]=op&types[]=ed`;
        if (isMalId) {
          apiUrl = `${ANISKIP_BASE}/skip-times/mal/${id}/${activeEpisode}?types[]=op&types[]=ed`;
        }

        const response = await axios.get(apiUrl);

        if (response.data && response.data.results) {
          const results = response.data.results;
          const op = results.find(r => r.skipType === 'op')?.interval;
          const ed = results.find(r => r.skipType === 'ed')?.interval;

          if (op || ed) {
            setSkipTimes(prev => ({
              ...prev,
              [activeEpisode]: {
                op: op ? [op.startTime, op.endTime] : null,
                ed: ed ? [ed.startTime, ed.endTime] : null
              }
            }));
            console.log(`[AniSkip] Found skip times for Episode ${activeEpisode}`, { op, ed });
          }
        }
      } catch {
        console.log(`[AniSkip] No skip times available for Ep ${activeEpisode}`);
      }
    };

    fetchAniSkip();
  }, [id, activeEpisode, anime, isMal]);

  return { skipTimes, setSkipTimes };
}
