import { useRef, useEffect } from "react";
import {
  Moon, FastForward, PlayCircle, SkipForward, SkipBack,
  Heart, Flag, MessageSquare, Mic
} from "lucide-react";

export default function PlayerToolbar({
  isFocusMode, setIsFocusMode,
  autoNext, setAutoNext,
  autoPlay, setAutoPlay,
  activeEpisode, episodesList,
  goPrevEpisode, goNextEpisode,
  playerLang, setPlayerLang,
  hasSub, hasDub,
  activeServer, setActiveServer,
  isBookmarked, isWatchlistLoading,
  handleToggleBackendWatchlist, showWatchlistDropdown, setShowWatchlistDropdown,
  backendWatchlist, handleUpdateWatchlistStatus, id,
  handleReport, reportSuccess
}) {
  const watchlistRef = useRef(null);

  // Close watchlist dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (watchlistRef.current && !watchlistRef.current.contains(event.target)) {
        setShowWatchlistDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowWatchlistDropdown]);

  return (
    <>
      {/* Action Toolbar */}
      <section
        className="relative w-full bg-[#121418] border-x border-b border-white/5 px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-4 sm:gap-8 select-none"
      >
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-1 sm:gap-2 transition-all ${isFocusMode ? 'text-red-500' : 'text-white/60 hover:text-white'}`}
          >
            <Moon size={13} className="sm:w-4 sm:h-4" fill={isFocusMode ? "currentColor" : "none"} />
            <span className="text-[9px] sm:text-[12px] font-medium">Focus</span>
          </button>

          <button
            onClick={() => setAutoNext(!autoNext)}
            className="flex items-center gap-1 sm:gap-2 group transition-all"
          >
            <FastForward size={13} className={`sm:w-4 sm:h-4 transition-all ${autoNext ? 'text-red-500' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[9px] sm:text-[12px] font-medium ${autoNext ? 'text-white' : 'text-white/60'}`}>AutoNext</span>
          </button>

          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className="flex items-center gap-1 sm:gap-2 group transition-all"
          >
            <PlayCircle size={13} className={`sm:w-4 sm:h-4 transition-all ${autoPlay ? 'text-red-500' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[9px] sm:text-[12px] font-medium ${autoPlay ? 'text-white' : 'text-white/60'}`}>AutoPlay</span>
          </button>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
          <button
            onClick={goPrevEpisode}
            className={`flex items-center gap-1 sm:gap-1.5 transition-all ${activeEpisode <= 1 ? 'opacity-20 pointer-events-none' : 'text-white/60 hover:text-white'}`}
          >
            <SkipBack size={13} className="sm:w-4 sm:h-4" fill="currentColor" />
            <span className="text-[9px] sm:text-[12px] font-medium">Prev</span>
          </button>
          <button
            onClick={goNextEpisode}
            className={`flex items-center gap-1 sm:gap-1.5 transition-all ${activeEpisode >= episodesList.length ? 'opacity-20 pointer-events-none' : 'text-white/60 hover:text-white'}`}
          >
            <SkipForward size={13} className="sm:w-4 sm:h-4" fill="currentColor" />
            <span className="text-[9px] sm:text-[12px] font-medium">Next</span>
          </button>

          {!isFocusMode && (
            <>
              <div className="relative" ref={watchlistRef}>
                <button
                  onClick={handleToggleBackendWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center gap-1 sm:gap-2 transition-all ${isBookmarked ? 'text-red-500' : 'text-white/60 hover:text-white'}`}
                >
                  {isWatchlistLoading ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Heart size={13} className="sm:w-4 sm:h-4" fill={isBookmarked ? "currentColor" : "none"} />
                  )}
                  <span className="hidden sm:inline text-[12px] font-medium">
                    {isWatchlistLoading ? 'Saving...' : 'Bookmark'}
                  </span>
                </button>

                {showWatchlistDropdown && (
                  <div className="absolute bottom-full mb-3 right-0 bg-[#1a1c21] border border-white/10 rounded-[4px] shadow-2xl py-2 min-w-[140px] z-[110] animate-in slide-in-from-bottom-2 duration-200">
                    {["Watching", "Planning", "Completed", "On-Hold", "Dropped"].map((status) => {
                      const bookmarkItem = backendWatchlist.find(item => item.animeId === String(id));
                      const isActive = bookmarkItem?.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => handleUpdateWatchlistStatus(status)}
                          className={`w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider transition-colors ${isActive ? 'text-red-500 bg-red-500/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          {status}
                        </button>
                      );
                    })}
                    {isBookmarked && (
                      <div className="border-t border-white/5 mt-2 pt-2">
                        <button
                          onClick={() => handleUpdateWatchlistStatus("Remove")}
                          className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-red-600 hover:bg-red-600/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className={isBookmarked ? "" : "border-t border-white/5 mt-2 pt-2"}>
                      <button
                        onClick={() => setShowWatchlistDropdown(false)}
                        className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-red-600 hover:text-red-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleReport}
                className={`flex items-center gap-2 sm:gap-3 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/60 hover:text-white'}`}
              >
                <Flag size={14} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-[12px] font-medium uppercase tracking-wider">Report</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Server Selector Section */}
      {!isFocusMode && (
        <section className="flex flex-col md:flex-row md:items-center justify-between py-4 lg:py-6 gap-4 lg:gap-6">
          <div className="text-center md:text-left">
            <p className="text-[13px] lg:text-[14px] font-bold text-white/70 tracking-wide">
              You are watching <span className="text-red-600">Episode {activeEpisode}</span>
            </p>
            <p className="text-[9px] lg:text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1">
              Switch servers if the current link is unstable.
            </p>
            <div className="mt-2 space-y-1 flex flex-col items-center md:items-start">
              <p className="text-[9px] lg:text-[10px] text-yellow-500/90 font-medium max-w-[280px] sm:max-w-[300px] leading-relaxed italic text-center md:text-left">
                Note: If a wrong episode is playing, switch to another server. 100% Fix guaranteed.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-10">
            <div className="flex bg-[#161616] p-1 rounded-sm border border-white/5">
              <button
                onClick={() => setPlayerLang("sub")}
                disabled={!hasSub}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "sub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  } ${!hasSub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <MessageSquare size={12} fill="currentColor" className="opacity-50" />
                Sub
              </button>
              <button
                onClick={() => setPlayerLang("dub")}
                disabled={!hasDub}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "dub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  } ${!hasDub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <Mic size={12} fill="currentColor" className="opacity-50" />
                Dub
              </button>
            </div>

            <div className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5 sm:mr-auto sm:mr-20">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveServer(s)}
                  className={`px-2 sm:px-4 py-1 sm:py-2 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all flex-shrink-0 ${activeServer === s
                    ? "bg-red-600 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                    : "border-white/5 text-white/40 hover:text-white hover:border-white/10 bg-white/5"
                    }`}
                >
                  S{s}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
