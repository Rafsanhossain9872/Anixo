import { useState, useEffect, useRef } from "react";

/**
 * useStreamFetch
 * Fetches the stream iframe URL based on active episode, language, and server.
 * Supports 5 servers: Megaplay (MAL), Megaplay (AniList), Tryembed, Vidnest, Anineko.
 * Manages streamUrl, streamData, loading, error, and iframe loaded states.
 */
export function useStreamFetch({
  id,
  anime,
  activeEpisode,
  playerLang,
  activeServer,
  autoPlay,
  autoNext,
  setPageLoading,
  isMal,
  initialTime = 0,
}) {
  const [streamUrl, setStreamUrl] = useState("");
  const [streamData, setStreamData] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Keep autoPlay/autoNext in refs so the fetch effect always reads latest values
  // without triggering a re-fetch when they change
  const autoPlayRef = useRef(autoPlay);
  const autoNextRef = useRef(autoNext);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);

  // Sync global page loader with iframe loading
  useEffect(() => {
    if (
      iframeLoaded ||
      fetchError ||
      (streamUrl && streamData && !streamData.iframe_url && !streamLoading)
    ) {
      setTimeout(() => setPageLoading(false), 0);
    }
  }, [iframeLoaded, fetchError, streamUrl, streamData, streamLoading, setPageLoading]);

  // Clean up loading state on unmount
  useEffect(() => {
    return () => setPageLoading(false);
  }, [setPageLoading]);

  // Reset iframe loading state whenever the URL changes
  useEffect(() => {
    setTimeout(() => {
      if (streamUrl) {
        setIframeLoaded(false);
      } else {
        setIframeLoaded(true);
      }
    }, 0);
  }, [streamUrl]);

  // ── Main stream fetch logic ──
  useEffect(() => {
    let cancelled = false;

    const fetchStream = async () => {
      if (cancelled) return;

      console.info(
        `[Player] Fetching stream: Episode ${activeEpisode}, Lang: ${playerLang}, Server: ${activeServer}`
      );

      setStreamLoading(true);
      setPageLoading(true);
      setFetchError(null);
      setStreamUrl("");
      setStreamData(null);
      setIframeLoaded(false);

      // Force a tiny delay to ensure the iframe is completely destroyed in the DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        let url = "";

        // --- SERVER 1: ANIKO HLS SERVER ---
        if (activeServer === 1) {
          const langParam = playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);
          const anikoBase = import.meta.env.VITE_ANIKO_SERVER_API;
          
          if (anilistId && anikoBase) {
             const res = await fetch(`${anikoBase}/api/watch/${anilistId}/${langParam}/${activeEpisode}`);
             if (!res.ok) throw new Error("Aniko API failed");
             const json = await res.json();
             const key = Object.keys(json)[0];
             const data = json[key];
             
             if (data && data.streams && data.streams.length > 0) {
                 const hlsStream = data.streams.find(s => s.type === "hls" || s.url.includes('.m3u8')) || data.streams[0];
                 
                 // Build skipTimes in the format AnikoPlayer expects: { op: [start, end], ed: [start, end] }
                 const apiSkipTimes = {};
                 if (data.intro && data.intro.end > 0) {
                   apiSkipTimes.op = [data.intro.start, data.intro.end];
                 }
                 if (data.outro && data.outro.end > 0) {
                   apiSkipTimes.ed = [data.outro.start, data.outro.end];
                 }
                 const hasSkipData = Object.keys(apiSkipTimes).length > 0;

                 // Instead of an iframe URL, we inject the sources and subtitles directly into streamData
                 setStreamData({
                     server_name: "SERVER 1 (Aniko)",
                     lang: langParam,
                     sources: [{ url: hlsStream.url, type: 'hls' }],
                     subtitles: data.subtitles || [],
                     all_streams: data.streams,
                     // Only set skipTimes if API returned valid data, otherwise leave undefined so AniSkip fallback works
                     ...(hasSkipData ? { skipTimes: apiSkipTimes } : {}),
                 });
                 url = hlsStream.url;
             } else {
                 setFetchError("No streams found on Server 1 for this episode.");
             }
          } else {
             setFetchError("AniList ID or Server Config missing for Server 1.");
          }
        }

        // --- SERVER 2: MEGAPLAY (MAL ID) ---
        else if (activeServer === 2) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const megaBase =
            import.meta.env.VITE_MEGAPLAY_URL || "";

          if (anime?.idMal || isMal) {
            const malId = anime?.idMal || id;
            url = `${megaBase}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 2 (MAL)", lang: langParam });
          } else if (anime?.id || !isMal) {
            const anilistId = anime?.id || id;
            url = `${megaBase}/stream/ani/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 2 (AniList-Fallback)",
              lang: langParam,
            });
          } else {
            setFetchError("Stream ID not found. Try another server.");
          }
        }

        // --- SERVER 3: MEGAPLAY (AniList ID) ---
        else if (activeServer === 3) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const megaBase =
            import.meta.env.VITE_MEGAPLAY_URL || "";

          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            url = `${megaBase}/stream/ani/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 3 (AniList)",
              lang: langParam,
            });
          } else if (anime?.idMal || isMal) {
            const malId = anime?.idMal || id;
            url = `${megaBase}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 3 (MAL-Fallback)",
              lang: langParam,
            });
          } else {
            setFetchError("Stream ID not found. Try another server.");
          }
        }

        // --- SERVER 4: VIDNEST (AniList ID - Embed Anime) ---
        else if (activeServer === 4) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            url = `https://vidnest.fun/anime/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 4 (Vidnest)",
              lang: langParam,
            });
          } else {
            setFetchError(
              "AniList ID is required for Server 4. Try another server."
            );
          }
        }

        // --- SERVER 5: TRYEMBED (AniList ID) ---
        else if (activeServer === 5) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            const queryParams = [];
            if (autoPlayRef.current) {
              queryParams.push("autoplay=true");
            }
            queryParams.push("autoSkip=false");
            queryParams.push(`autoNext=${autoNextRef.current}`);
            queryParams.push("lang-type=false");

            if (initialTime && initialTime > 0) {
              queryParams.push(`startAt=${Math.floor(initialTime)}`);
            }

            const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
            url = `https://tryembed.us.cc/embed/anime/${anilistId}/${activeEpisode}/${langParam}${queryString}`;

            setStreamData({
              server_name: "SERVER 5 (Tryembed)",
              lang: langParam,
            });
          } else {
            setFetchError(
              "AniList ID is required for Server 5. Try another server."
            );
          }
        }

        // --- SERVER 6: TENZORA EMBED (iframe) ---
        else if (activeServer === 6) {
          const langParam = playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            url = `https://anixo.buzz/embed/ani/${anilistId}/${activeEpisode}/${langParam}?autoplay=${autoPlayRef.current ? '1' : '0'}&autonext=${autoNextRef.current ? '1' : '0'}`;
            setStreamData({
              server_name: "SERVER 6 (Tenzora)",
              lang: langParam,
            });
          } else {
            setFetchError("AniList ID is required for Server 6. Try another server.");
          }
        }

        // --- SERVER 7: TELEGRAM HLS (Dynamic via Aniko API) ---
        else if (activeServer === 7) {
          const langParam = playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);
          const anikoBase = import.meta.env.VITE_ANIKO_SERVER_API;
          const edgeBase = import.meta.env.VITE_TELEGRAM_EDGE_URL || "https://tenzora-edge.hossainrafsan046.workers.dev";

          if (anilistId && anikoBase) {
            const res = await fetch(`${anikoBase}/api/watch/${anilistId}/${langParam}/${activeEpisode}`);
            if (!res.ok) throw new Error("API failed for Server 7");
            const json = await res.json();
            const key = Object.keys(json)[0];
            const data = json[key];

            if (data && data.streams && data.streams.length > 0) {
              // Priority: 'telegram' type → URL containing 'tenzora-edge' → first HLS stream
              const telegramStream =
                data.streams.find(s => s.type === "telegram") ||
                data.streams.find(s => s.url && s.url.includes("tenzora-edge")) ||
                data.streams.find(s => s.type === "hls" || (s.url && s.url.includes('.m3u8')));

              if (telegramStream) {
                // If the API returns a file_id instead of a full URL, construct the edge URL
                const streamUrl = telegramStream.url.startsWith("http")
                  ? telegramStream.url
                  : `${edgeBase}/stream/${telegramStream.url}`;

                const apiSkipTimes = {};
                if (data.intro && data.intro.end > 0) {
                  apiSkipTimes.op = [data.intro.start, data.intro.end];
                }
                if (data.outro && data.outro.end > 0) {
                  apiSkipTimes.ed = [data.outro.start, data.outro.end];
                }
                const hasSkipData = Object.keys(apiSkipTimes).length > 0;

                setStreamData({
                  server_name: "SERVER 7 (Telegram)",
                  lang: langParam,
                  sources: [{ url: streamUrl, type: 'hls' }],
                  subtitles: data.subtitles || [],
                  ...(hasSkipData ? { skipTimes: apiSkipTimes } : {}),
                });
                url = streamUrl;
              } else {
                setFetchError("No Telegram stream found for this episode. Try another server.");
              }
            } else {
              setFetchError("No streams found on Server 7 for this episode.");
            }
          } else {
            setFetchError("AniList ID or Server Config missing for Server 7.");
          }
        }

        if (url) {
          if (activeServer === 2 || activeServer === 3) {
            // Inject Autoplay and premium params for Megaplay
            try {
              const urlObj = new URL(url);
              if (autoPlayRef.current) {
                urlObj.searchParams.set("autoplay", "1");
                urlObj.searchParams.set("muted", "1");
              } else {
                urlObj.searchParams.set("muted", "0");
              }

              // Cache buster & language override
              urlObj.searchParams.set("cb", Date.now().toString());
              urlObj.searchParams.set("lang", playerLang.toLowerCase());
              urlObj.searchParams.set("audio", playerLang.toLowerCase());

              const finalUrl = `${urlObj.toString()}#lang=${playerLang}`;
              setStreamUrl(finalUrl);
            } catch {
              const finalUrl = `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}#lang=${playerLang}`;
              setStreamUrl(finalUrl);
            }
          } else {
            // Keep Vidnest, Tryembed, Anineko, Telegram URLs clean without Megaplay-specific parameters
            setStreamUrl((activeServer === 1 || activeServer === 7) ? "aniko-stream" : url);
          }
        } else {
          setFetchError("Stream link not found for this server.");

        }
      } catch (err) {
        console.error(`[Player] Server ${activeServer} Fetch Error:`, err);
        setFetchError(
          err.response?.data?.error ||
          "Failed to fetch stream. Try another server."
        );
      } finally {
        setStreamLoading(false);
      }
    };

    fetchStream();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    anime?.id,
    anime?.idMal,
    activeEpisode,
    playerLang,
    activeServer,
    setPageLoading,
    isMal,
    initialTime,
  ]);

  return {
    streamUrl,
    streamData,
    streamLoading,
    fetchError,
    iframeLoaded,
    setIframeLoaded,
  };
}
