import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { optimizeImage } from "../../utils/image";
import { getWatchUrl } from "../../utils/url";
import { Calendar, MessageSquare, Star } from "lucide-react";

export default function SidebarListCard({ anime }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const { getTitle } = useLanguage();

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

  if (!anime) return null;

  return (
    <Link
      to={getWatchUrl(anime.id, anime.title)}
      ref={cardRef}
      className={`group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] p-2.5 rounded-xl border border-white/[0.05] transition-colors duration-300 overflow-hidden min-w-0 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Poster */}
      <div className="relative w-[60px] h-[84px] overflow-hidden rounded-[8px] bg-[#111] shrink-0">
        {isVisible && !imgError ? (
          <img
            src={optimizeImage(anime.coverImage?.large, 200)}
            alt={getTitle(anime.title)}
            loading="lazy"
            onError={() => setImgError(true)}
            onLoad={(e) => e.target.classList.remove("opacity-0")}
            className="w-full h-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:scale-110"
          />
        ) : !isVisible ? (
          <div className="w-full h-full bg-[#111] animate-pulse" />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0 mt-[7px]" />
          <h4 className="text-[14px] font-bold text-white group-hover:text-discord-400 transition-colors leading-snug truncate">
            {getTitle(anime.title)}
          </h4>
        </div>
        
        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-white/50 pl-3">
          <span>{anime.format || "TV"}</span>
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-white/40" />
            {anime.seasonYear || anime.startDate?.year || "2026"}
          </span>
          {anime.episodes && (
             <span className="flex items-center gap-1">
               <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="2" y="2" width="20" height="15" rx="2" ry="2" />
                 <path d="M17 2v15" />
                 <path d="M7 2v15" />
                 <path d="M2 7h20" />
                 <path d="M2 12h20" />
                 <path d="M8 22h8" />
                 <path d="M12 17v5" />
               </svg>
               {anime.episodes}
             </span>
          )}
        </div>
      </div>
    </Link>
  );
}
