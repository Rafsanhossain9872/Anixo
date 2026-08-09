import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Bookmark, ChevronLeft, ChevronRight, Info, VolumeX, Volume2 } from "lucide-react";
import { useUserList } from "../../context/UserListContext";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";
import { optimizeImage } from "../../utils/image";
import { getWatchUrl } from "../../utils/url";
import { fetchAnimeLogo } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useRef } from "react";

const HeroTrailer = ({ trailerId, isMuted, setIsMuted, onPlay, onEnded, onError, activePlayerRef, ytReady }) => {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!ytReady || !window.YT || !window.YT.Player) return;

    const playerId = `youtube-player-${trailerId}`;
    
    playerRef.current = new window.YT.Player(playerId, {
      height: '100%',
      width: '100%',
      videoId: trailerId,
      playerVars: {
        autoplay: 1,
        mute: isMuted ? 1 : 0,
        controls: 0,
        showinfo: 0,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        disablekb: 1,
        loop: 1,
        playlist: trailerId,
        origin: typeof window !== 'undefined' ? window.location.origin : ''
      },
      events: {
        onReady: (event) => {
          if (activePlayerRef) {
            activePlayerRef.current = event.target;
          }
          if (!isMuted && typeof event.target.setVolume === 'function') {
            event.target.setVolume(100);
          }
        },
        onStateChange: (event) => {
          if (event.data === 1) { // YT.PlayerState.PLAYING
            onPlay();
          } else if (event.data === 0) { // YT.PlayerState.ENDED
            if (onEnded) onEnded();
          }
        },
        onError: (event) => {
          onError();
        }
      }
    });

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, [trailerId, ytReady]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div id={`youtube-player-${trailerId}`} className="absolute top-1/2 left-1/2 w-[300vw] h-[300vh] md:w-[150vw] md:h-[150vh] -translate-x-1/2 -translate-y-1/2 opacity-70" />
    </div>
  );
};

