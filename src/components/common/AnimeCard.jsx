import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Link } from "react-router-dom";
import { ImageOff, Play } from "lucide-react";
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

        const node = cardRef.current;
        if (node) {
            observer.observe(node);
        }

        return () => {
            if (node) observer.unobserve(node);
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
                <div className="absolute top-2 left-2 z-40">
                    <div className="bg-black/70 text-white/85 text-[9px] font-semibold px-1.5 py-1 rounded-[3px] border border-white/10 backdrop-blur-sm uppercase leading-none">
                        {format}
                    </div>
                </div>

                {(anime.isAdult || anime.ageRating === "R" || anime.rating?.includes("18")) && (
                    <div className="absolute top-2 right-2 z-40 bg-discord-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] flex items-center justify-center border border-white/10">
                        18+
                    </div>
                )}

                <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg border border-white/10 shadow-sm group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-[transform,shadow,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-white/20" style={{ backgroundColor: anime.color || '#181818', transform: 'translateZ(0)' }}>
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
                            <ImageOff className="w-7 h-7 mb-2 opacity-30" />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Cover unavailable</span>
                        </div>
                    )}

                    {anime.isProgress && (
                        <div className="absolute bottom-0 left-0 w-full z-50">
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

                    <div className="absolute bottom-2 left-2 right-2 z-40 flex">
                        {anime.status === "NOT_YET_RELEASED" ? (
                            <span className="max-w-full rounded-[4px] bg-black/75 border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/75 backdrop-blur-sm truncate">
                                Not yet released
                            </span>
                        ) : (
                            <div className="flex items-center gap-1.5 rounded-[4px] bg-black/75 border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
                                <span className="text-white/45">EP</span>
                                <span>{anime.isProgress ? anime.episode : (releasedEpisodes || "0")}</span>
                                {showTotal && <span className="text-white/35">/ {totalEpisodes}</span>}
                            </div>
                        )}
                    </div>

                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-30 pointer-events-none">
                        <div className="bg-white/95 text-black p-2.5 rounded-full scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                            <Play size={22} fill="currentColor" className="ml-0.5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full mt-2 text-left px-0.5">
                <h3 className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {getTitle(anime.title)}
                </h3>
            </div>
        </Link>
    );
}
