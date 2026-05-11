import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAnimeDetails, getEpisodeTitles, getJikanAnimeDetails, getMalSyncMapping, getMiruroStream, PYTHON_API, ALLANIME_API } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { useLoading } from "../context/LoadingContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import NextEpisodeBanner from "../components/common/NextEpisodeBanner";
import VideoPlayer from "../components/common/VideoPlayer";
import ArtPlayer from "../components/common/ArtPlayer";
import LoginModal from "../components/auth/LoginModal";
import { useAuth } from "../hooks/useAuth";
import { useWatchlist } from "../hooks/useWatchlist";
import { useAniSkip } from "../hooks/useAniSkip";
import { updateProgress } from "../services/progressService";
import { Home as HomeIcon } from "lucide-react";
import { updateMetaTags, updateStructuredData, clearStructuredData } from "../utils/seo";

// Extracted Watch sub-components
import PlayerToolbar from "../components/watch/PlayerToolbar";
import EpisodeSidebar from "../components/watch/EpisodeSidebar";
import SeasonsSection from "../components/watch/SeasonsSection";
import AnimeDetailsSection from "../components/watch/AnimeDetailsSection";
import CharactersSection from "../components/watch/CharactersSection";
import CustomCommentSection from "../components/watch/CommentSection";
import ReportModal from "../components/watch/ReportModal";
import SkipTimeModal from "../components/watch/SkipTimeModal";


