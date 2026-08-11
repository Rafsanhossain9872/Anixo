import React, { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { optimizeImage } from "../../utils/image";
import { getWatchUrl } from "../../utils/url";
import { Plus } from "lucide-react";
import SaveAsPopOver from "./SaveAsPopOver";

const AnimeCard = memo(({ anime }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const cardRef = useRef(null);
  const { getTitle } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "200px" } // Load slightly before entering viewport
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  if (!anime) return null;

  const title = getTitle(anime.title);
  const format = anime.format || "TV";
  
  // Format watch URL
  const queryParams = new URLSearchParams();
  if (anime.isMAL) queryParams.set("mal", "true");
  if (anime.isProgress) {
    queryParams.set("ep", anime.episode || 1);
    if (anime.currentTime) queryParams.set("t", anime.currentTime);
  }
  const queryString = queryParams.toString();
  const cardUrl = `${getWatchUrl(anime.id, anime.title)}${queryString ? `?${queryString}` : ""}`;

  // Hover Events for GlobalHoverManager
  let hoverTimeout;
  const handlePointerEnter = (e) => {
    // Completely disable hover card on touch/mobile devices
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (window.innerWidth < 768) return; // Strict guard for mobile screens
    if (window.matchMedia('(hover: none)').matches) return; // Fallback CSS check

    const rect = cardRef.current.getBoundingClientRect();
    hoverTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('show-anime-hover', { 
        detail: { anime, rect } 
      }));
    }, 400); // 400ms delay to prevent accidental hovers
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    clearTimeout(hoverTimeout);
    window.dispatchEvent(new CustomEvent('hide-anime-hover'));
  };

  return (
    <div 
      ref={cardRef} 
      className="relative flex flex-col w-full group"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Poster Container */}
      <Link 
        to={cardUrl}
        className="relative w-full aspect-[2/3] overflow-hidden rounded-md bg-surface block cursor-pointer transition-transform duration-300"
      >
        {isVisible && !imgError ? (
          <img
            src={optimizeImage(anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium, 300)}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full animate-shimmer" />
        )}
        
        {/* Format Tag (Top Left) */}
        <div className="absolute top-2 left-2 z-10 bg-bg/80 backdrop-blur-md text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-white/5 uppercase font-senpai">
          {format}
        </div>
      </Link>

      {/* Quick Add Button (Top Right) - Extracted from Link to prevent navigation */}
      <div className="absolute top-2 right-2 z-20">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSaveMenu(!showSaveMenu);
          }}
          className="w-6 h-6 rounded flex items-center justify-center bg-bg/80 backdrop-blur-md text-white hover:bg-primary hover:text-black border border-white/10 transition-colors shadow-sm"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
        
        {/* Save As Menu Popover */}
        {showSaveMenu && (
          <SaveAsPopOver 
            animeId={anime.id} 
            onClose={() => setShowSaveMenu(false)} 
          />
        )}
      </div>

      {/* Title Below Poster (Senpaiflix Style) */}
      <div className="mt-2 text-left">
        <Link to={cardUrl}>
          <h3 className="text-white text-xs font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors font-senpai">
            {title}
          </h3>
        </Link>
      </div>
    </div>
  );
});

AnimeCard.displayName = "AnimeCard";
export default AnimeCard;
