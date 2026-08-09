import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from "../../context/LanguageContext";
import { getWatchUrl } from "../../utils/url";
import { Play } from "lucide-react";

export default function GlobalHoverManager() {
  const [hoverData, setHoverData] = useState({ anime: null, rect: null });
  const [isHovered, setIsHovered] = useState(false);
  const hoverRef = useRef(null);
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let hideTimeout;

    const handleShow = (e) => {
      clearTimeout(hideTimeout);
      setHoverData(e.detail);
      setIsHovered(true);
    };

    const handleHide = () => {
      hideTimeout = setTimeout(() => {
        setIsHovered(false);
        setTimeout(() => setHoverData({ anime: null, rect: null }), 200); // Wait for transition
      }, 100);
    };

    window.addEventListener('show-anime-hover', handleShow);
    window.addEventListener('hide-anime-hover', handleHide);

    return () => {
      window.removeEventListener('show-anime-hover', handleShow);
      window.removeEventListener('hide-anime-hover', handleHide);
      clearTimeout(hideTimeout);
    };
  }, []);

  if (!hoverData.anime || !hoverData.rect) return null;

  const { anime, rect } = hoverData;
  const title = getTitle(anime.title);
  
  // Calculate position logic to prevent overflow
  const isRightSide = rect.right + 320 > window.innerWidth;
  const isBottomSide = rect.top + 400 > window.innerHeight;

  const style = {
    position: 'fixed',
    top: isBottomSide ? Math.max(10, rect.bottom - 400) : rect.top,
    left: isRightSide ? rect.left - 330 : rect.right + 10,
    zIndex: 9999,
  };

  const statusColor = anime.status === "RELEASING" ? "text-accent" : "text-white";

  return (
    <div 
      ref={hoverRef}
      style={style}
      onMouseEnter={() => {
        setIsHovered(true);
        window.dispatchEvent(new CustomEvent('show-anime-hover', { detail: hoverData }));
      }}
      onMouseLeave={() => window.dispatchEvent(new CustomEvent('hide-anime-hover'))}
      className={`w-[320px] bg-bg/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl p-5 font-senpai transition-all duration-200 pointer-events-auto ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-white text-lg font-bold leading-tight">{title}</h2>
        {anime.averageScore && (
          <div className="flex items-center gap-1 bg-surfaceHover px-1.5 py-0.5 rounded text-primary font-bold text-xs">
            ★ {anime.averageScore}
          </div>
        )}
      </div>
      
      {anime.title?.native && (
        <div className="text-textMuted text-xs mb-3 italic">{anime.title.native}</div>
      )}

      {/* Tags Line 1 */}
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold">
        <span className="bg-primary text-black px-1.5 py-0.5 rounded uppercase tracking-wider">HD</span>
        <span className="bg-white/10 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">{anime.format || "TV"}</span>
        <span className="text-textMuted">EP {anime.episodes || "?"}</span>
      </div>

      {/* Quoted Synopsis */}
      {anime.description && (
        <div className="text-textMuted text-[11px] leading-relaxed line-clamp-4 pl-3 border-l-2 border-border mb-4 italic" dangerouslySetInnerHTML={{ __html: anime.description }} />
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-y-1 text-xs mb-4">
        <div className="text-textMuted">Status: <span className={`font-bold ${statusColor}`}>{anime.status || "UNKNOWN"}</span></div>
        <div className="text-textMuted">Aired: <span className="text-white">{anime.seasonYear || anime.startDate?.year || "?"}</span></div>
      </div>

      {/* Genres Pills */}
      {anime.genres && anime.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {anime.genres.slice(0, 4).map(g => (
            <span key={g} className="text-[10px] text-textMuted border border-white/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              {g}
            </span>
          ))}
          {anime.genres.length > 4 && <span className="text-[10px] text-textMuted border border-white/10 px-2 py-0.5 rounded-full">+{anime.genres.length - 4}</span>}
        </div>
      )}

      {/* Watch Now Button */}
      <button 
        onClick={() => {
          setIsHovered(false);
          navigate(getWatchUrl(anime.id, anime.title));
        }}
        className="w-full bg-white text-black font-bold py-2.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
      >
        <Play size={16} fill="currentColor" />
        WATCH NOW
      </button>
    </div>
  );
}
