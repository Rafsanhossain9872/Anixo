import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AnimeCard from "../common/AnimeCard";
import SkeletonCard from "../common/SkeletonCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AnimeRow({ 
  title, 
  subtitle, 
  data, 
  isLoading, 
  isFetching = false, 
  limit = 6, 
  tabs = [], 
  activeTab = "", 
  onTabChange, 
  onRemove, 
  isScrollable = false, 
  viewAllLink = "", 
  CardComponent = AnimeCard, 
  headerAction,
  emptyMessage
}) {
  const Card = CardComponent;
  const hasData = data && data.length > 0;
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isScrollable) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [isScrollable, data, checkScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="mt-4 md:mt-12 w-full mx-auto px-4 md:px-8 overflow-hidden font-sans">
      {/* Header Area */}
      <div className="flex flex-row items-center justify-between mb-2 md:mb-6 gap-2">
        
        <div className="flex flex-col items-start gap-1">
          {subtitle && (
            <p className="text-[10px] md:text-xs font-senpai font-bold text-accent uppercase tracking-widest">{subtitle}</p>
          )}
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-none tracking-tight uppercase">
              {title}
            </h2>
            {headerAction}
          </div>
        </div>

        <div className="flex flex-row items-center gap-3 md:gap-4 shrink-0">
          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1 bg-surface rounded p-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={`text-[10px] md:text-xs font-senpai font-bold transition-colors whitespace-nowrap px-3 md:px-4 py-1 md:py-1.5 rounded uppercase tracking-wider ${
                    activeTab === tab
                      ? "text-black bg-white"
                      : "text-textMuted hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* View All Link — visible on ALL breakpoints */}
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-[10px] md:text-xs font-senpai font-bold text-textMuted hover:text-white uppercase tracking-widest transition-colors duration-200 flex items-center gap-1 whitespace-nowrap"
            >
              View All <ChevronRight size={12} className="opacity-60" />
            </Link>
          )}

          {/* Scroll Navigation Controls (Desktop only) */}
          {isScrollable && (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-all duration-200 ${
                  canScrollLeft 
                    ? "border-white/20 bg-surfaceHover text-white hover:border-white/40 cursor-pointer" 
                    : "border-border bg-surface text-textMuted cursor-not-allowed opacity-50"
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-all duration-200 ${
                  canScrollRight 
                    ? "border-white/20 bg-surfaceHover text-white hover:border-white/40 cursor-pointer" 
                    : "border-border bg-surface text-textMuted cursor-not-allowed opacity-50"
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid container or Scrollable Flexbox */}
      <div className="relative group/row w-full">
        {isFetching && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/40 backdrop-blur-sm transition-all duration-300 rounded">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-xl"></div>
          </div>
        )}
        
        {/* Left Scroll Overlay Arrow (Desktop Hover) */}
        {isScrollable && canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 top-0 bottom-4 z-40 w-16 items-center justify-center bg-gradient-to-r from-bg via-bg/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          >
            <div className="bg-bg/80 backdrop-blur-md p-2 rounded-full border border-white/10 text-white shadow-xl hover:scale-110 transition-transform">
              <ChevronLeft size={24} />
            </div>
          </button>
        )}

        {/* Right Scroll Overlay Arrow (Desktop Hover) */}
        {isScrollable && canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 top-0 bottom-4 z-40 w-16 items-center justify-center bg-gradient-to-l from-bg via-bg/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          >
            <div className="bg-bg/80 backdrop-blur-md p-2 rounded-full border border-white/10 text-white shadow-xl hover:scale-110 transition-transform">
              <ChevronRight size={24} />
            </div>
          </button>
        )}

        {/* --- SCROLLABLE ROW (Watch History / Continue Watching) --- */}
        {isScrollable ? (
          <div
            ref={scrollRef}
            className="w-full flex flex-nowrap overflow-x-auto scrollbar-hide pb-6 gap-3 md:gap-5 min-h-[100px]"
          >
            {isLoading ? (
              Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="w-[140px] md:w-[180px] shrink-0">
                  <SkeletonCard />
                </div>
              ))
            ) : hasData ? (
              data.slice(0, data.length).map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="relative group/card shrink-0 w-[140px] md:w-[180px]">
                  <Card anime={anime} />
                  {onRemove && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(anime.id);
                      }}
                      className="absolute top-2 left-2 z-30 bg-bg/80 backdrop-blur-md text-white hover:text-red-500 hover:bg-black p-1.5 rounded-full shadow-2xl transition-all duration-300 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 border border-white/10"
                      title="Remove from history"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-textMuted font-senpai w-full">
                <p className="text-xs font-bold uppercase tracking-widest border border-white/10 px-6 py-2 rounded text-center leading-relaxed">
                  {emptyMessage || "No Data Available"}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* --- NON-SCROLLABLE ROW (Newest, Popular, Top Rated) --- */
          <div
            className="w-full flex flex-nowrap overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3 pb-4 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:gap-x-3 md:gap-y-8 md:overflow-visible md:pb-0 md:snap-none min-h-[100px]"
          >
            {isLoading ? (
              Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="w-[130px] shrink-0 snap-start md:w-auto md:shrink md:snap-align-none">
                  <SkeletonCard />
                </div>
              ))
            ) : hasData ? (
              data.slice(0, limit).map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="relative group/card shrink-0 w-[130px] snap-start md:w-auto md:shrink md:snap-align-none">
                  <Card anime={anime} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-textMuted font-senpai">
                <p className="text-xs font-bold uppercase tracking-widest border border-white/10 px-6 py-2 rounded text-center leading-relaxed">
                  {emptyMessage || "No Data Available"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
