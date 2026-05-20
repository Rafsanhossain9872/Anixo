import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Link } from "react-router-dom";

export default function AnimeCard({ anime }) {
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
      {
        rootMargin: "100px", // Load slightly before it enters the screen
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  if (!anime) return null;

  // Logic for accurate episode progress: released / total
  const totalEpisodes = anime.episodes || "?";
  let releasedEpisodes = 0;

  // IMPROVED LOGIC: Even if status is missing, if nextAiringEpisode exists, it's RELEASING
  const isReleasing = anime.status === "RELEASING" || !!anime.nextAiringEpisode;

  if (isReleasing) {
    if (anime.nextAiringEpisode) {
      // For airing anime, released is (next episode - 1)
      releasedEpisodes = Math.max(0, anime.nextAiringEpisode.episode - 1);
    } else {
      // If we don't have airing info (AniList down), show ? to avoid lying
      releasedEpisodes = "?";
    }
  } else {
    // For finished or not yet released, use the total episodes field
    releasedEpisodes = anime.episodes || 0;
  }

  const showTotal = totalEpisodes !== "?";
  const format = anime.format || "TV";

  const queryParams = new URLSearchParams();
  if (anime.isMAL) queryParams.set("mal", "true");
  if (anime.isProgress) {
    queryParams.set("ep", anime.episode || 1);
    if (anime.currentTime) queryParams.set("t", anime.currentTime);
  }
  const queryString = queryParams.toString();
  const cardUrl = `/watch/${anime.id}${queryString ? `?${queryString}` : ""}`;

  return (
    <Link
      to={cardUrl}
      ref={cardRef}
      className={`w-full cursor-pointer group flex flex-col transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} no-underline`}
      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', color: 'inherit', textDecoration: 'none' }}
      draggable={false}
    >
      {/* Poster image area */}
      <div className="relative">
        {/* format Tag (e.g. TV, MOVIE) */}
        {!anime.isProgress && (
          <div className="absolute -top-1 left-0 flex flex-col items-start z-40 gap-1">
            <div className="bg-red-600 text-white text-[9px] font-black px-1.5 py-[3px] flex items-center justify-center min-w-[28px]">
              {format}
            </div>
          </div>
        )}

        {/* 18+ Badge */}
        {(anime.isAdult || anime.ageRating === "R" || anime.rating?.includes("18")) && (
          <div className="absolute top-1.5 right-1.5 z-40 bg-red-600/90 text-white text-[10px] font-black px-1.5 py-[2px] rounded-[4px] shadow-lg flex items-center justify-center border border-white/10 tracking-widest">
            18+
          </div>
        )}

        {/* Poster Container */}
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl bg-[#181818] border border-white/5 shadow-lg group-hover:shadow-2xl transition-[transform,shadow] duration-500 group-hover:-translate-y-1" style={{ transform: 'translateZ(0)' }}>
          {isVisible && !imgError ? (
            <img
              src={anime.coverImage?.extraLarge || anime.coverImage?.large}
              alt={getTitle(anime.title)}
              loading="lazy"
              onError={() => setImgError(true)}
              onLoad={(e) => e.target.classList.remove("opacity-0")}
              className="w-full h-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:scale-105"
            />
          ) : !isVisible ? (
            <div className="w-full h-full bg-[#111] animate-pulse" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#111] text-white/10 p-4 text-center">
              <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Missing Cover</span>
            </div>
          )}

          {/* Smart Timeline Bar for Continue Watching */}
          {anime.isProgress && (
            <>
               {/* Tiny Timestamp (Fixed positioning) */}
               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5 z-50">
                 <span className="text-[8.5px] font-bold text-white/90 whitespace-nowrap tracking-tighter">
                   {Math.floor(anime.currentTime / 60)}:{String(Math.floor(anime.currentTime % 60)).padStart(2, '0')} / {anime.duration ? Math.floor(anime.duration / 60) : '24'}:00
                 </span>
               </div>

               <div className="absolute bottom-0 left-0 w-full z-50">
                 {/* Glowing Timeline Bar */}
                 <div className="w-full h-1 bg-white/10 relative overflow-hidden">
                   <div 
                     className="h-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,1)] transition-all duration-500 ease-out" 
                     style={{ 
                       width: `${anime.duration ? Math.min(100, (anime.currentTime / anime.duration) * 100) : Math.min(100, (anime.currentTime / 1440) * 100)}%` 
                     }}
                   />
                 </div>
               </div>
            </>
          )}

          {/* Hover Play Icon Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-40 pointer-events-none">
            <div className="bg-white text-black p-3 rounded-2xl scale-75 group-hover:scale-100 transition-transform duration-500 shadow-2xl">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* EP Badge (Universal style for both types) */}
        <div className="flex justify-center -mt-[14px] relative z-40">
          <div className="flex items-stretch bg-[#0a0a0a] rounded-[4px] border border-white/10 overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
            {anime.status === "NOT_YET_RELEASED" ? (
              <span className="text-[9px] font-black bg-[#222] text-white/50 px-3 py-1 uppercase tracking-tighter flex items-center justify-center">
                Not Yet Released
              </span>
            ) : (
              <>
                <span className="text-[9px] font-black bg-red-600 text-white px-2 uppercase tracking-tighter flex items-center justify-center">EP</span>
                <div className="px-2 py-1 flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-white">
                    {anime.isProgress ? anime.episode : (releasedEpisodes || "0")}
                  </span>
                  {!anime.isProgress && showTotal && (
                    <span className="text-[10px] font-bold text-white/30">/ {totalEpisodes}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Section - Identical for all cards */}
      <div className="w-full mt-3 text-center px-1">
        <h3 className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-tight uppercase tracking-tight">
          {getTitle(anime.title)}
        </h3>
      </div>
    </Link>
  );
}
