import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Play, Mic, ClosedCaption, Check, Trash2, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { useUserList } from "../../context/UserListContext";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";

export default function Hero({ data = [], isLoading }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { list, addToList, updateStatus, removeFromList } = useUserList();
  const { user, triggerAuthToast } = useAuth();

  const displayData = data?.slice(0, 6) || [];

  useEffect(() => {
    if (displayData.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayData.length);
      setActiveDropdown(null);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayData.length]);

  // --- SMART SKELETON LOADER ---
  if (isLoading || displayData.length === 0) {
    return (
      <div className="relative w-full pt-[56px] pb-0">
        <section className="relative w-full h-[400px] md:h-[550px] lg:h-[550px] overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10" />
          <div className="relative h-full container max-w-[1720px] px-4 md:px-8 flex flex-col justify-end pb-12 md:justify-center md:pb-0 z-20">
            <div className="w-full md:max-w-[700px] space-y-4 animate-pulse">
              <div className="h-10 md:h-14 bg-white/5 rounded-lg w-3/4" />
              <div className="flex gap-3">
                <div className="h-5 bg-white/5 rounded w-16" />
                <div className="h-5 bg-white/5 rounded w-24" />
              </div>
              <div className="h-20 bg-white/5 rounded-lg w-full" />
              <div className="flex gap-4">
                <div className="h-12 bg-white/10 rounded-full w-40" />
                <div className="h-12 bg-white/5 rounded-full w-12" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const handleStatusChange = (anime, status) => {
    const exists = list.find(item => item.animeId === String(anime.id));
    if (exists) {
      updateStatus(String(anime.id), status);
    } else {
      addToList({
        animeId: String(anime.id),
        title: anime.title?.english || anime.title?.romaji,
        coverImage: anime.coverImage?.large,
        status: status,
        totalEpisodes: anime.episodes
      });
    }
    setActiveDropdown(null);
  };

  return (
    <div className="relative w-full pt-[56px] pb-0">
      <section className="relative w-full h-[400px] md:h-[550px] lg:h-[550px] overflow-hidden group select-none">
        {/* Background Slides */}
        {displayData.map((anime, i) => {
          const itemInList = list.find(item => item.animeId === String(anime.id));
          const currentStatus = itemInList?.status || null;
          const isFirst = i === 0;

          return (
            <div
              key={anime.id}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${i === currentIndex
                ? "opacity-100 z-10"
                : "opacity-0 z-0"
                }`}
            >
              {/* Background Image (Full Width with Reveal Effect) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 25%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 25%)' }}
              >
                {/* Mobile Poster Image (Top aligned to show faces) */}
                <img
                  src={anime.coverImage?.extraLarge || anime.bannerImage}
                  alt={anime.title?.english}
                  fetchPriority={isFirst ? "high" : "auto"}
                  loading={isFirst ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover object-[center_20%] md:hidden"
                />
                {/* Desktop/Tablet Banner Image (Centered correctly) */}
                <img
                  src={anime.bannerImage || anime.coverImage?.extraLarge}
                  alt={anime.title?.english}
                  fetchPriority={isFirst ? "high" : "auto"}
                  loading={isFirst ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover object-center hidden md:block"
                />
                {/* Dark Fade Effect on the Left Side (Reduced opacity for more brightness) */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
              </div>

              {/* Mobile-Centered & Bottom Aligned Content */}
              <div className="relative h-full container max-w-[1720px] px-4 md:px-8 flex flex-col justify-end pb-12 md:justify-center md:pb-0">
                <div className={`w-full md:max-w-[700px] flex flex-col items-center md:items-start text-center md:text-left transition-all duration-700 delay-200 ${i === currentIndex ? "translate-y-0 md:translate-x-0 opacity-100" : "translate-y-10 md:-translate-x-10 opacity-0"}`}>

                  {/* Anime Title (Premium Outfit Font) */}
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-[1.2] mb-3 drop-shadow-2xl line-clamp-2">
                    {anime.title?.english || anime.title?.romaji}
                  </h2>

                  {/* Meta Row (Badges + Genres) */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4 md:mb-6">
                    <div className="px-2 py-0.5 bg-red-600 text-white rounded-[3px] text-[11px] font-black uppercase tracking-wider shadow-lg">
                      {anime.format || "TV"}
                    </div>
                    <span className="text-[12px] font-bold text-white/40">{anime.seasonYear || "2026"}</span>

                    {/* Genres (Hidden on small mobile if too long) */}
                    <div className="hidden sm:flex items-center gap-2">
                      {anime.genres?.slice(0, 2).map((g, idx) => (
                        <span key={g} className="text-[11px] font-medium text-white/60">
                          {g}{idx < 1 && ","}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description (Optimized for Mobile) */}
                  <p className="text-[13px] md:text-[14px] text-white/70 line-clamp-2 md:line-clamp-3 mb-6 max-w-[550px] leading-relaxed font-medium">
                    {anime.description?.replace(/<[^>]*>?/gm, '')}
                  </p>

                  {/* Professional Inline Metadata (Replaces the AI-looking glass box) */}
                  <div className="hidden md:flex items-center gap-4 mb-8">
                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center px-1.5 py-[1px] border border-white/30 rounded text-[11px] font-bold text-white/90 tracking-wide">
                        {anime.averageScore ? (anime.averageScore >= 80 ? "PG-13" : "PG") : "PG-13"}
                      </span>
                      <span className="flex items-center justify-center px-1.5 py-[1px] bg-white text-black rounded text-[11px] font-black tracking-wide">
                        HD
                      </span>
                    </div>

                    {/* Details separated by dots */}
                    <div className="flex items-center gap-3 text-[13px] font-medium text-white/70">
                      <span>{anime.seasonYear || anime.startDate?.year || "2026"}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30"></span>
                      <span className="capitalize">{anime.status?.toLowerCase().replace(/_/g, ' ') || "Airing"}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30"></span>
                      <span>{anime.episodes ? `${anime.episodes} Episodes` : "Ongoing"}</span>
                    </div>
                  </div>

                  {/* Primary Actions (Mobile Centered) */}
                  <div className="flex items-center justify-center md:justify-start gap-3 md:gap-5">
                    <Link to={`/watch/${anime.id}`} className="group flex items-center justify-center gap-3 md:px-10 py-3 md:py-4 bg-red-600 text-white text-[13px] font-bold uppercase tracking-[0.15em] rounded-full hover:bg-red-700 transition-all transform active:scale-95 shadow-xl min-w-[50px] md:min-w-0">
                      <Play size={20} md:size={18} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                      <span className="hidden md:block">Watch Now</span>
                    </Link>

                    {/* Bookmark Dropdown Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (!user) {
                            triggerAuthToast("Sign in to manage your watchlist");
                            setShowLoginModal(true);
                          } else {
                            setActiveDropdown(activeDropdown === anime.id ? null : anime.id);
                          }
                        }}
                        className={`p-3.5 md:p-4 transition-all transform active:scale-95 group rounded-full border shadow-xl ${currentStatus
                          ? "bg-[#ff3e3e] border-[#ff3e3e] text-white"
                          : "bg-white/[0.05] border-white/10 text-white hover:bg-white/10"
                          }`}
                      >
                        <Bookmark size={18} md:size={20} fill={currentStatus ? "currentColor" : "none"} className="group-hover:scale-110 transition-transform" />
                      </button>

                      {/* Dropdown Menu (Opens Upwards) */}
                      {activeDropdown === anime.id && (
                        <div className="absolute right-0 md:left-0 bottom-full mb-4 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Set Status</p>
                          </div>
                          <div className="p-1">
                            {["Watching", "Planning", "Completed", "Dropped"].map((status) => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(anime, status)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium rounded-lg transition-all ${currentStatus === status
                                  ? "bg-[#ff3e3e]/10 text-[#ff3e3e]"
                                  : "text-white/60 hover:bg-white/5 hover:text-white"
                                  }`}
                              >
                                {status}
                                {currentStatus === status && <Check size={14} />}
                              </button>
                            ))}
                            {currentStatus && (
                              <button
                                onClick={() => {
                                  removeFromList(String(anime.id));
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-all mt-1 border-t border-white/5 pt-3"
                              >
                                Remove
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          );
        })}

        {/* Compact Numeric Navigation + Arrows */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-10 md:bottom-10 z-50 flex items-center gap-4 px-2">
          {/* Prev Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + displayData.length) % displayData.length); }}
            className="text-white/40 hover:text-white transition-colors p-1 transform active:scale-90"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Numbers */}
          <div className="flex items-center gap-2 font-medium tracking-[0.2em] select-none">
            <span className="text-white text-base">{(currentIndex + 1).toString().padStart(2, '0')}</span>
            <span className="text-white/20 text-xs">/</span>
            <span className="text-white/40 text-[11px]">{displayData.length.toString().padStart(2, '0')}</span>
          </div>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % displayData.length); }}
            className="text-white/40 hover:text-white transition-colors p-1 transform active:scale-90"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Login Modal for unauthenticated users */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