export default function Watch() {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isMal = queryParams.get("mal") === "true";
  const initialEp = parseInt(queryParams.get("ep")) || 1;
  const initialTime = parseFloat(queryParams.get("t")) || 0;

  const { getTitle } = useLanguage();
  const { setPageLoading } = useLoading();

  const [activeEpisode, setActiveEpisode] = useState(initialEp);

  // --- Real Watch History Tracking ---
  const [watchedEpisodes, setWatchedEpisodes] = useState(() => {
    try {
      const saved = localStorage.getItem(`watched_${id}`);
      return saved ? JSON.parse(saved) : [initialEp];
    } catch { return [initialEp]; }
  });

  useEffect(() => {
    if (!activeEpisode || !id) return;

    // Decouple from render cycle to avoid cascading render warning
    setTimeout(() => {
      setWatchedEpisodes(prev => {
        if (prev.includes(activeEpisode)) return prev;
        const next = [...prev, activeEpisode];
        localStorage.setItem(`watched_${id}`, JSON.stringify(next));
        return next;
      });
    }, 0);
  }, [activeEpisode, id]);

  const [episodeLayout, setEpisodeLayout] = useState("list"); // "grid" | "list"
  const [playerLang, setPlayerLang] = useState("sub");
  const [activeServer, setActiveServer] = useState(2);

  const [allanimeId, setAllanimeId] = useState(null);
  const [videoQuality, setVideoQuality] = useState(() => {
    try { return localStorage.getItem("videoQuality") || "best"; } catch { return "best"; }
  });
  const [availableQualities, setAvailableQualities] = useState([]);

  const { user, setGlobalProgress, globalSettings, globalProgress } = useAuth();

  // Reset Allanime ID on navigation
  useEffect(() => {
    setTimeout(() => setAllanimeId(null), 0);
  }, [id]);

  // Safe localStorage helper
  const getSafeStorage = (key, defaultVal) => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return defaultVal;
      return JSON.parse(val);
    } catch (err) {
      console.warn(`[Storage] Failed to parse key "${key}". Resetting to default.`, err);
      return defaultVal;
    }
  };

  // Persisted settings
  const [autoNext, setAutoNext] = useState(() => getSafeStorage("autoNext", true));
  const [autoPlay, setAutoPlay] = useState(() => getSafeStorage("autoPlay", true));

  const [episodePage, setEpisodePage] = useState(0);
  const [hasSub, setHasSub] = useState(false); // Strict: Hide until verified
  const [hasDub, setHasDub] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [isEpisodeSearchOpen, setIsEpisodeSearchOpen] = useState(false);

  // Sync Focus Mode to Body class for global styling overrides
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("focus-mode");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.classList.remove("focus-mode");
    }
    return () => document.body.classList.remove("focus-mode");
  }, [isFocusMode]);


  // Modal states
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reportDetails, setReportDetails] = useState({
    issues: [],
    other: ""
  });
  const [userRating, setUserRating] = useState(() => getSafeStorage(`rating_${id}`, null));

  // AniSkip integration (extracted to custom hook) — called after useQuery below

  // Sync settings to localStorage
  useEffect(() => localStorage.setItem("autoNext", JSON.stringify(autoNext)), [autoNext]);
  useEffect(() => localStorage.setItem("autoPlay", JSON.stringify(autoPlay)), [autoPlay]);


  useEffect(() => {
    if (userRating) {
      localStorage.setItem(`rating_${id}`, JSON.stringify(userRating));
    }
  }, [userRating, id]);


  // Handle J/L key skipping based on user settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in a search box or input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const skipVal = globalSettings?.skipSeconds || 10;

      if (e.key.toLowerCase() === 'l') {
        // Skip Forward
        window.postMessage({ event: "skip", amount: skipVal }, "*");
      } else if (e.key.toLowerCase() === 'j') {
        // Skip Backward
        window.postMessage({ event: "skip", amount: -skipVal }, "*");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalSettings]);

  const EPISODES_PER_PAGE = 50;
  const GOGO_SLUG_OVERRIDES = {};

  // Sync with global settings
  useEffect(() => {
    if (globalSettings) {
      setTimeout(() => {
        if (globalSettings.videoLanguage === 'Dub') {
          setPlayerLang('dub');
        } else if (globalSettings.videoLanguage === 'Soft Sub' || globalSettings.videoLanguage === 'Hard Sub') {
          setPlayerLang('sub');
        }

        if (globalSettings.autoPlay !== undefined) setAutoPlay(globalSettings.autoPlay);
        if (globalSettings.autoNext !== undefined) setAutoNext(globalSettings.autoNext);
      }, 0);
    }
  }, [globalSettings]);

  // Reset or set active episode when navigating to a different anime
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetEp = parseInt(params.get("ep")) || 1;

    setTimeout(() => {
      setActiveEpisode(targetEp);
      setEpisodePage(0);
    }, 0);
  }, [id]);

  // Auto-jump to the correct page when active episode changes
  useEffect(() => {
    const targetPage = Math.floor((activeEpisode - 1) / EPISODES_PER_PAGE);
    setTimeout(() => setEpisodePage(targetPage), 0);
  }, [activeEpisode]);

  // API Endpoints

  const [streamUrl, setStreamUrl] = useState("");
  const [streamData, setStreamData] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [miruroIframeTag, setMiruroIframeTag] = useState("");

  const [fetchError, setFetchError] = useState(null);

  // Sync global page loader with iframe loading
  useEffect(() => {
    if (iframeLoaded || fetchError || (streamUrl && streamData && !streamData.iframe_url && !streamLoading)) {
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

  const { data: anime, isLoading } = useQuery({
    queryKey: ["animeDetails", id, isMal],
    queryFn: () => getAnimeDetails(id, isMal),
    enabled: !!id,
    staleTime: 1000 * 60 * 60 * 24, // 24 Hours Cache - Reduces 90% of repeat detail requests
    cacheTime: 1000 * 60 * 60 * 24,
  });

  // Watchlist hook (must be after anime is declared)
  const {
    backendWatchlist, isBookmarked, isWatchlistLoading,
    showWatchlistDropdown, setShowWatchlistDropdown,
    handleToggleBackendWatchlist, handleUpdateWatchlistStatus
  } = useWatchlist(id, anime, getTitle);

  // AniSkip hook (must be after anime is declared)
  const { skipTimes, setSkipTimes } = useAniSkip(id, anime, activeEpisode, isMal);

  // --- INSTANT SAVE TO CONTINUE WATCHING ---
  const instantSaveRef = useRef({});

  useEffect(() => {
    if (!user || !anime || !activeEpisode || !id) return;

    const key = `${id}-${activeEpisode}`;
    if (instantSaveRef.current[key]) return; // Already saved this episode

    // Wait for the actual anime data
    if (!anime.title) return;

    instantSaveRef.current[key] = true;

    // Find if we already have progress for this anime
    const existing = globalProgress.find(p => p.animeId === String(id));

    // If the episode is the same as the one we are resuming, preserve currentTime
    const isSameEpisode = existing && existing.episode === activeEpisode;
    const currTime = isSameEpisode ? existing.currentTime : 0;
    const duration = isSameEpisode ? existing.duration : null;

    const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;

    // Only trigger instant save if we are NOT at episode 1 (unless intended) 
    // or if this is the target episode from the URL to prevent overwriting progress.
    const urlParams = new URLSearchParams(window.location.search);
    const urlEp = parseInt(urlParams.get("ep"));

    // Prevent overwriting higher progress with episode 1 on initial load if user navigated to a specific ep
    if (urlEp && activeEpisode !== urlEp) return;

    updateProgress(String(id), activeEpisode, currTime, duration, getTitle(anime.title), coverImg, anime?.id)
      .then(res => {
        if (res.success && res.progress) {
          setGlobalProgress(prev => {
            const filtered = prev.filter(p => p.animeId !== String(id));
            return [res.progress, ...filtered].slice(0, 100);
          });
        }
      })
      .catch(err => console.error("Failed to init instant progress:", err));

  }, [user, anime, activeEpisode, id, globalProgress, getTitle, setGlobalProgress]);

  // --- DYNAMIC SEO & STRUCTURED DATA ---
  useEffect(() => {
    if (!anime) return;

    const title = getTitle(anime.title) || "Watch Anime";
    const coverImage = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;
    const descText = anime.description ? anime.description.replace(/<[^>]+>/g, '').substring(0, 160) : "Watch this anime online for free in high quality.";

    const epTitle = `Episode ${activeEpisode}`;
    const pageTitle = `Watch ${title} ${epTitle} English Sub/Dub`;
    const pageKeywords = `${title}, ${title} ${epTitle}, watch ${title} online, ${title} english sub, ${title} english dub, anixo, free anime streaming`;

    // Update Meta Tags
    updateMetaTags({
      title: pageTitle,
      description: `Watch ${title} ${epTitle} English Sub/Dub in High Quality. ${descText}`,
      image: coverImage,
      keywords: pageKeywords,
      type: "video.episode",
      url: `/watch/${id}?ep=${activeEpisode}${isMal ? '&mal=true' : ''}`,
      anilistId: isMal ? null : id,
      malId: anime?.idMal || (isMal ? id : null),
      episode: activeEpisode
    });

    // Generate Schema.org structured data for this Episode + VideoObject
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "TVEpisode",
        "episodeNumber": activeEpisode,
        "name": `${title} - ${epTitle}`,
        "image": coverImage,
        "partOfSeries": {
          "@type": "TVSeries",
          "name": title,
          "image": coverImage,
          "description": descText,
          "url": `${import.meta.env.VITE_SITE_URL || 'https://anixo.online'}/watch/${id}`
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": `${title} ${epTitle} Sub/Dub`,
        "description": `Stream ${title} ${epTitle} for free on Anixo.`,
        "thumbnailUrl": coverImage,
        "uploadDate": new Date().toISOString(),
        "contentUrl": window.location.href,
        "embedUrl": window.location.href,
        "interactionCount": "1000",
        "potentialAction": {
          "@type": "SeekAction",
          "target": `${window.location.href}&t={seek_to_second_number}`,
          "startOffset-input": "required name=seek_to_second_number"
        }
      }
    ];

    updateStructuredData(schema);

    // Cleanup when leaving component
    return () => {
      clearStructuredData();
      updateMetaTags({
        title: "Watch Free Anime Online, Stream Subbed & Dubbed HD",
        description: "AniXo is the best website to watch anime online for free. Watch trending, popular, and new releases with SUB, DUB in HD quality. No Ads Guaranteed! WATCH NOW!",
        url: "/"
      });
    };
  }, [anime, activeEpisode, getTitle, id, isMal]);

  // AniSkip skip times are now handled by the useAniSkip hook above

  // MAL Episode Titles (lightweight — only for episode names)
  const { data: malEpisodes } = useQuery({
    queryKey: ["malEpisodes", anime?.idMal],
    queryFn: () => getEpisodeTitles(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // MALSync Mapping for precise external IDs (Kitsu, etc)
  const { data: malsyncMapping } = useQuery({
    queryKey: ["malsyncMapping", anime?.idMal],
    queryFn: () => getMalSyncMapping(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Search for Allanime ID + Instant SUB/DUB Detection
  const [allanimeSubCount, setAllanimeSubCount] = useState(0);
  const [allanimeDubCount, setAllanimeDubCount] = useState(0);

  useEffect(() => {
    if (!anime || !malsyncMapping) return;

    const fetchAllanimeId = async () => {
      // --- STEP 1: Try Exact Mapping via MalSync (reuse React Query data, no extra API call) ---
      if (malsyncMapping && malsyncMapping.Sites && malsyncMapping.Sites.AllAnime) {
        const allAnimeKey = Object.keys(malsyncMapping.Sites.AllAnime)[0];
        const allAnimeData = malsyncMapping.Sites.AllAnime[allAnimeKey];
        if (allAnimeData && allAnimeData.identifier) {
          console.log(`[Allanime] Found exact MalSync mapping: ${allAnimeData.identifier}`);
          setAllanimeId(allAnimeData.identifier);
          setAllanimeSubCount(anime.episodes || 0);
          return; // Success!
        }
      }

      // --- STEP 2: Fallback to Keyword Search (with improved scoring) ---
      const titlesToTry = [
        anime.title?.english,
        anime.title?.romaji,
        ...(anime.synonyms || [])
      ].filter(Boolean).slice(0, 3); // Try top 3 most likely titles

      if (titlesToTry.length === 0) return;

      const mainSearchTitle = titlesToTry[0];
      const cacheKey = `allanime_search_v2_${mainSearchTitle}`;
      const cachedId = localStorage.getItem(cacheKey);

      if (cachedId) {
        try {
          const parsedCache = JSON.parse(cachedId);
          if (new Date().getTime() < parsedCache.expiry) {
            console.log(`[Allanime] Using cached ID: ${parsedCache.id}`);
            setAllanimeId(parsedCache.id);
            setAllanimeSubCount(parsedCache.sub || 0);
            setAllanimeDubCount(parsedCache.dub || 0);
            return;
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      try {
        // Search using top 2 titles (English and Romaji) concurrently for best results
        const searchPromises = [
          axios.get(`${ALLANIME_API}/search`, { params: { query: titlesToTry[0] } }).catch(() => ({ data: [] }))
        ];
        
        if (titlesToTry[1]) {
          searchPromises.push(
            axios.get(`${ALLANIME_API}/search`, { params: { query: titlesToTry[1] } }).catch(() => ({ data: [] }))
          );
        }

        const responses = await Promise.all(searchPromises);
        
        // Combine and deduplicate results by ID
        const uniqueResultsMap = new Map();
        responses.forEach(res => {
          if (Array.isArray(res.data)) {
            res.data.forEach(item => {
              if (item && item.id && !uniqueResultsMap.has(item.id)) {
                uniqueResultsMap.set(item.id, item);
              }
            });
          }
        });

        const searchData = Array.from(uniqueResultsMap.values());

        if (searchData.length > 0) {
          const targetTitles = titlesToTry.map(t => t.toLowerCase());
          let bestMatch = searchData[0];
          let highestScore = -500;

          searchData.forEach(result => {
            const resultTitle = (result.title || "").toLowerCase();
            const resultEnglish = (result.title_english || "").toLowerCase();

            let score = 0;
            
            // Score against all possible titles we have
            targetTitles.forEach((target, index) => {
              const weight = index === 0 ? 1 : 0.8; // Priority to English, then Romaji
              
              if (resultTitle === target || resultEnglish === target) {
                score += (100 * weight);
              } else if (resultTitle.includes(target) || target.includes(resultTitle)) {
                score += (50 * weight);
              } else if (resultEnglish.includes(target) || target.includes(resultEnglish)) {
                score += (50 * weight);
              }
            });

            // Robust Season Detection (Keep existing logic)
            const getSeason = (str) => {
              if (!str) return null;
              // Handle Roman Numerals
              if (/season\s+iii/i.test(str)) return "3";
              if (/season\s+ii/i.test(str)) return "2";
              if (/season\s+i\b/i.test(str)) return "1"; // match 'Season I' but not 'Season IV'
              
              const s1 = str.match(/season\s+(\d+)/i);
              if (s1) return s1[1];
              const s2 = str.match(/(\d+)(st|nd|rd|th)\s+season/i);
              if (s2) return s2[1];
              const s3 = str.match(/\s+(\d+)$/);
              if (s3) return s3[1];
              const s4 = str.match(/(?:part|cour|vol|s)(\d+)/i);
              if (s4) return s4[1];
              return null;
            };

            const targetSeason = getSeason(titlesToTry[0]) || getSeason(titlesToTry[1]);
            const resultSeason = getSeason(resultTitle) || getSeason(resultEnglish);

            if (targetSeason && resultSeason) {
              if (targetSeason === resultSeason) score += 100; // Big boost for exact season match
              else score -= 200; 
            } else if (!targetSeason && resultSeason) {
              // If we are looking for the base title (no season), and the result HAS a season:
              if (resultSeason === "1") {
                score += 50; // Boost Season 1 to prevent Specials from winning
              } else {
                score -= 100; // Penalty for other seasons (Season 2, 3) when looking for base
              }
            }

            // Penalize "Specials", "OVA", "Movie" if not explicitly searched for
            const isTargetSpecial = titlesToTry.some(t => /special|ova|movie/i.test(t));
            const isResultSpecial = /special|ova|movie/i.test(resultTitle) || /special|ova|movie/i.test(resultEnglish);
            
            if (!isTargetSpecial && isResultSpecial) {
              score -= 150; // Heavy penalty to prevent specials from stealing Season 1
            }

            // Length Penalty
            const lengthDiff = Math.abs(resultTitle.length - titlesToTry[0].length);
            score -= (lengthDiff * 1.5);

            if (score > highestScore) {
              highestScore = score;
              bestMatch = result;
            }
          });

          if (highestScore > -100) { // Only set if we have a somewhat decent match
            setAllanimeId(bestMatch.id);
            setAllanimeSubCount(parseInt(bestMatch.episodes_sub) || 0);
            setAllanimeDubCount(parseInt(bestMatch.episodes_dub) || 0);
            console.log(`[Allanime] Best Match: ${bestMatch.title} | Score: ${highestScore}`);

            localStorage.setItem(cacheKey, JSON.stringify({
              id: bestMatch.id,
              sub: parseInt(bestMatch.episodes_sub) || 0,
              dub: parseInt(bestMatch.episodes_dub) || 0,
              expiry: new Date().getTime() + (24 * 60 * 60 * 1000)
            }));
          }
        }
      } catch (err) {
        console.warn("Allanime search failed:", err);
      }
    };

    fetchAllanimeId();
  }, [anime, malsyncMapping, ALLANIME_API, id, isMal]);

  // Fetch available qualities for Server 2 (AllAnime)
  const qualitiesCache = useRef({});
  useEffect(() => {
    if (activeServer !== 2 || !allanimeId || !activeEpisode) {
      setTimeout(() => setAvailableQualities([]), 0);
      return;
    }
    const cacheKey = `${allanimeId}-${activeEpisode}-${playerLang}`;
    if (qualitiesCache.current[cacheKey]) {
      setTimeout(() => setAvailableQualities(qualitiesCache.current[cacheKey]), 0);
      return;
    }
    const mode = playerLang === 'dub' ? 'dub' : 'sub';
    axios.get(`${ALLANIME_API}/qualities`, {
      params: { show_id: allanimeId, ep_no: activeEpisode, mode }
    })
      .then(res => {
        const q = res.data?.qualities || [];
        qualitiesCache.current[cacheKey] = q;
        setAvailableQualities(q);
        console.log(`[Qualities] Episode ${activeEpisode}: ${q.join(', ') || 'single quality only'}`);
      })
      .catch(() => setAvailableQualities([]));
  }, [activeServer, allanimeId, activeEpisode, playerLang, ALLANIME_API]);

  // ── PROGRESS: Save to backend handled by player time-tracking ──
  useEffect(() => {
    if (!user || !anime || !id) return;
    // We no longer pre-save 0:00 to avoid overwriting real progress.
    // Progress will be saved automatically by the player time-tracking.
  }, [user, anime, id, activeEpisode]);

  const lastCapturedTime = useRef(0);
  const lastCapturedDuration = useRef(null);

  // Robustly extract time from player messages
  useEffect(() => {
    const handleProgressCapture = (e) => {
      const data = e.data;
      if (!data) return;

      const getNum = (...vals) => {
        for (const val of vals) {
          const num = Number(val);
          if (!isNaN(num) && typeof num === 'number' && num >= 0) return num;
        }
        return null;
      };

      // Extract time from various known formats
      const time = getNum(
        data.currentTime, data.time, data.seconds, data.position,
        data.data?.currentTime, data.data?.position,
        data.value?.currentTime, data.value?.position
      );

      const duration = getNum(
        data.duration, data.totalTime,
        data.data?.duration, data.value?.duration
      );

      if (time !== null) lastCapturedTime.current = Math.floor(time);
      if (duration !== null) lastCapturedDuration.current = Math.floor(duration);
    };

    window.addEventListener("message", handleProgressCapture);
    return () => window.removeEventListener("message", handleProgressCapture);
  }, []);

  // ── PROGRESS: Save on page leave / tab close ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Instant save: track if we have any progress at all
      if (!anime || !id || lastCapturedTime.current <= 5) return;

      const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
      const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown';
      
      const progressData = {
        animeId: String(id),
        anilistId: anime?.id,
        episode: activeEpisode,
        currentTime: lastCapturedTime.current,
        duration: lastCapturedDuration.current,
        title,
        coverImage: coverImg,
        updatedAt: new Date().toISOString()
      };

      if (user) {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          fetch('/progress/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(progressData),
            keepalive: true
          });
        } catch { /* Silently fail */ }
      } else {
        // Guest user local storage backup
        try {
          const localStr = localStorage.getItem("guest_progress");
          let guestProg = localStr ? JSON.parse(localStr) : [];
          guestProg = guestProg.filter(p => p.animeId !== progressData.animeId);
          guestProg.unshift(progressData);
          localStorage.setItem("guest_progress", JSON.stringify(guestProg.slice(0, 50)));
        } catch { /* Silently fail */ }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, anime, id, activeEpisode]);

  // ── PROGRESS: Periodic save every 3 minutes (or local if guest) ──
  useEffect(() => {
    if (!anime || !id) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastIntervalSave.current < 175000) return;
      if (lastCapturedTime.current <= 5) return;

      lastIntervalSave.current = now;
      const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
      const titleStr = getTitle(anime.title);

      const progressData = {
        animeId: String(id),
        episode: activeEpisode,
        currentTime: lastCapturedTime.current,
        duration: lastCapturedDuration.current,
        title: titleStr,
        coverImage: coverImg,
        anilistId: anime?.id,
        updatedAt: new Date().toISOString()
      };

      if (user) {
        // Logged-in users: Save to Vercel Database
        updateProgress(
          progressData.animeId, progressData.episode, progressData.currentTime,
          progressData.duration, progressData.title, progressData.coverImage, progressData.anilistId
        ).catch(err => console.error("[Progress] Periodic save failed:", err));
      } else {
        // Guest users: Save to LocalStorage (Zero Vercel hits!)
        try {
          const localStr = localStorage.getItem("guest_progress");
          let guestProg = localStr ? JSON.parse(localStr) : [];
          guestProg = guestProg.filter(p => p.animeId !== progressData.animeId);
          guestProg.unshift(progressData);
          localStorage.setItem("guest_progress", JSON.stringify(guestProg.slice(0, 50)));
        } catch (e) {
          console.warn("Could not save guest progress", e);
        }
      }
    }, 180000); // Every 3 minutes

    return () => clearInterval(interval);
  }, [user, anime, id, activeEpisode, getTitle]);



  // 1. Compute Relations (Sequels/Prequels/Related)
  const relations = useMemo(() => {
    if (!anime) return [];
    return (anime.relations?.edges || [])
      .filter(edge => edge.node?.type === 'ANIME')
      .map(edge => edge.node)
      .filter(item => item && Number(item.id) !== Number(id))
      .slice(0, 12);
  }, [anime, id]);

  // 2. Compute Recommendations (You May Also Like)
  const recommendations = useMemo(() => {
    if (!anime) return [];
    return (anime.recommendations?.nodes || [])
      .map(node => node.mediaRecommendation)
      .filter(item => item && Number(item.id) !== Number(id))
      .slice(0, 24);
  }, [anime, id]);

  // SUB/DUB availability — instant detection via AllAnime episode counts
  useEffect(() => {
    if (!allanimeSubCount && !allanimeDubCount) {
      // AllAnime data not loaded yet, keep defaults
      return;
    }

    const subAvailable = allanimeSubCount >= activeEpisode;
    const dubAvailable = allanimeDubCount >= activeEpisode;

    setTimeout(() => {
      setHasSub(subAvailable);
      setHasDub(dubAvailable);

      // Auto-switch language if current selection is unavailable
      if (playerLang === "dub" && !dubAvailable && subAvailable) setPlayerLang("sub");
      else if (playerLang === "sub" && !subAvailable && dubAvailable) setPlayerLang("dub");
    }, 0);
  }, [activeEpisode, allanimeSubCount, allanimeDubCount, playerLang]);







  const { data: jikanDetails } = useQuery({
    queryKey: ["jikanDetails", anime?.idMal],
    queryFn: () => getJikanAnimeDetails(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Unified priority resolver: Jikan > Anilist
  const resolvedInfo = useMemo(() => {
    const get = (field, ...fallbacks) => {
      // Jikan uses different keys, handle mapping
      const jikanMap = {
        description: jikanDetails?.synopsis,
        country: jikanDetails?.demographics?.[0]?.name ? 'Japan' : null,
        premiered: jikanDetails?.season && jikanDetails?.year ? `${jikanDetails.season} ${jikanDetails.year}` : null,
        aired: jikanDetails?.aired?.string,
        episodes: jikanDetails?.episodes?.toString(),
        duration: jikanDetails?.duration,
        status: jikanDetails?.status,
        mal_score: jikanDetails?.score?.toString(),
        studios: jikanDetails?.studios?.map(s => s.name).join(", "),
        producers: jikanDetails?.producers?.map(p => p.name).join(", "),
        genres: jikanDetails?.genres?.map(g => g.name),
        rating: jikanDetails?.rating?.split(" - ")[0],
      };
      if (jikanMap[field]) return jikanMap[field];
      // Final fallback values
      for (const fb of fallbacks) {
        if (fb) return fb;
      }
      return null;
    };
    if (!anime) return {};
    return {
      description: get("description", anime.description),
      country: get("country", anime.countryOfOrigin === 'JP' ? 'Japan' : anime.countryOfOrigin),
      premiered: get("premiered", anime.seasonYear ? `${anime.season?.toLowerCase() || ''} ${anime.seasonYear}` : null),
      aired: get("aired", anime.startDate ? `${anime.startDate.month ? new Date(anime.startDate.year, anime.startDate.month - 1).toLocaleString('default', { month: 'short' }) : '?'} ${anime.startDate.day || '?'}, ${anime.startDate.year}` : null),
      episodes: get("episodes", anime.episodes?.toString()),
      duration: get("duration", anime.duration ? `${anime.duration} min` : null),
      status: get("status", anime.status?.replace(/_/g, ' ')?.toLowerCase()),
      mal_score: get("mal_score", anime.averageScore ? `${(anime.averageScore / 10).toFixed(2)}` : null),
      studios: get("studios", anime.studios?.nodes?.filter(s => s.isAnimationStudio)[0]?.name),
      producers: get("producers", anime.studios?.nodes?.filter(s => !s.isAnimationStudio).map(s => s.name).join(", ")),
      genres: get("genres", anime.genres),
      rating: get("rating"),
    };
  }, [anime, jikanDetails]);

  // Resolve current episode image for player background/loading placeholder
  const currentEpisodeImage = useMemo(() => {
    if (!anime) return null;
    const epData = malEpisodes?.find(e => e.mal_id === activeEpisode);
    const aniListEp = anime?.streamingEpisodes?.find(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === activeEpisode
    ) || anime?.streamingEpisodes?.[activeEpisode - 1];

    // Priority:
    // 1. AniList Thumbnail (If not placeholder)
    // 2. Jikan / MAL
    // 3. Fallback to Anime Banner
    return aniListEp?.thumbnail ||
      epData?.images?.jpg?.image_url ||
      anime?.bannerImage ||
      anime?.coverImage?.extraLarge ||
      anime?.coverImage?.large;
  }, [anime, malEpisodes, activeEpisode]);



  const episodesList = useMemo(() => {
    if (!anime) return [];

    // For ongoing anime, we start with 0 and build up based on confirmed releases.
    // For finished anime, we can trust the total episode count.
    let count = anime.status === 'FINISHED' ? (anime.episodes || 0) : 0;

    // 1. Check AniList Airing Info (Best for official release count)
    if (anime.nextAiringEpisode) {
      count = Math.max(count, anime.nextAiringEpisode.episode - 1);
    }

    // 2. Check Jikan (MAL) Count (Very reliable for released episodes)
    if (malEpisodes && malEpisodes.length > 0) {
      count = Math.max(count, malEpisodes.length);
    }

    // 3. Check AllAnime Count (Fastest for new releases)
    if (allanimeSubCount > 0) {
      // Small safety check: don't exceed total if total is known
      const safeCount = (anime.status === 'FINISHED' && anime.episodes)
        ? Math.min(allanimeSubCount, anime.episodes)
        : allanimeSubCount;
      count = Math.max(count, safeCount);
    }


    // 5. Final fallback for airing shows if AniList has no airing info but has streaming metadata
    if (!count && anime.status === 'RELEASING' && anime.streamingEpisodes && anime.streamingEpisodes.length > 0) {
      count = anime.streamingEpisodes.length;
    }

    // Last Resort: If even finished anime has 0, or everything is unknown, show 1.
    if (!count && anime.status === 'FINISHED') count = anime.episodes || 1;
    if (!count) count = 1;

    return Array.from({ length: count }, (_, i) => i + 1);
  }, [anime, malEpisodes, allanimeSubCount]);

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery) return episodesList;
    const query = episodeSearchQuery.toLowerCase().trim();
    return episodesList.filter(ep => {
      const epStr = String(ep);
      const jikanData = malEpisodes?.find(e => e.mal_id === ep);

      const title = (jikanData?.title || "").toLowerCase();
      return epStr.includes(query) || title.includes(query);
    });
  }, [episodesList, episodeSearchQuery, malEpisodes]);

  // Clamp episodePage when filteredEpisodes changes (e.g. searching)
  useEffect(() => {
    const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
    if (episodePage >= totalPages && totalPages > 0) {
      setTimeout(() => setEpisodePage(totalPages - 1), 0);
    } else if (filteredEpisodes.length === 0 && episodePage !== 0) {
      setTimeout(() => setEpisodePage(0), 0);
    }
  }, [filteredEpisodes, episodePage, EPISODES_PER_PAGE]);

  const [stableSeasons, setStableSeasons] = useState([]);

  useEffect(() => {
    if (!anime) return;

    setTimeout(() => {
      setStableSeasons(prev => {
        const isAlreadyInList = prev.some(s => s.id === anime.id || s.slug === anime.slug);

        if (isAlreadyInList) {
          return prev.map(s => ({
            ...s,
            isActive: (s.id === anime.id || s.slug === anime.slug)
          }));
        }


        // Fallback: AniList Relations
        const items = [{
          ...anime,
          isActive: true,
          relationToMain: 'CURRENT'
        }];

        if (anime.relations?.edges) {
          anime.relations.edges.forEach(edge => {
            if (["TV"].includes(edge.node?.format)) {
              items.push({
                ...edge.node,
                isActive: false,
                relationToMain: edge.relationType
              });
            }
          });
        }

        const uniqueMap = new Map();
        items.forEach(item => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          } else {
            if (item.isActive) {
              const existing = uniqueMap.get(item.id);
              existing.isActive = true;
              existing.relationToMain = 'CURRENT';
              uniqueMap.set(item.id, existing);
            }
          }
        });

        const uniqueItems = Array.from(uniqueMap.values()).filter(item => {
          // 1. Always keep the current active anime
          if (item.isActive) return true;

          // 2. Only allow specific relation types that define a "Season"
          const allowedRelations = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'ALTERNATIVE'];
          if (!allowedRelations.includes(item.relationToMain)) return false;

          // 3. Strict Title Check: Ensure it belongs to the same franchise
          // (Prevents "Dragon Ball" showing up in "One Piece" due to crossovers)
          const mainTitle = getTitle(anime.title).split(' ')[0].toLowerCase(); // e.g., "one"
          const itemTitle = getTitle(item.title).toLowerCase();

          // Keep if it contains the first word of the main title OR it's a direct sequel/prequel
          const isSequelPrequel = ['PREQUEL', 'SEQUEL'].includes(item.relationToMain);
          const isSimilarTitle = itemTitle.includes(mainTitle);

          return isSequelPrequel || isSimilarTitle;
        });

        uniqueItems.sort((a, b) => {
          const aMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(a.relationToMain) || (!a.relationToMain && ['TV'].includes(a.format)) ? 0 : 1;
          const bMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(b.relationToMain) || (!b.relationToMain && ['TV'].includes(b.format)) ? 0 : 1;

          if (aMain !== bMain) return aMain - bMain;

          const aY = a.startDate?.year || 9999;
          const bY = b.startDate?.year || 9999;
          if (aY !== bY) return aY - bY;
          const aM = a.startDate?.month || 12;
          const bM = b.startDate?.month || 12;
          if (aM !== bM) return aM - bM;
          const aD = a.startDate?.day || 31;
          const bD = b.startDate?.day || 31;
          return aD - bD;
        });

        return uniqueItems;
      });
    }, 0);
  }, [anime, getTitle]);





  // Watchlist handlers are now in the useWatchlist hook



  const lastAutoNextTime = useRef(0);
  const autoNextRef = useRef(autoNext);
  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);

  // Go to the next episode
  const goNextEpisode = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoNextTime.current < 3000) return;
    lastAutoNextTime.current = now;

    setActiveEpisode(prev => {
      const next = prev + 1;
      if (next <= episodesList.length) {
        return next;
      }
      return prev;
    });
  }, [episodesList.length]);

  const goPrevEpisode = useCallback(() => {
    setActiveEpisode(prev => Math.max(1, prev - 1));
  }, []);

  const lastIntervalSave = useRef(0);
  const iframeRef = useRef(null);

  // ── Megaplay Player Events Listener ──
  useEffect(() => {
    const handleMessage = (event) => {
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {
          // Handle raw string events like "ended" or "complete"
          if (data === "ended" || data === "video_ended" || data === "complete") {
            if (autoNextRef.current) goNextEpisode();
          }
          return;
        }
      }

      if (!data) return;

      // 1. Handle Episode Completion (AutoNext)
      const isComplete =
        data.event === "complete" ||
        data.event === "onComplete" ||
        data.event === "ended" ||
        data.event === "finish" ||
        data.type === "complete" ||
        data.type === "ended" ||
        data.status === "completed" ||
        data.status === "finished" ||
        (data.event === "state" && data.data === "completed") ||
        data.message === "ended";

      if (isComplete) {
        if (autoNextRef.current) {
          console.info("[Player] Video ended, moving to next episode...");
          goNextEpisode();
        }
      }

      // AutoSkip Logic Removed


      // 3. Progress tracking is now handled globally by the 30s interval and beforeunload events.
      // We no longer spam the backend every 2 seconds here.
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [goNextEpisode, skipTimes, activeEpisode, user, id, anime, getTitle, setGlobalProgress]); // Removed autoNext from deps, using autoNextRef instead for stability





  // ── Stream Logic: Fetch iframe URL for the active episode ──
  useEffect(() => {
    let cancelled = false;

    const fetchStream = async () => {
      if (cancelled) return;

      console.info(`[Player] Fetching stream: Episode ${activeEpisode}, Lang: ${playerLang}, Server: ${activeServer}`);


      setStreamLoading(true);
      setPageLoading(true);
      setFetchError(null);
      setStreamUrl("");
      setMiruroIframeTag("");
      setStreamData(null);
      setIframeLoaded(false);

      try {
        let url = "";

        // --- SERVER 1: ALLANIME INTEGRATION (ArtPlayer) ---
        if (activeServer === 1) {
          if (allanimeId) {
            const mode = playerLang.toLowerCase() === 'dub' ? 'dub' : 'sub';
            url = `${ALLANIME_API}/play?show_id=${allanimeId}&ep_no=${activeEpisode}&mode=${mode}&quality=${videoQuality}`;
            setStreamData({ server_name: "SERVER 1 (Allanime)", lang: mode, quality: videoQuality });
          } else {
            setFetchError("Allanime ID not resolved yet. Please wait or try another server.");
          }
        }

        // --- SERVER 2: MEGAPLAY SMART INTEGRATION ---
        else if (activeServer === 2) {
          const langParam = playerLang.toLowerCase() === 'dub' ? 'dub' : 'sub';
          
          // If the user is on a MAL route, prioritize the MAL endpoint (fixes unmapped AniList IDs on Megaplay)
          if (isMal) {
            const malId = anime?.idMal || id;
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 2 (MAL-Priority)", lang: langParam });
          } 
          // Otherwise, use real AniList ID from fetched data
          else if (anime && anime.id) {
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/ani/${anime.id}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 2 (AniList)", lang: langParam });
          } 
          // Last resort fallback
          else if (anime?.idMal) {
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/mal/${anime.idMal}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 2 (MAL-Fallback)", lang: langParam });
          } else {
            setFetchError("Stream ID not found. Try Server 3.");
          }
        }

        // --- SERVER 3: MEGAPLAY INTEGRATION ---
        else if (activeServer === 3) {
          const langParam = playerLang.toLowerCase() === 'dub' ? 'dub' : 'sub';
          
          if (isMal) {
            const malId = anime?.idMal || id;
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 3 (MAL-Priority)", lang: langParam });
          } else if (anime && anime.id) {
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/ani/${anime.id}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 3 (AniList)", lang: langParam });
          } else {
            const malFallbackId = anime?.idMal || (isMal ? id : null);
            url = `${import.meta.env.VITE_MEGAPLAY_URL || 'https://megaplay.buzz'}/stream/mal/${malFallbackId}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 3 (Fallback)", lang: langParam });
          }
        }

        // --- SERVER 4: MIRURO INTEGRATION ---
        else if (activeServer === 4) {
          // Miruro uses AniList ID directly
          const anilistId = anime?.id || id;
          const miruroData = await getMiruroStream(anilistId, activeEpisode);

          if (cancelled) return;

          const iframeTag = miruroData?.iframe_tag || miruroData?.result?.iframe_tag;

          if (iframeTag) {
            setMiruroIframeTag(iframeTag);
            setStreamData({ server_name: "SERVER 4 (Miruro)", lang: playerLang });
            setStreamLoading(false);
            setIframeLoaded(true);
            setFetchError(null);
            return;
          } else {
            setFetchError("Miruro: No stream found for this episode.");
            setMiruroIframeTag("");
          }
        }




        if (url) {
          // Inject Autoplay and premium params
          try {
            const urlObj = new URL(url);
            if (autoPlay) {
              urlObj.searchParams.set("autoplay", "1");
              // Browser Policy: Autoplay is only allowed if the video is muted.
              // We mute it so it starts automatically as requested, and user can unmute.
              urlObj.searchParams.set("muted", "1");
            } else {
              urlObj.searchParams.set("muted", "0");
            }

            // FORCE REFRESH: Append a hash to ensure unique URL per language
            // This forces React to destroy the iframe and create a new one.
            const finalUrl = `${urlObj.toString()}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL injected into iframe: ${finalUrl}`);
          } catch {
            // Fallback for non-URL strings
            const finalUrl = `${url}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL (Fallback) injected: ${finalUrl}`);
          }
        } else {
          setFetchError("Stream link not found for this server.");
        }
      } catch (err) {
        console.error(`[Player] Server ${activeServer} Fetch Error:`, err);
        setFetchError(err.response?.data?.error || "Failed to fetch stream. Try another server.");
      } finally {
        setStreamLoading(false);
      }
    };

    fetchStream();

    return () => { cancelled = true; };
  }, [id, anime?.id, anime?.idMal, activeEpisode, playerLang, activeServer, allanimeId, autoPlay, videoQuality, episodesList.length, setPageLoading]);

  const handleReport = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    console.info(`[Report] Submitting report for Anime ID: ${id}, Episode: ${activeEpisode}`, reportDetails);

    // Simulate API call
    setReportSuccess(true);
    setShowReportModal(false);
    setReportDetails({ issues: [], other: "" });

    setTimeout(() => setReportSuccess(false), 5000);
  };

  const toggleReportIssue = (issue) => {
    setReportDetails(prev => ({
      ...prev,
      issues: prev.issues.includes(issue)
        ? prev.issues.filter(i => i !== issue)
        : [...prev.issues, issue]
    }));
  };

  const handleSaveSkipTime = (episodeNum, start, end) => {
    setSkipTimes(prev => ({ ...prev, [episodeNum]: { start, end } }));
    setShowSkipModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Anime Not Found</h1>
        <p className="text-white/40 text-sm max-w-md">
          We couldn't retrieve the details for this anime (ID: {id}).
          This could be a connectivity issue with the AniList API or an invalid ID.
        </p>
        <Link to="/home" className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors text-sm font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans text-white relative bg-transparent overflow-x-hidden ${isFocusMode ? "overflow-hidden" : ""}`}>
      {!isFocusMode && <Navbar />}

      {/* Focus Mode Curtain */}
      {isFocusMode && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[35] transition-all duration-700 animate-in fade-in cursor-pointer"
          onClick={() => setIsFocusMode(false)}
        />
      )}

      <main className={`${isFocusMode ? 'pt-0' : 'pt-[60px]'} max-w-[1720px] mx-auto px-2 lg:px-4 transition-all duration-500`}>

        {/* Main Media Grid */}
        <div className={`flex flex-col lg:grid lg:gap-6 ${isFocusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} transition-all duration-500 mt-4`}>

          {/* LEFT COLUMN: Player + Controls */}
          <div className={`${isFocusMode ? 'lg:col-span-1 fixed inset-0 z-40 flex flex-col items-center justify-center p-4 lg:p-12 pointer-events-none' : 'lg:col-span-3'}`}>

            {/* Breadcrumbs */}
            {!isFocusMode && (
              <div
                className="bg-[#121418] border-x border-t border-white/5 px-5 py-3 flex items-center justify-between"
                style={{ clipPath: 'polygon(15px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 15px)' }}
              >
                <nav className="flex items-center gap-2 text-[13px] font-medium text-white/40 overflow-x-auto whitespace-nowrap scrollbar-hide">
                  <Link to="/home" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <HomeIcon size={14} className="mb-0.5" />
                    Home
                  </Link>
                  <span className="text-white/10 font-light">/</span>
                  <span className="hover:text-white transition-colors uppercase cursor-pointer">{anime.format || "TV"}</span>
                  <span className="text-white/10 font-light">/</span>
                  <span className="text-white/60 truncate max-w-[200px] md:max-w-none">{getTitle(anime.title)}</span>
                </nav>
              </div>
            )}

            {/* Video Player Container */}
            <section className={`relative w-full aspect-video bg-[#000] overflow-hidden border-x border-white/5 shadow-2xl transition-all duration-500 ${isFocusMode ? 'max-w-[90vw] max-h-[85vh] pointer-events-auto ring-1 ring-white/10 rounded-sm' : ''}`}>
              {/* Loader & Error Overlay */}
              {((streamLoading || (streamUrl && !iframeLoaded) || (activeServer === 6 && miruroIframeTag === "" && !fetchError)) || (!streamLoading && (!streamUrl && !miruroIframeTag || fetchError))) && (
                <div className="absolute inset-0 z-20 group">
                  <img
                    src={currentEpisodeImage}
                    alt="Poster"
                    key={activeEpisode}
                    className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 animate-in fade-in fill-mode-both ${fetchError || (!streamLoading && !streamUrl) ? 'brightness-[0.7]' : 'brightness-[0.4]'}`}
                  />
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    {(streamLoading || (streamUrl && !iframeLoaded)) && activeServer !== 2 ? (
                      <div className="flex flex-col items-center gap-4 transition-all duration-300">
                        <div className="w-10 h-10 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(220,38,38,0.3)]"></div>
                        <p className="text-white/20 text-[8px] font-bold uppercase tracking-[0.3em] animate-pulse">Loading...</p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in zoom-in-95 duration-300"><div /></div>
                    )}
                  </div>
                </div>
              )}

              {/* Miruro Server 4: Raw iframe_tag rendering */}
              {activeServer === 4 && miruroIframeTag ? (
                <div
                  key={`miruro-${activeEpisode}`}
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: miruroIframeTag }}
                />
              ) : (
                <div className="w-full h-full">
                  {activeServer === 1 ? (
                    streamUrl ? (
                      <ArtPlayer
                        skipTimes={skipTimes[activeEpisode]}
                        key={`${id}-${activeEpisode}-${activeServer}-${videoQuality}`}
                        src={streamUrl}
                        poster={anime?.coverImage?.extraLarge || anime?.coverImage?.large}
                        initialTime={initialTime}
                        videoQuality={videoQuality}
                        availableQualities={availableQualities}
                        onQualityChange={(q) => { setVideoQuality(q); localStorage.setItem("videoQuality", q); }}
                        onReady={() => setTimeout(() => setIframeLoaded(true), 0)}
                        onEnded={() => {
                          if (autoNext && activeEpisode < episodesList.length) {
                            const nextEp = episodesList.find(e => e.number === activeEpisode + 1);
                            if (nextEp) setActiveEpisode(nextEp.number);
                          }
                        }}
                      />
                    ) : null
                  ) : (streamData?.sources && Array.isArray(streamData.sources) && streamData.sources.length > 0 && !streamData?.iframe_url) || (activeServer === 2 && streamData?.sources) ? (
                    <VideoPlayer
                      skipTimes={skipTimes[activeEpisode]}
                      src={streamData.sources[0].url}
                      type={streamData.sources[0].type}
                      poster={anime?.coverImage?.extraLarge || anime?.coverImage?.large}
                      subtitles={streamData.subtitles || []}
                      initialTime={initialTime}
                      onReady={() => setTimeout(() => setIframeLoaded(true), 0)}
                      onEnded={() => {
                        if (autoNext && activeEpisode < episodesList.length) {
                          const nextEp = episodesList.find(e => e.number === activeEpisode + 1);
                          if (nextEp) setActiveEpisode(nextEp.number);
                        }
                      }}
                    />
                  ) : (
                    <iframe
                      ref={iframeRef}
                      key={`${activeServer}-${activeEpisode}-${playerLang}`}
                      src={streamUrl || "about:blank"}
                      onLoad={() => { if (streamUrl) setTimeout(() => setIframeLoaded(true), 0); }}
                      className={`w-full h-full border-0 transition-opacity duration-500 ${!iframeLoaded ? 'opacity-0' : 'opacity-100'}`}
                      allowFullScreen
                      allowfullscreen="true"
                      webkitallowfullscreen="true"
                      mozallowfullscreen="true"
                      scrolling="no"
                      allow="autoplay; fullscreen *; encrypted-media; picture-in-picture; xr-spatial-tracking; clipboard-write"
                    />
                  )}
                </div>
              )}
            </section>

            {/* Player Toolbar + Server Selector */}
            <PlayerToolbar
              isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode}
              autoNext={autoNext} setAutoNext={setAutoNext}
              autoPlay={autoPlay} setAutoPlay={setAutoPlay}
              activeEpisode={activeEpisode} episodesList={episodesList}
              goPrevEpisode={goPrevEpisode} goNextEpisode={goNextEpisode}
              playerLang={playerLang} setPlayerLang={setPlayerLang}
              hasSub={hasSub} hasDub={hasDub}
              activeServer={activeServer} setActiveServer={setActiveServer}
              isBookmarked={isBookmarked} isWatchlistLoading={isWatchlistLoading}
              handleToggleBackendWatchlist={handleToggleBackendWatchlist}
              showWatchlistDropdown={showWatchlistDropdown} setShowWatchlistDropdown={setShowWatchlistDropdown}
              backendWatchlist={backendWatchlist} handleUpdateWatchlistStatus={handleUpdateWatchlistStatus}
              id={id} handleReport={handleReport} reportSuccess={reportSuccess} user={user}
            />

            {/* Next Episode Banner */}
            {!isFocusMode && (
              <div className="border-t border-white/5 bg-[#0d0d0d]/50">
                <NextEpisodeBanner anime={anime} />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Episodes Sidebar */}
          {!isFocusMode && (
            <EpisodeSidebar
              filteredEpisodes={filteredEpisodes}
              episodeLayout={episodeLayout} setEpisodeLayout={setEpisodeLayout}
              episodePage={episodePage} setEpisodePage={setEpisodePage}
              EPISODES_PER_PAGE={EPISODES_PER_PAGE}
              activeEpisode={activeEpisode} setActiveEpisode={setActiveEpisode}
              watchedEpisodes={watchedEpisodes}
              isEpisodeSearchOpen={isEpisodeSearchOpen} setIsEpisodeSearchOpen={setIsEpisodeSearchOpen}
              episodeSearchQuery={episodeSearchQuery} setEpisodeSearchQuery={setEpisodeSearchQuery}
              malEpisodes={malEpisodes} anime={anime}
            />
          )}
        </div>

        {/* Seasons */}
        {!isFocusMode && (
          <SeasonsSection stableSeasons={stableSeasons} getTitle={getTitle} />
        )}

        {/* Anime Details */}
        {!isFocusMode && (
          <AnimeDetailsSection
            anime={anime} resolvedInfo={resolvedInfo} getTitle={getTitle}
            id={id} activeServer={activeServer} streamUrl={streamUrl}
            userRating={userRating} setUserRating={setUserRating}
          />
        )}

        {/* Characters + Comments */}
        {!isFocusMode && (
          <section className="py-16 border-t border-white/5 space-y-20 animate-in fade-in duration-1000">
            <CharactersSection characters={anime.characters} />
            <CustomCommentSection
              animeId={id}
              animeTitle={getTitle(anime.title)}
              episode={activeEpisode}
              relations={relations}
              recommendations={recommendations}
            />
          </section>
        )}

      </main>

      {/* Footer */}
      {!isFocusMode && <Footer />}

      {/* Modals */}
      {showSkipModal && (
        <SkipTimeModal
          activeEpisode={activeEpisode}
          skipTimes={skipTimes}
          onSave={handleSaveSkipTime}
          onClose={() => setShowSkipModal(false)}
        />
      )}

      {/* Report Toast */}
      {reportSuccess && (
        <div className="fixed bottom-10 right-10 z-[100] flex items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl border border-green-500/30 text-white px-6 py-4 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right duration-500">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <span className="text-green-500 text-lg">✓</span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-white leading-tight">Thank You!</p>
            <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest mt-1">Report submitted successfully</p>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          activeEpisode={activeEpisode}
          reportDetails={reportDetails}
          setReportDetails={setReportDetails}
          toggleReportIssue={toggleReportIssue}
          submitReport={submitReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
