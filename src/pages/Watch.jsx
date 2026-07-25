import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getAnimeDetails, getEpisodeTitles, getJikanAnimeDetails } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { useLoading } from "../context/LoadingContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import NextEpisodeBanner from "../components/common/NextEpisodeBanner";
import LoginModal from "../components/auth/LoginModal";
import { useAuth } from "../hooks/useAuth";
import { useWatchlist } from "../hooks/useWatchlist";
import { useWatchProgress } from "../hooks/useWatchProgress";
import { Home as HomeIcon, Info } from "lucide-react";
import { useWatchSEO } from "../hooks/useWatchSEO";
import { usePlayerEvents } from "../hooks/usePlayerEvents";
import { useStreamFetch } from "../hooks/useStreamFetch";
import { useEpisodeList } from "../hooks/useEpisodeList";
import { useAniSkip } from "../hooks/useAniSkip";
import { io } from "socket.io-client";
import { WT_SERVER } from "../services/api";

// Extracted Watch sub-components
import PlayerToolbar from "../components/watch/PlayerToolbar";
import WatchTogetherSidebar from "../components/watch/WatchTogetherSidebar";
import ScheduleRoomModal from "../components/watch/ScheduleRoomModal";
import EpisodeSidebar from "../components/watch/EpisodeSidebar";
import SeasonsSection from "../components/watch/SeasonsSection";
import AnimeDetailsSection from "../components/watch/AnimeDetailsSection";
import CharactersSection from "../components/watch/CharactersSection";
import CustomCommentSection from "../components/watch/CommentSection";
import AnimeCard from "../components/common/AnimeCard";
import Pagination from "../components/common/Pagination";
import ShareBanner from "../components/common/ShareBanner";
import ReportModal from "../components/watch/ReportModal";
import VideoPlayerSection from "../components/watch/VideoPlayerSection";
import { AdBanner300x250 } from "../components/common/AdBanner";
import { AdsterraSmartLinkBanner } from "../components/common/AdsterraSmartLink";
import { useAdsterraSmartLink } from "../hooks/useAdsterraSmartLink";

const getScheduledTime = (minutes) => Date.now() + (minutes * 60000);

