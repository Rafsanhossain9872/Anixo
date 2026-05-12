import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AnimeCard from "../common/AnimeCard";
import SkeletonCard from "../common/SkeletonCard";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export default function AnimeRow({ title, data, isLoading, limit = 6, tabs = [], activeTab = "", onTabChange, onRemove, isScrollable = false, viewAllLink = "" }) {
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
    <section className="mt-8 max-w-[1720px] mx-auto px-2 md:px-4 overflow-hidden">
      {/* Responsive Header (Centered on Mobile, Left on Desktop) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-3">
            {/* Vertical Accent Bar */}
            <div className="w-[3.5px] h-6 bg-red-600 rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase leading-none tracking-tighter text-center md:text-left">
              {title}
            </h2>
          </div>

          {/* Categories / Tabs (Responsive Alignment) */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center justify-center md:justify-start gap-3 md:gap-5 overflow-x-auto scrollbar-hide py-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={`text-[12px] md:text-[14px] font-bold transition-all whitespace-nowrap px-2 py-1 rounded relative ${
                    activeTab === tab
                      ? "text-white bg-white/10"
                      : "text-[#999] hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-red-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scroll Arrows + View All (desktop only) */}
        {isScrollable && (
          <div className="hidden md:flex items-center gap-3">
            {viewAllLink && (
              <Link
                to={viewAllLink}
                className="text-[12px] font-semibold text-white/80 hover:text-white uppercase tracking-wider transition-colors duration-200"
              >
                View All
              </Link>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-200 ${
                  canScrollLeft 
                    ? "border-white/20 bg-white/5 hover:bg-white/15 text-white cursor-pointer" 
                    : "border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed"
                }`}
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-200 ${
                  canScrollRight 
                    ? "border-white/20 bg-white/5 hover:bg-white/15 text-white cursor-pointer" 
                    : "border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed"
                }`}
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid container or Scrollable Flexbox */}
      <div className="relative group/row">
        {/* Left Scroll Arrow (desktop only) */}
        {isScrollable && canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 top-0 bottom-4 z-20 w-12 items-center justify-center bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} className="text-white/80 hover:text-white drop-shadow-lg" />
          </button>
        )}

        {/* Right Scroll Arrow (desktop only) */}
        {isScrollable && canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 top-0 bottom-4 z-20 w-12 items-center justify-center bg-gradient-to-l from-[#050505] via-[#050505]/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={28} className="text-white/80 hover:text-white drop-shadow-lg" />
          </button>
        )}

        <div
          ref={isScrollable ? scrollRef : null}
          className={`${
            isScrollable 
            ? "flex flex-nowrap overflow-x-auto scrollbar-hide pb-4 gap-4" 
            : "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-7"
          } min-h-[100px]`}
        >
          {isLoading ? (
            Array.from({ length: limit }).map((_, i) => (
              <div key={i} className={`${isScrollable ? 'w-[160px] md:w-[200px] shrink-0' : (i >= 20 ? 'hidden sm:block' : 'block')}`}>
                <SkeletonCard />
              </div>
            ))
          ) : hasData ? (
            data.slice(0, isScrollable ? data.length : limit).map((anime, i) => (
              <div key={`${anime.id}-${i}`} className={`relative group/card shrink-0 ${
                isScrollable 
                ? 'w-[160px] md:w-[200px]' 
                : (i >= 20 ? 'hidden sm:block' : 'block')
              }`}>
                <AnimeCard anime={anime} />
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(anime.id);
                    }}
                    className="absolute top-2 right-2 z-50 bg-black/80 backdrop-blur-md text-white hover:text-red-500 hover:bg-black p-2.5 rounded-full shadow-2xl transition-all duration-300 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 border border-white/10 active:scale-90"
                    title="Remove from history"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 flex flex-col items-center justify-center text-white/10">
              <p className="text-sm font-medium uppercase tracking-widest">No results found in this category</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
