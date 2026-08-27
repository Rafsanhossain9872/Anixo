import { useRef, useEffect, useCallback } from "react";
import { updateProgress } from "../services/progressService";

/**
 * useWatchProgress
 * Handles all watch progress tracking:
 * - Instant save when episode changes
 * - postMessage time capture from iframe player
 * - beforeunload save (tab close / navigation)
 * - Periodic save every 3 minutes
 */
const resolveImage = (anime) => {
  if (!anime) return null;
  const img = anime.coverImage || anime.image;
  if (!img) return anime.poster || null;
  if (typeof img === "string") return img;
  return img.extraLarge || img.large || img.medium || anime.poster || null;
};

export function useWatchProgress({
  user,
  anime,
  id,
  activeEpisode,
  getTitle,
  globalProgress,
  setGlobalProgress,
}) {
  const lastCapturedTime = useRef(0);
  const lastCapturedDuration = useRef(null);
  const lastIntervalSave = useRef(0);
  const instantSaveRef = useRef({});

  // Helper to save progress to global state
  const saveProgressToState = useCallback((progressData) => {
    // Update global state
    setGlobalProgress((prev) => {
      const filtered = prev.filter((p) => p.animeId !== progressData.animeId);
      return [progressData, ...filtered].slice(0, 100);
    });
  }, [setGlobalProgress]);

  // --- INSTANT SAVE TO CONTINUE WATCHING ---
  useEffect(() => {
    if (!anime || !activeEpisode || !id) return;

    const key = `${id}-${activeEpisode}`;
    if (instantSaveRef.current[key]) return; // Already saved this episode

    // Wait for the actual anime data
    if (!anime.title) return;

    instantSaveRef.current[key] = true;

    // Find if we already have progress for this anime
    const existing = globalProgress.find((p) => p.animeId === String(id));

    // If the episode is the same as the one we are resuming, preserve currentTime
    const isSameEpisode = existing && existing.episode === activeEpisode;
    const currTime = isSameEpisode ? existing.currentTime : 0;
    const duration = isSameEpisode ? existing.duration : null;

    const coverImg = resolveImage(anime);

    // Prevent overwriting higher progress with episode 1 on initial load
    const urlParams = new URLSearchParams(window.location.search);
    const urlEp = parseInt(urlParams.get("ep"));
    if (urlEp && activeEpisode !== urlEp) return;

    const progressData = {
      animeId: String(id),
      episode: activeEpisode,
      currentTime: currTime,
      duration: duration,
      title: getTitle(anime.title),
      coverImage: coverImg,
      anilistId: anime?.id,
      updatedAt: Date.now(),
    };

    if (user) {
      updateProgress(
        String(id),
        activeEpisode,
        currTime,
        duration,
        getTitle(anime.title),
        coverImg,
        anime?.id
      )
        .then((res) => {
          if (res.success && res.progress) {
            setGlobalProgress((prev) => {
              const filtered = prev.filter((p) => p.animeId !== String(id));
              return [res.progress, ...filtered].slice(0, 100);
            });
          }
        })
        .catch((err) => console.error("Failed to init instant progress:", err));
    } else {
      // Save for guest
      saveProgressToState(progressData);
    }
  }, [user, anime, activeEpisode, id, globalProgress, getTitle, setGlobalProgress, saveProgressToState]);

  // ── Capture playback time from iframe postMessage events ──
  useEffect(() => {
    const handleProgressCapture = (e) => {
      const data = e.data;
      if (!data) return;

      const getNum = (...vals) => {
        for (const val of vals) {
          const num = Number(val);
          if (!isNaN(num) && typeof num === "number" && num >= 0) return num;
        }
        return null;
      };

      // Extract time from various known player message formats
      const time = getNum(
        data.currentTime,
        data.time,
        data.seconds,
        data.position,
        data.data?.currentTime,
        data.data?.position,
        data.value?.currentTime,
        data.value?.position
      );

      const duration = getNum(
        data.duration,
        data.totalTime,
        data.data?.duration,
        data.value?.duration
      );

      if (time !== null) lastCapturedTime.current = Math.floor(time);
      if (duration !== null) lastCapturedDuration.current = Math.floor(duration);
    };

    window.addEventListener("message", handleProgressCapture);
    return () => window.removeEventListener("message", handleProgressCapture);
  }, []);

  // ── Save on page leave / tab close ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user || !anime || !id || lastCapturedTime.current <= 5) return;

      const coverImg = resolveImage(anime);
      const title =
        anime?.title?.english ||
        anime?.title?.romaji ||
        anime?.title?.native ||
        "Unknown";

      const progressData = {
        animeId: String(id),
        anilistId: anime?.id,
        episode: activeEpisode,
        currentTime: lastCapturedTime.current,
        duration: lastCapturedDuration.current,
        title,
        coverImage: coverImg,
        updatedAt: Date.now(),
      };

      const token = localStorage.getItem("token");
      if (!token) return;
      const backendBase = import.meta.env.VITE_BACKEND_API || "";
      try {
        fetch(`${backendBase}/progress/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(progressData),
          keepalive: true,
        });
      } catch {
        /* Silently fail */
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user, anime, id, activeEpisode]);

  // ── Periodic save every 3 minutes ──
  useEffect(() => {
    if (!anime || !id) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastIntervalSave.current < 175000) return;
      if (lastCapturedTime.current <= 5) return;

      lastIntervalSave.current = now;

      const coverImg = resolveImage(anime);
      const titleStr = getTitle(anime.title);

      const progressData = {
        animeId: String(id),
        episode: activeEpisode,
        currentTime: lastCapturedTime.current,
        duration: lastCapturedDuration.current,
        title: titleStr,
        coverImage: coverImg,
        anilistId: anime?.id,
        updatedAt: Date.now(),
      };

      if (user) {
        // Logged-in: save to backend
        updateProgress(
          progressData.animeId,
          progressData.episode,
          progressData.currentTime,
          progressData.duration,
          progressData.title,
          progressData.coverImage,
          progressData.anilistId
        )
        .then((res) => {
          if (res.success && res.progress) {
            setGlobalProgress((prev) => {
              const filtered = prev.filter((p) => p.animeId !== String(id));
              return [res.progress, ...filtered].slice(0, 100);
            });
          }
        })
        .catch((err) =>
          console.error("[Progress] Periodic save failed:", err)
        );
      } else {
        // Guest: use our helper
        saveProgressToState(progressData);
      }
    }, 180000); // Every 3 minutes

    return () => clearInterval(interval);
  }, [user, anime, id, activeEpisode, getTitle, setGlobalProgress, saveProgressToState]);
}