export default function Watch({ isWatch2GetherMode }) {
 const { id: paramId } = useParams();
 const { t } = useTranslation();
 const location = useLocation();
 const navigate = useNavigate();
 const [overrideId, setOverrideId] = useState(null);
 const id = isWatch2GetherMode ? overrideId : paramId;

 // Scroll to comment if hash is present
 useEffect(() => {
 const hash = location.hash;
 if (hash) {
 // Wait for comments to render, then scroll
 const timer = setTimeout(() => {
 const element = document.querySelector(hash);
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }
 }, 500);
 return () => clearTimeout(timer);
 }
 }, [location.hash]);
 const { openSmartLink } = useAdsterraSmartLink();
 const queryParams = new URLSearchParams(location.search);
 const isMal = queryParams.get("mal") === "true";
 const initialEp = parseInt(queryParams.get("ep")) || 1;
 const initialTime = parseFloat(queryParams.get("t")) || 0;

 const { getTitle } = useLanguage();
 const { setPageLoading } = useLoading();

 const [activeEpisode, setActiveEpisode] = useState(initialEp);
 const lastOpenedEpisode = useRef(initialEp);
 const [recPage, setRecPage] = useState(1);

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

 // Update URL when episode changes
 useEffect(() => {
 const currentEpParam = queryParams.get("ep");
 if (currentEpParam === activeEpisode.toString()) return; // No change needed

 const newParams = new URLSearchParams(queryParams.toString());
 newParams.set("ep", activeEpisode.toString());
 // Remove time parameter when changing episodes
 newParams.delete("t");
 navigate({
 pathname: location.pathname,
 search: newParams.toString(),
 replace: true, // Use replace so back button behavior
 });

 // Optional: Open smart link every 3 episodes
 if (activeEpisode !== lastOpenedEpisode.current && (activeEpisode - lastOpenedEpisode.current) % 3 === 0) {
 lastOpenedEpisode.current = activeEpisode;
 // You can uncomment the line below to enable
 // openSmartLink();
 }
 }, [activeEpisode, navigate, location.pathname, openSmartLink, location.search]);

 const [episodeLayout, setEpisodeLayout] = useState("grid"); // "grid" | "list"
 const [playerLang, setPlayerLang] = useState("sub");
 const [activeServer, setActiveServer] = useState(1);



 const { user, loading: isAuthLoading, setGlobalProgress, globalSettings, globalProgress } = useAuth();



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

 const [hasSub, setHasSub] = useState(false); // Strict: Hide until verified
 const [hasDub, setHasDub] = useState(false);
 const [isFocusMode, setIsFocusMode] = useState(false);
 const [activeSubServer, setActiveSubServer] = useState(0);
 const [showSubServers, setShowSubServers] = useState(false);

 const [prevEpAndServer, setPrevEpAndServer] = useState({ ep: activeEpisode, server: activeServer });
 if (prevEpAndServer.ep !== activeEpisode || prevEpAndServer.server !== activeServer) {
 setPrevEpAndServer({ ep: activeEpisode, server: activeServer });
 setActiveSubServer(0);
 }

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
 const [reportSuccess, setReportSuccess] = useState(false);
 const [showReportModal, setShowReportModal] = useState(false);
 const [showLoginModal, setShowLoginModal] = useState(false);
 const [showScheduleModal, setShowScheduleModal] = useState(false);
 const [reportDetails, setReportDetails] = useState({
 issues: [],
 other: ""
 });
 const [userRating, setUserRating] = useState(() => getSafeStorage(`rating_${id}`, null));

 // Watch Together State
 const wtSocketRef = useRef(null);
 const videoRef = useRef(null);
 const [wtRoom, setWtRoom] = useState(null);
 const [wtMessages, setWtMessages] = useState([]);
 const [wtTypingUsers, setWtTypingUsers] = useState([]);
 const wtRoomParam = isWatch2GetherMode ? new URLSearchParams(location.search).get("room") : null;

 // AniSkip integration (extracted to custom hook) — called after useQuery below

 // Sync settings to localStorage
 useEffect(() => localStorage.setItem("autoNext", JSON.stringify(autoNext)), [autoNext]);
 useEffect(() => localStorage.setItem("autoPlay", JSON.stringify(autoPlay)), [autoPlay]);


 useEffect(() => {
 if (userRating) {
 localStorage.setItem(`rating_${id}`, JSON.stringify(userRating));
 }
 }, [userRating, id]);






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


 // --- Watch Together Socket Setup ---
 useEffect(() => {
   if (!user) return; // Must be logged in
   const socket = io(WT_SERVER, {
     auth: { token: localStorage.getItem('token'), avatar: user.avatar }
   });
   wtSocketRef.current = socket;

   socket.on('wt_room_update', (data) => {
     setWtRoom(prev => prev ? { ...prev, members: data.members, hostId: data.hostId } : null);
   });

   socket.on('wt_host_transferred', () => {
     setWtRoom(prev => prev ? { ...prev, isHost: true } : null);
   });

   socket.on('wt_room_ended', () => {
     alert("The host has ended this Watch Together session.");
     setWtRoom(null);
     setWtMessages([]);
     navigate(window.location.pathname);
   });

   socket.on('wt_sync_state', (newState) => {
     setWtRoom(prev => prev ? { ...prev, state: newState } : null);
     if (videoRef.current) {
       // Non-host: always force-sync to host's exact time
       const currentTime = videoRef.current.getCurrentTime() || 0;
       if (Math.abs(currentTime - newState.time) > 0.5) {
         videoRef.current.seek(newState.time);
       }
       if (newState.playing) {
         videoRef.current.play();
       } else {
         videoRef.current.pause();
       }
     }
   });

   socket.on('wt_change_episode', (epNum) => {
     setActiveEpisode(epNum);
   });

   socket.on('wt_new_message', (msg) => {
     setWtMessages(prev => [...prev, msg]);
   });

   socket.on('wt_user_typing', (user) => {
     setWtTypingUsers(prev => {
       if (!prev.find(u => u.userId === user.userId)) {
         return [...prev, user];
       }
       return prev;
     });
   });

   socket.on('wt_user_stop_typing', (userId) => {
     setWtTypingUsers(prev => prev.filter(u => u.userId !== userId));
   });

   // If joined via URL
   if (wtRoomParam) {
     socket.on('connect', () => {
       socket.timeout(5000).emit('join_wt_room', wtRoomParam, (err, res) => {
         if (err) {
           alert("Failed to connect to the room. The server took too long to respond.");
         } else if (res.error) {
           alert(res.error);
         } else {
           if (res.animeId) setOverrideId(res.animeId);
           setActiveServer(3);
           setWtRoom({ roomId: wtRoomParam, hostId: res.hostId, members: res.members, state: res.state, isHost: res.isHost });
           if (res.state.episode !== activeEpisode) {
             setActiveEpisode(res.state.episode);
           }
         }
       });
     });
   }

   return () => {
     socket.disconnect();
   };
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, wtRoomParam]);

  const lastEmittedEpisode = useRef(activeEpisode);
  useEffect(() => {
    if (wtRoom?.isHost && wtSocketRef.current?.connected && lastEmittedEpisode.current !== activeEpisode) {
      wtSocketRef.current.emit('wt_change_episode', activeEpisode);
      lastEmittedEpisode.current = activeEpisode;
    }
  }, [activeEpisode, wtRoom?.isHost]);

  const handleCreateWtRoom = () => {
    if (!user) return setShowLoginModal(true);
    if (activeServer !== 3) {
      alert("Watch Together only supports Server 3. Switching you to Server 3.");
      setActiveServer(3);
    }
   
   if (!wtSocketRef.current?.connected) {
     return alert("Connecting to Watch Together Server... Please wait a moment and try again. If this persists, ensure watch2gether-service is running on port 8081.");
   }

   wtSocketRef.current?.timeout(5000).emit('create_wt_room', { 
     animeId: id, 
     episode: activeEpisode,
     animeTitle: getTitle(anime.title),
     animeCover: anime.coverImage?.extraLarge || anime.coverImage?.large
   }, (err, res) => {
     if (err) {
       console.error("Socket emit timeout:", err);
       return alert("Failed to connect to the Watch Together Server. Did you forget to start the watch2gether-service terminal?");
     }
     if (res.error) return alert(res.error);
     navigate(`/watch2gether?room=${res.roomId}`);
   });
 };

  const handleScheduleWtRoom = () => {
    if (!user) return setShowLoginModal(true);
    if (activeServer !== 3) {
      alert("Watch Together only supports Server 3. Switching you to Server 3.");
      setActiveServer(3);
    }
    
    if (!wtSocketRef.current?.connected) {
      return alert("Connecting to Watch Together Server... Please wait a moment and try again.");
    }
    
    setShowScheduleModal(true);
  };

  const confirmScheduleWtRoom = (minutes) => {
    const scheduledFor = getScheduledTime(minutes);

    wtSocketRef.current?.timeout(5000).emit('create_wt_room', { 
      animeId: id, 
      episode: activeEpisode,
      animeTitle: getTitle(anime.title),
      animeCover: anime.coverImage?.extraLarge || anime.coverImage?.large,
      scheduledFor
    }, (err, res) => {
      if (err) return alert("Failed to connect to the Watch Together Server.");
      if (res.error) return alert(res.error);
      alert(`Room scheduled for ${minutes} minutes from now! You can find it in the Scheduled tab.`);
    });
  };

  const handleLeaveWtRoom = () => {
    wtSocketRef.current?.emit('leave_wt_room');
    setWtRoom(null);
    setWtMessages([]);
    navigate(window.location.pathname);
  };

  const handleEndWtRoom = () => {
    if (!wtSocketRef.current?.connected) return;
    if (window.confirm("Are you sure you want to end this room for everyone?")) {
      wtSocketRef.current.emit('end_wt_room');
      setWtRoom(null);
      setWtMessages([]);
      navigate(window.location.pathname);
    }
  };

  const handleWtSyncNow = () => {
   wtSocketRef.current?.emit('get_room_state', (res) => {
     if (res.state && videoRef.current) {
       videoRef.current.seek(res.state.time);
       if (res.state.playing) videoRef.current.play();
       else videoRef.current.pause();
     }
   });
 };

 const handleWtSendMessage = (text) => {
   wtSocketRef.current.emit('wt_chat_message', text);
 };

 const handleWtTypingAction = (isTyping) => {
   if (wtSocketRef.current) {
     wtSocketRef.current.emit(isTyping ? 'wt_typing' : 'wt_stop_typing');
   }
 };

 // VideoPlayer Callbacks for W2G Sync
  const onPlay = () => {
    if (wtRoom && wtRoom.isHost) {
      wtSocketRef.current?.emit('wt_sync_state', { playing: true, time: videoRef.current?.getCurrentTime() || 0 });
    }
  };

  const onPause = () => {
    if (wtRoom && wtRoom.isHost) {
      wtSocketRef.current?.emit('wt_sync_state', { playing: false, time: videoRef.current?.getCurrentTime() || 0 });
    }
  };

  const onSeeked = () => {
    if (wtRoom && wtRoom.isHost) {
      wtSocketRef.current?.emit('wt_sync_state', { playing: wtRoom?.state?.playing || false, time: videoRef.current?.getCurrentTime() || 0 });
    }
  };

  // Periodic host sync - broadcast current time every 3 seconds so members stay perfectly synced
  useEffect(() => {
    if (!wtRoom || !wtRoom.isHost) return;
    const interval = setInterval(() => {
      if (videoRef.current && wtSocketRef.current?.connected) {
        const time = videoRef.current.getCurrentTime() || 0;
        const playing = !videoRef.current.paused;
        wtSocketRef.current.emit('wt_sync_state', { playing, time });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [wtRoom]);

  // Sync episode changes to W2G room
  useEffect(() => {
    if (wtRoom && wtRoom.isHost && wtSocketRef.current?.connected) {
      wtSocketRef.current?.emit('wt_change_episode', activeEpisode);
    }
  }, [activeEpisode, wtRoom]);


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

 // ── Progress tracking (instant save, beforeunload, periodic save) ──
 useWatchProgress({ user, anime, id, activeEpisode, getTitle, globalProgress, setGlobalProgress });

 // ── SEO: meta tags + structured data ──
 useWatchSEO({ anime, activeEpisode, getTitle, id, isMal });

 // MAL Episode Titles (lightweight — only for episode names)
 const { data: malEpisodes } = useQuery({
 queryKey: ["malEpisodes", anime?.idMal],
 queryFn: () => getEpisodeTitles(anime?.idMal),
 enabled: !!anime?.idMal,
 staleTime: 1000 * 60 * 60 * 24,
 });











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

 // SUB/DUB availability defaults
 useEffect(() => {
 setTimeout(() => {
 setHasSub(true);
 setHasDub(true);
 }, 0);
 }, [activeEpisode]);







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
 if (Object.prototype.hasOwnProperty.call(jikanMap, field) && jikanMap[field]) return jikanMap[field];
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




 const {
 episodesList, filteredEpisodes, episodePage, setEpisodePage,
 episodeSearchQuery, setEpisodeSearchQuery, isEpisodeSearchOpen,
 setIsEpisodeSearchOpen, EPISODES_PER_PAGE
 } = useEpisodeList({ anime, malEpisodes, activeEpisode, setActiveEpisode, id });

 // ── Stream fetch: URL, loading, error state ──
 const {
 streamUrl, streamData, streamLoading, fetchError, iframeLoaded, setIframeLoaded
 } = useStreamFetch({
 id, anime, activeEpisode, playerLang, activeServer, autoPlay,
 setPageLoading, isMal, initialTime, activeSubServer,
 });

 const skipTimes = useAniSkip(anime?.idMal, activeEpisode, 0);

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

 const iframeRef = useRef(null);

 // ── Player events: keyboard shortcuts + autoNext on video end ──
 usePlayerEvents({ goNextEpisode, autoNext, globalSettings });







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

 if (isWatch2GetherMode && !user && !isAuthLoading) {
 return (
 <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6">
 <h1 className="text-2xl font-bold mb-4">Login Required</h1>
 <p className="text-white/50 mb-6 text-center max-w-sm">
   You must be logged in to join or create a Watch Together room.
 </p>
  <div className="flex gap-4 items-center">
    <Link 
      to="/" 
      className="px-6 py-3 bg-white/10 hover:bg-white/20 font-bold uppercase tracking-widest rounded-xl transition-all"
    >
      Go Back Home
    </Link>
    <button 
      onClick={() => setShowLoginModal(true)} 
      className="px-6 py-3 bg-discord-600 hover:bg-discord-700 font-bold uppercase tracking-widest rounded-xl transition-all"
    >
      Log In to Join
    </button>
  </div>
  {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
  </div>
 );
 }

 if (isWatch2GetherMode && !id) {
 return (
 <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white">
 <div className="w-10 h-10 border-4 border-discord-600 border-t-transparent flex items-center justify-center rounded-full animate-spin mb-4"></div>
 <p className="text-white/50 text-sm font-bold tracking-widest uppercase">Connecting to Room...</p>
 </div>
 );
 }

 if (isLoading) {
 return (
 <div className="min-h-screen bg-[#111] flex items-center justify-center">
 <div className="w-10 h-10 border-4 border-discord-600 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
 </div>
 );
 }

 if (!anime) {
 return (
 <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 text-center">
 <h1 className="text-2xl font-bold mb-2">{t('watch.animeNotFound')}</h1>
 <p className="text-white/60 text-sm max-w-md">
 We couldn't retrieve the details for this anime (ID: {id}).
 This could be a connectivity issue with the AniList API or an invalid ID.
 </p>
 <Link to="/home" className="mt-8 px-6 py-2 bg-discord-600 hover:bg-discord-700 rounded-full transition-colors text-sm font-bold">
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
 className={`bg-[#121418] border-x border-t border-white/15 px-5 py-3 flex items-center justify-between ${wtRoom ? "pointer-events-none" : ""}`}
 style={{ clipPath: 'polygon(15px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 15px)' }}
 >
 <nav className="flex items-center gap-2 text-[13px] font-medium text-white/60 overflow-x-auto whitespace-nowrap scrollbar-hide">
 <Link to="/home" className={`transition-colors flex items-center gap-1.5 ${wtRoom ? "text-white/60" : "hover:text-white"}`}>
 <HomeIcon size={14} className="mb-0.5" />
 Home
 </Link>
 <span className="text-white/10 font-light">/</span>
 <Link to={wtRoom ? "#" : `/browse?format=${(anime.format || "TV").toUpperCase()}`} className={`uppercase ${wtRoom ? "text-white/60" : "hover:text-white transition-colors cursor-pointer"}`}>{anime.format || "TV"}</Link>
 <span className="text-white/10 font-light">/</span>
 <span className="text-white/70 truncate max-w-[200px] md:max-w-none">{getTitle(anime.title)}</span>
 </nav>
 </div>
 )}



 {/* Video Player Container */}
 <section className={`relative w-full aspect-video bg-[#000] overflow-hidden border-x border-white/15 shadow-2xl transition-all duration-500 ${isFocusMode ? 'max-w-[90vw] max-h-[85vh] pointer-events-auto ring-1 ring-white/10 rounded-sm' : ''}`}>
 <VideoPlayerSection
 anime={anime}
 activeEpisode={activeEpisode}
 malEpisodes={malEpisodes}
 streamLoading={streamLoading}
 streamUrl={streamUrl}
 iframeLoaded={iframeLoaded}
 setIframeLoaded={setIframeLoaded}
 fetchError={fetchError}
 activeServer={activeServer}
 setActiveServer={setActiveServer}
 activeSubServer={activeSubServer}
 streamData={streamData}
 playerLang={playerLang}
 initialTime={initialTime}
 autoNext={autoNext}
 episodesList={episodesList}
 setActiveEpisode={setActiveEpisode}
 iframeRef={iframeRef}
 skipTimes={skipTimes}
 videoRef={videoRef}
 onPlay={onPlay}
 onPause={onPause}
 onSeeked={onSeeked}
 isWatch2GetherMode={!!wtRoom}
 isW2GHost={!!wtRoom?.isHost}
 />
 </section>

 {/* Sub-Server Selector for Server 1 and 3 */}
 {!(wtRoom && !wtRoom.isHost) && (activeServer === 1 || activeServer === 3) && streamData?.all_streams && streamData.all_streams.length > 1 && (
 <div className="bg-[#0a0a0a] border-b border-x border-white/15">
 <button
 onClick={() => setShowSubServers(prev => !prev)}
 className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
 >
 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
 Available Streams ({streamData.all_streams.length})
 </span>
 <svg
 className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${showSubServers ? 'rotate-180' : ''}`}
 fill="none" viewBox="0 0 24 24" stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
 </svg>
 </button>
 {showSubServers && (
 <div className="flex flex-wrap items-center gap-2 px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
 {streamData.all_streams.map((stream, idx) => (
 <button
 key={idx}
 onClick={() => setActiveSubServer(idx)}
 className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${activeSubServer === idx
 ? "bg-discord-600 border-discord-600 text-white "
 : "border-white/10 text-white/50 hover:text-white hover:border-white/20 bg-white/5"
 }`}
 >
 {stream.server || `Stream ${idx + 1}`}
 </button>
 ))}
 </div>
 )}
 </div>
 )}

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
 wtRoom={wtRoom} 
 handleCreateWtRoom={handleCreateWtRoom}
 handleScheduleWtRoom={handleScheduleWtRoom}
 showWatchlistDropdown={showWatchlistDropdown} setShowWatchlistDropdown={setShowWatchlistDropdown}
 backendWatchlist={backendWatchlist} handleUpdateWatchlistStatus={handleUpdateWatchlistStatus}
 id={id} handleReport={handleReport} reportSuccess={reportSuccess} user={user}
 />

 {/* Next Episode Banner */}
 {!isFocusMode && (
 <div className="border-t border-white/15 bg-[#0d0d0d]/50">
 <NextEpisodeBanner anime={anime} />
 </div>
 )}
 </div>

 {/* RIGHT COLUMN: Episodes Sidebar & Watch Together */}
 {!isFocusMode && (
 <div className="lg:col-span-1 flex flex-col gap-6">
   {wtRoom && (
     <WatchTogetherSidebar
       wtRoom={wtRoom}
       wtMessages={wtMessages}
       wtTypingUsers={wtTypingUsers}
       onSendMessage={handleWtSendMessage}
       onTypingAction={handleWtTypingAction}
       onSyncNow={handleWtSyncNow}
       onLeave={handleLeaveWtRoom}
       onEndRoom={handleEndWtRoom}
       userId={user?.id}
     />
   )}
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
     wtRoom={wtRoom}
   />
 </div>
 )}
 </div>

 {/* Seasons */}
 {!isFocusMode && !wtRoom && (
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
 {!isFocusMode && !wtRoom && (
 <section className="py-16 border-t border-white/15 space-y-20 animate-in fade-in duration-1000">
 <CharactersSection characters={anime.characters} />
 <CustomCommentSection
 animeId={id}
 animeTitle={getTitle(anime.title)}
 episode={activeEpisode}
 relations={relations}
 recommendations={recommendations}
 />

 {/* Ad Banner */}
 <div className="flex justify-center py-4">
 <AdsterraSmartLinkBanner />
 </div>
 <div className="flex justify-center py-4">
 <AdBanner300x250 />
 </div>

 {/* Recommendations Section */}
 {recommendations && recommendations.length > 0 && (
 <div className="mt-16 pt-8 border-t border-white/15">
 <h3 className="text-xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
 <span className="w-1 h-6 bg-discord-600 rounded-full inline-block"></span>
 {t('watch.recommendations', 'You May Also Like')}
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
 {recommendations.slice((recPage - 1) * 12, recPage * 12).map((recAnime) => (
 <AnimeCard key={recAnime.id} anime={recAnime} />
 ))}
 </div>
 {recommendations.length > 12 && (
 <Pagination
 currentPage={recPage}
 totalPages={Math.ceil(recommendations.length / 12)}
 onPageChange={setRecPage}
 />
 )}
 </div>
 )}
 </section>
 )}

 </main>

 {/* Footer */}
 {!isFocusMode && <Footer />}


 {/* Report Toast */}
 {reportSuccess && (
 <div className="fixed bottom-10 right-10 z-[100] flex items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl border border-green-500/30 text-white px-6 py-4 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right duration-500">
 <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
 <span className="text-green-500 text-lg">✓</span>
 </div>
 <div>
 <p className="text-[14px] font-bold text-white leading-tight">{t('watch.thankYou')}</p>
 <p className="text-[11px] text-white/50 font-medium uppercase tracking-widest mt-1">{t('watch.reportSuccess')}</p>
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

 {/* Schedule Room Modal */}
 <ScheduleRoomModal 
   isOpen={showScheduleModal}
   onClose={() => setShowScheduleModal(false)}
   onSchedule={confirmScheduleWtRoom}
 />

 {/* Login Modal */}
 <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
 </div>
 );
}
