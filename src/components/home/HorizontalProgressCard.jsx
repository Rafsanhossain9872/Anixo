import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Link } from "react-router-dom";
import { optimizeImage } from "../../utils/image";
import { getWatchUrl } from "../../utils/url";
import { getAnimeDetails } from "../../services/api";

export default function HorizontalProgressCard({ anime: progressItem }) {
  const [animeData, setAnimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const { getTitle } = useLanguage();

  useEffect(() => {
    async function fetchData() {
      try {
        let data;
        if (progressItem.anilistId) {
          data = await getAnimeDetails(progressItem.anilistId);
        } else if (progressItem.id || progressItem.animeId) {
          const id = progressItem.id || progressItem.animeId;
          const isNumeric = !isNaN(Number(id));
          data = await getAnimeDetails(id, !isNumeric);
        }
        setAnimeData(data);
      } catch (err) {
        console.error('Failed to fetch anime details for progress:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [progressItem.id, progressItem.animeId, progressItem.anilistId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "100px" }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col pointer-events-none">
        <div className="relative w-full aspect-[16/9] rounded-[6px] overflow-hidden bg-[#2a2a2a] animate-shimmer shadow-lg" />
        <div className="w-full mt-3 px-1 space-y-2">
          <div className="h-[14px] bg-[#2a2a2a] rounded-[4px] animate-shimmer w-full" />
        </div>
      </div>
    );
  }

  // Resolve image URL from multiple possible shapes (object or string)
  const resolveImage = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.extraLarge || img.large || img.medium || null;
  };

  const fallbackCover = resolveImage(progressItem.coverImage) || resolveImage(progressItem.image) || progressItem.poster || '/fallback-image.png';

  const anime = {
    ...(animeData || {
      id: progressItem.id || progressItem.animeId,
      title: progressItem.title || { english: progressItem.title },
      coverImage: { large: fallbackCover, extraLarge: fallbackCover },
      bannerImage: progressItem.bannerImage,
    }),
    episode: progressItem.episode,
    currentTime: progressItem.currentTime,
    duration: progressItem.duration,
    isProgress: true,
  };

  const queryParams = new URLSearchParams();
  if (anime.isMAL) queryParams.set("mal", "true");
  queryParams.set("ep", anime.episode || 1);
  if (anime.currentTime) queryParams.set("t", anime.currentTime);
  
  const queryString = queryParams.toString();
  const baseUrl = getWatchUrl(anime.id, anime.title);
  const cardUrl = `${baseUrl}${queryString ? `?${queryString}` : ""}`;

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds) return "00:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Link
      to={cardUrl}
      ref={cardRef}
      className={`w-full cursor-pointer group flex flex-col transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} no-underline`}
      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      draggable={false}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-[8px] bg-[#111]">
        {isVisible && !imgError ? (
          <img
            src={optimizeImage(anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large, 600)}
            alt={getTitle(anime.title)}
            loading="lazy"
            onError={() => setImgError(true)}
            onLoad={(e) => e.target.classList.remove("opacity-0")}
            className="w-full h-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:scale-105"
          />
        ) : !isVisible ? (
          <div className="w-full h-full bg-[#111] animate-pulse" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111] text-white/10 p-4">
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Missing Cover</span>
          </div>
        )}

        {/* EP Badge - Bottom Left */}
        <div className="absolute bottom-1.5 left-1.5 z-40 bg-black/80 text-white text-[11px] font-black px-2 py-0.5 rounded-[4px] shadow-lg flex items-center justify-center tracking-widest backdrop-blur-sm border border-white/10">
          EP {anime.episode || "1"}
        </div>

        {/* Duration - Bottom Right */}
        <div className="absolute bottom-1.5 right-1.5 z-40 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-[4px] shadow-lg flex items-center justify-center tracking-widest backdrop-blur-sm border border-white/10">
          {formatTime(anime.currentTime)}<span className="text-white/50 mx-0.5">/</span>{formatTime(anime.duration || 1440)}
        </div>

        {/* Glowing Timeline Bar */}
        <div className="absolute bottom-0 left-0 w-full z-50 h-[3px] bg-white/20">
          <div 
            className="h-full bg-discord-500 transition-all duration-500 ease-out" 
            style={{ 
              width: `${anime.duration ? Math.min(100, (anime.currentTime / anime.duration) * 100) : Math.min(100, (anime.currentTime / 1440) * 100)}%` 
            }}
          />
        </div>

        {/* Hover Play Icon Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-white scale-75 group-hover:scale-100 transition-transform duration-500 drop-shadow-2xl">
            <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="w-full mt-2.5 px-1">
        <h3 className="text-[13px] font-bold text-white/90 group-hover:text-discord-400 transition-colors line-clamp-1 leading-snug">
          {getTitle(anime.title)}
        </h3>
      </div>
    </Link>
  );
}
