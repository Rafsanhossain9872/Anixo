import { useRef, useEffect, useState } from "react";
import {
  Moon, FastForward, PlayCircle, SkipForward, SkipBack,
  Heart, Flag, MessageSquare, Mic, Users, Clock, Monitor
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PlayerToolbar({
  isFocusMode, setIsFocusMode,
  isTheaterMode, setIsTheaterMode,
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
  handleReport, reportSuccess,
  wtRoom, handleCreateWtRoom, handleScheduleWtRoom
}) {
  const { t } = useTranslation();
  const watchlistRef = useRef(null);
  const wtRef = useRef(null);
  const [showWtDropdown, setShowWtDropdown] = useState(false);

  // Close wt dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wtRef.current && !wtRef.current.contains(event.target)) {
        setShowWtDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        className="relative w-full bg-[#121418] border-x border-b border-white/15 px-2.5 sm:px-3 lg:px-4 py-1.5 flex flex-row flex-nowrap sm:flex-wrap items-center justify-between gap-2.5 select-none overflow-x-auto sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Primary Controls */}
        <div className="flex flex-nowrap shrink-0 items-center justify-start gap-2.5 sm:gap-3.5">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`flex items-center gap-1 transition-all ${isFocusMode ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
              title={t('player.focus')}
            >
              <Moon size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill={isFocusMode ? "currentColor" : "none"} />
              <span className="hidden md:inline text-[10px] font-medium">{t('player.focus')}</span>
            </button>

            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={`flex items-center gap-1 transition-all ${isTheaterMode ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
              title="Theater Mode"
            >
              <Monitor size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden md:inline text-[10px] font-medium">Theater</span>
            </button>
          </div>

          <div className="w-px h-3.5 bg-white/10 block"></div>

          <div className={`flex items-center gap-2 sm:gap-2.5 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
            <button
              onClick={() => setAutoNext(!autoNext)}
              className="flex items-center gap-1 group transition-all"
              title={t('player.autoNext')}
            >
              <FastForward size={12} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all ${autoNext ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`hidden md:inline text-[10px] font-medium ${autoNext ? 'text-white' : 'text-white/70'}`}>{t('player.autoNext')}</span>
            </button>

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="flex items-center gap-1 group transition-all"
              title={t('player.autoPlay')}
            >
              <PlayCircle size={12} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all ${autoPlay ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`hidden md:inline text-[10px] font-medium ${autoPlay ? 'text-white' : 'text-white/70'}`}>{t('player.autoPlay')}</span>
            </button>
          </div>

          <div className="w-px h-3.5 bg-white/10 block"></div>

          <div className={`flex items-center gap-2 sm:gap-2.5 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
            <button
              onClick={goPrevEpisode}
              className={`flex items-center gap-1 transition-all ${activeEpisode <= 1 ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
              title={t('player.prev')}
            >
              <SkipBack size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" />
              <span className="hidden md:inline text-[10px] font-medium">{t('player.prev')}</span>
            </button>
            <button
              onClick={goNextEpisode}
              className={`flex items-center gap-1 transition-all ${activeEpisode >= episodesList.length ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
              title={t('player.next')}
            >
              <SkipForward size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" />
              <span className="hidden md:inline text-[10px] font-medium">{t('player.next')}</span>
            </button>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className={`flex flex-nowrap shrink-0 items-center justify-end gap-2.5 sm:gap-3.5 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
          {!isFocusMode && !isTheaterMode && (
            <>
              <div className="relative" ref={watchlistRef}>
                <button
                  onClick={handleToggleBackendWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center gap-1 transition-all ${isBookmarked ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
                >
                  {isWatchlistLoading ? (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Heart size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill={isBookmarked ? "currentColor" : "none"} />
                  )}
                  <span className="hidden sm:inline text-[10px] font-medium">
                    {isWatchlistLoading ? 'Saving...' : 'Bookmark'}
                  </span>
                </button>

                {showWatchlistDropdown && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-black/60 sm:hidden" onClick={(e) => { e.stopPropagation(); setShowWatchlistDropdown(false); }}></div>
                    <div className="fixed bottom-0 left-0 w-full sm:absolute sm:bottom-full sm:mb-3 sm:right-0 bg-[#1a1c21] border-t sm:border border-white/15 rounded-t-xl sm:rounded-[4px] shadow-2xl py-4 sm:py-2 sm:min-w-[140px] z-[110] animate-in slide-in-from-bottom-2 duration-200">
                    {["Watching", "Planning", "Completed", "On-Hold", "Dropped"].map((status) => {
                      const bookmarkItem = backendWatchlist.find(item => item.animeId === String(id));
                      const isActive = bookmarkItem?.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => handleUpdateWatchlistStatus(status)}
                          className={`w-full text-left px-5 sm:px-4 py-3 sm:py-2 text-[13px] sm:text-[11px] uppercase tracking-wider transition-colors ${isActive ? 'text-discord-500 bg-discord-500/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          {status}
                        </button>
                      );
                    })}
                    {isBookmarked && (
                      <div className="border-t border-white/15 mt-2 pt-2">
                        <button
                          onClick={() => handleUpdateWatchlistStatus("Remove")}
                          className="w-full text-left px-5 sm:px-4 py-3 sm:py-2 text-[13px] sm:text-[11px] uppercase tracking-wider text-discord-600 hover:bg-discord-600/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className={isBookmarked ? "" : "border-t border-white/15 mt-2 pt-2"}>
                      <button
                        onClick={() => setShowWatchlistDropdown(false)}
                        className="w-full text-left px-5 sm:px-4 py-3 sm:py-2 text-[15px] sm:text-[11px] uppercase tracking-wider text-discord-600 hover:text-discord-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>

              <button
                onClick={handleReport}
                className={`flex items-center gap-1 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/70 hover:text-white'}`}
              >
                <Flag size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wider">{t('player.report')}</span>
              </button>

              <a
                href="https://anixo.buzz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-white/70 hover:text-discord-500 transition-all group"
                title="Get Free Anime Iframe Embeds at anaixo.buzz"
              >
                <span className="text-[12px] sm:text-[13px] transform group-hover:scale-125 transition-transform duration-200">🌐</span>
              </a>

              {!wtRoom && handleCreateWtRoom && (
                <div className="relative" ref={wtRef}>
                  <button
                    onClick={() => setShowWtDropdown(!showWtDropdown)}
                    className={`flex items-center transition-all ${showWtDropdown ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
                    title="Watch Together"
                  >
                    <Users size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                  {showWtDropdown && (
                    <>
                      <div className="fixed inset-0 z-[100] bg-black/60 sm:hidden" onClick={(e) => { e.stopPropagation(); setShowWtDropdown(false); }}></div>
                      <div className="fixed bottom-0 left-0 w-full sm:absolute sm:bottom-full sm:mb-3 sm:right-0 bg-[#1a1c21] border-t sm:border border-white/15 rounded-t-xl sm:rounded-[4px] shadow-2xl py-4 sm:py-2 sm:min-w-[150px] z-[110] animate-in slide-in-from-bottom-2 duration-200">
                      <button
                        onClick={() => { handleCreateWtRoom(); setShowWtDropdown(false); }}
                        className="w-full text-left px-5 sm:px-4 py-3 sm:py-2 text-[13px] sm:text-[11px] uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3 sm:gap-2"
                      >
                        <Users size={12} /> Start Now
                      </button>
                      {handleScheduleWtRoom && (
                        <button
                          onClick={() => { handleScheduleWtRoom(); setShowWtDropdown(false); }}
                          className="w-full text-left px-5 sm:px-4 py-3 sm:py-2 text-[13px] sm:text-[11px] uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3 sm:gap-2"
                        >
                          <Clock size={12} /> Schedule Later
                        </button>
                      )}
                    </div>
                  </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Server Selector Section */}
      {!isFocusMode && !(wtRoom && !wtRoom.isHost) && (
        <section className="flex flex-col md:flex-row md:items-center justify-between py-1.5 sm:py-2 gap-2 sm:gap-4">
          <div className="text-center md:text-left">
            <p className="text-[11px] sm:text-[12px] font-bold text-white/80 tracking-wide">
              You are watching <span className="text-discord-600">{t('player.episode')}{activeEpisode}</span>
            </p>
            <p className="text-[8.5px] sm:text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mt-0.5">
              Switch servers if the current link is unstable.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <div className="flex bg-[#161616] p-0.5 rounded-sm border border-white/15">
              <button
                onClick={() => setPlayerLang("sub")}
                disabled={!hasSub}
                className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "sub" ? "bg-discord-600 text-white shadow-md" : "text-white/40 hover:text-white"
                  } ${!hasSub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <MessageSquare size={10} fill="currentColor" className="opacity-50" />
                Sub
              </button>
              <button
                onClick={() => setPlayerLang("dub")}
                disabled={!hasDub}
                className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "dub" ? "bg-discord-600 text-white shadow-md" : "text-white/40 hover:text-white"
                  } ${!hasDub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <Mic size={10} fill="currentColor" className="opacity-50" />
                Dub
              </button>
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-1">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveServer(s)}
                  disabled={wtRoom && s !== 1}
                  className={`px-2 py-0.5 sm:py-1 text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider rounded-sm border transition-all flex-shrink-0 ${activeServer === s
                    ? "bg-discord-600 border-discord-600 text-white "
                    : wtRoom && s !== 1
                      ? "border-white/10 text-white/20 cursor-not-allowed bg-black/20"
                      : "border-white/15 text-white/40 hover:text-white hover:border-white/15 bg-white/5"
                    }`}
                >
                  Server {s}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
