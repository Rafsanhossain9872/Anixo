import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Link } from "react-router-dom";
import { optimizeImage } from "../../utils/image";
import { getWatchUrl } from "../../utils/url";

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
 const baseUrl = getWatchUrl(anime.id, anime.title);
 const cardUrl = `${baseUrl}${queryString ? `?${queryString}` : ""}`;

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
 <div className="absolute -top-1 left-0 flex flex-col items-start z-40 gap-1">
 <div className="bg-discord-600 text-white text-[9px] font-black px-1.5 py-[3px] flex items-center justify-center min-w-[28px]">
 {format}
 </div>
 </div>

 {/* 18+ Badge */}
 {(anime.isAdult || anime.ageRating === "R" || anime.rating?.includes("18")) && (
 <div className="absolute top-1.5 right-1.5 z-40 bg-[#ff2a5f] text-white text-[10px] font-black px-1.5 py-[2px] rounded-[4px] shadow-lg flex items-center justify-center tracking-widest">
 18+
 </div>
 )}

 {/* Poster Container */}
 <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 shadow-lg group-hover:shadow-2xl transition-[transform,shadow] duration-500 group-hover:-translate-y-1" style={{ backgroundColor: anime.color || '#181818', transform: 'translateZ(0)' }}>
 {isVisible && !imgError ? (
 <img
 src={optimizeImage(anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium, 300)}
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
 <div className="absolute bottom-0 left-0 w-full z-50">
 {/* Glowing Timeline Bar */}
 <div className="w-full h-1 bg-white/10 relative overflow-hidden">
 <div 
 className="h-full bg-discord-600 transition-all duration-500 ease-out" 
 style={{ 
 width: `${anime.duration ? Math.min(100, (anime.currentTime / anime.duration) * 100) : Math.min(100, (anime.currentTime / 1440) * 100)}%` 
 }}
 />
 </div>
 </div>
 )}

 {/* Hover Play Icon Overlay */}
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-40 pointer-events-none">
 <div className="text-white scale-75 group-hover:scale-100 transition-transform duration-500 drop-shadow-2xl">
 <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
 <path d="M8 5v14l11-7z" />
 </svg>
 </div>
 </div>
 </div>
 </div>

 {/* Info Section - Miruro Style */}
 <div className="w-full mt-3 text-left">
   <div className="flex items-start gap-2">
     <div className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0 mt-[6px]" />
     <h3 className="text-[14px] font-bold text-white group-hover:text-discord-400 transition-colors line-clamp-2 leading-snug">
       {getTitle(anime.title)}
     </h3>
   </div>
   
   <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-white/50 pl-4">
     <span>{anime.format || "TV"}</span>
     <span>{anime.seasonYear || anime.startDate?.year || "?"}</span>
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
     {anime.averageScore && (
       <span className="flex items-center gap-1">
         <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="currentColor">
           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
         </svg>
         {anime.averageScore}
       </span>
     )}
   </div>
 </div>
 </Link>
 );
}