export default function Hero({ data = [], isLoading }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const muteBtnRef = useRef(null);
  const [videoState, setVideoState] = useState({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [logos, setLogos] = useState({});
  const [ytReady, setYtReady] = useState(false);
  const activePlayerRef = useRef(null);

  // Bind native event listener to the mute button to bypass React's synthetic event
  // and preserve browser's user-gesture token for autoplay policies.
  // Also bypasses YouTube widgetapi.js entirely by sending raw postMessage.
  useEffect(() => {
    const btn = muteBtnRef.current;
    if (!btn) return;

    const handleMuteToggle = () => {
      const player = activePlayerRef.current;
      if (!player) return;
      
      const iframe = typeof player.getIframe === 'function' ? player.getIframe() : null;
      if (!iframe || !iframe.contentWindow) return;

      const newMuted = !isMuted;
      
      if (!newMuted) {
        console.log("Native unmute triggered via postMessage");
        iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":[]}', '*');
        iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":[]}', '*');
        setIsMuted(false);
      } else {
        console.log("Native mute triggered via postMessage");
        iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":[]}', '*');
        setIsMuted(true);
      }
    };

    btn.addEventListener('click', handleMuteToggle);
    return () => btn.removeEventListener('click', handleMuteToggle);
  }, [currentIndex, isMuted]);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtReady(true);
      return;
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    window.onYouTubeIframeAPIReady = () => {
      setYtReady(true);
    };
  }, []);
  const { list, addToList } = useUserList();
  const { user, triggerAuthToast } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const lang = language === "JP" ? "ja" : "en";

  const displayData = data?.slice(0, 10) || [];
  const timerRef = useRef(null);

  const advanceSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % displayData.length);
  };

  const startFallbackTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advanceSlide, 8000);
  };

  useEffect(() => {
    if (displayData.length === 0) return;
    
    // Initial start
    startFallbackTimer();
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, displayData.length]);

  const handlePlay = (id) => {
    setVideoState(prev => ({ ...prev, [id]: 'playing' }));
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // Fetch logos for all hero items
    displayData.forEach(async (anime) => {
      // Create a unique key for the state to force update if language changes
      const logoKey = `${anime.id}_${lang}`;
      if (!logos[logoKey]) {
        const title = lang === "ja" ? (anime.title?.romaji || anime.title?.native) : (anime.title?.english || anime.title?.romaji);
        const logo = await fetchAnimeLogo(anime.id, title, lang);
        if (logo) {
          setLogos(prev => ({ ...prev, [logoKey]: logo }));
        }
      }
    });
  }, [displayData, lang]);

  if (isLoading || displayData.length === 0) {
    return (
      <div className="relative w-full h-[600px] bg-bg overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-surface/50" />
      </div>
    );
  }

  const handleWatchLater = (anime) => {
    if (!user) {
      triggerAuthToast("Sign in to manage your watchlist");
      setShowLoginModal(true);
      return;
    }
    const exists = list.find(item => item.animeId === String(anime.id));
    if (!exists) {
      addToList({
        animeId: String(anime.id),
        title: anime.title?.english || anime.title?.romaji,
        coverImage: anime.coverImage?.large,
        status: "PLANNING",
        totalEpisodes: anime.episodes
      });
    }
  };

  return (
    <div className="relative w-full h-[550px] md:h-[650px] overflow-hidden bg-bg group select-none font-sans">
      {displayData.map((anime, i) => {
        const isFirst = i === 0;
        const isActive = i === currentIndex;
        
        const title = lang === "ja" ? (anime.title?.romaji || anime.title?.native) : (anime.title?.english || anime.title?.romaji);
        const watchUrl = getWatchUrl(anime.id, anime.title);
        const logoKey = `${anime.id}_${lang}`;

        return (
          <div
            key={anime.id}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          >
            {/* Cinematic Blurred Background or Trailer */}
            <div className="absolute inset-0 overflow-hidden bg-[#09090b]">
              <img
                src={optimizeImage(anime.bannerImage || anime.coverImage?.extraLarge, 1920)}
                alt={title}
                fetchPriority={isFirst ? "high" : "auto"}
                loading={isFirst ? "eager" : "lazy"}
                decoding="async"
                onError={(e) => {
                  if (!e || (!e.target && !e.currentTarget)) return;
                  const target = e.currentTarget || e.target;
                  const fallback = anime.coverImage?.extraLarge;
                  if (fallback && target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
                className={`absolute inset-0 w-full h-full object-cover object-[center_20%] md:object-center pointer-events-none transition-opacity duration-1000 ${isActive && anime.trailer?.site === "youtube" && videoState[anime.id] === 'playing' ? 'opacity-0' : 'opacity-80'}`}
              />
              {isActive && anime.trailer?.site === "youtube" && videoState[anime.id] !== 'error' && (
                <HeroTrailer 
                  trailerId={anime.trailer.id} 
                  isMuted={isMuted} 
                  setIsMuted={setIsMuted}
                  activePlayerRef={activePlayerRef}
                  ytReady={ytReady}
                  onPlay={() => handlePlay(anime.id)}
                  onEnded={advanceSlide}
                  onError={() => setVideoState(prev => ({ ...prev, [anime.id]: 'error' }))}
                />
              )}
              {/* Bottom Fade to blend into page */}
              <div className="absolute bottom-0 left-0 w-full h-[50%] bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent pointer-events-none" />
              {/* Left Fade for text readability */}
              <div className="absolute top-0 left-0 w-[80%] md:w-[60%] h-full bg-gradient-to-r from-[#09090b]/90 via-[#09090b]/40 to-transparent pointer-events-none" />
            </div>

            {/* Content Container */}
            <div className="relative h-full container max-w-[1600px] px-6 md:px-12 flex flex-col justify-end pb-20 md:justify-center md:pb-0 z-20 pointer-events-none">
              <div className={`w-full md:max-w-[800px] flex flex-col items-start text-left transition-all duration-700 delay-100 ${isActive ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} pointer-events-auto`}>
                
                {/* Featured Spotlight Tag */}
                <div className="mb-4">
                  <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-widest font-senpai shadow-lg backdrop-blur-md">
                    Featured Spotlight
                  </span>
                </div>

                {/* Anime Title or Logo */}
                {logos[logoKey] ? (
                  <img 
                    src={logos[logoKey]} 
                    alt={title} 
                    className="max-h-[140px] md:max-h-[180px] w-auto object-contain mb-6 drop-shadow-2xl"
                    loading="lazy"
                  />
                ) : (
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-tight mb-4 drop-shadow-2xl line-clamp-2">
                    {title}
                  </h2>
                )}

                {/* Meta Information (Senpaiflix Monospace) */}
                <div className="flex flex-wrap items-center gap-3 mb-6 font-senpai text-xs font-semibold text-textMuted uppercase tracking-wider">
                  <span className="bg-white text-black px-1.5 py-0.5 rounded-sm">HD</span>
                  <span className="border border-border px-2 py-0.5 rounded-sm">{anime.format || "TV"}</span>
                  <span className="border border-border px-2 py-0.5 rounded-sm text-accent">{anime.status || "UNKNOWN"}</span>
                  <span>{anime.seasonYear || "?"}</span>
                  {anime.episodes && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{anime.episodes} EPS</span>
                    </>
                  )}
                </div>

                {/* Synopsis */}
                <p className="text-sm md:text-base text-white/70 line-clamp-3 mb-8 max-w-[600px] leading-relaxed font-senpai">
                  {anime.description?.replace(/<[^>]*>?/gm, '') || "No description available."}
                </p>

                {/* Call to Action Buttons */}
                <div className="flex items-center gap-4 w-full md:w-auto relative z-30">
                  <Link 
                    to={watchUrl} 
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-black text-sm font-black uppercase tracking-widest rounded hover:bg-white hover:text-black transition-colors"
                  >
                    <Play size={18} fill="currentColor" />
                    Watch Now
                  </Link>

                  <Link 
                    to={`/anime/${anime.id}`}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-white/20 text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <Info size={18} />
                    Details
                  </Link>
                </div>
              </div>

              {/* Mute Button positioned to align with Watch buttons on large screens */}
              <div className="absolute right-6 md:right-12 bottom-20 md:bottom-32 z-30 pointer-events-auto">
                <button
                  ref={isActive ? muteBtnRef : null}
                  className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-all backdrop-blur-md"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Horizontal Slider Pagination Dots */}
      <div className="absolute bottom-6 left-0 right-0 z-50 flex items-center justify-center gap-2">
        {displayData.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`transition-all duration-300 rounded-full ${
              currentIndex === i ? "w-6 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={() => setCurrentIndex((prev) => (prev === 0 ? displayData.length - 1 : prev - 1))}
        className="absolute top-1/2 left-4 md:left-8 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#09090b]/80 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-40"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={24} />
      </button>

      <button 
        onClick={() => setCurrentIndex((prev) => (prev === displayData.length - 1 ? 0 : prev + 1))}
        className="absolute top-1/2 right-4 md:right-8 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#09090b]/80 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-40"
        aria-label="Next Slide"
      >
        <ChevronRight size={24} />
      </button>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
