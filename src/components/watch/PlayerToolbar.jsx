import { useRef, useEffect } from "react";
import {
  Moon, FastForward, PlayCircle, SkipForward, SkipBack,
  Heart, Flag, MessageSquare, Mic, Users, Clock
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  handleReport, reportSuccess,
  wtRoom, handleCreateWtRoom, handleScheduleWtRoom
}) {
  const { t } = useTranslation();
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
        className="relative w-full bg-[#121418] border-x border-b border-white/15 px-3 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-y-4 gap-x-2 sm:gap-8 select-none"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:gap-10">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-1 sm:gap-2 transition-all ${isFocusMode ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
            title={t('player.focus')}
          >
            <Moon size={15} className="sm:w-4 sm:h-4" fill={isFocusMode ? "currentColor" : "none"} />
            <span className="hidden sm:inline text-[12px] font-medium">{t('player.focus')}</span>
          </button>

          <div className={`flex items-center gap-4 sm:gap-6 lg:gap-10 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
            <button
              onClick={() => setAutoNext(!autoNext)}
              className="flex items-center gap-1 sm:gap-2 group transition-all"
              title={t('player.autoNext')}
            >
              <FastForward size={15} className={`sm:w-4 sm:h-4 transition-all ${autoNext ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`hidden sm:inline text-[12px] font-medium ${autoNext ? 'text-white' : 'text-white/70'}`}>{t('player.autoNext')}</span>
            </button>

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="flex items-center gap-1 sm:gap-2 group transition-all"
              title={t('player.autoPlay')}
            >
              <PlayCircle size={15} className={`sm:w-4 sm:h-4 transition-all ${autoPlay ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`hidden sm:inline text-[12px] font-medium ${autoPlay ? 'text-white' : 'text-white/70'}`}>{t('player.autoPlay')}</span>
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-3 sm:gap-6 lg:gap-8 ml-auto sm:ml-0 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
          <button
            onClick={goPrevEpisode}
            className={`flex items-center gap-1 sm:gap-1.5 transition-all ${activeEpisode <= 1 ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
            title={t('player.prev')}
          >
            <SkipBack size={15} className="sm:w-4 sm:h-4" fill="currentColor" />
            <span className="hidden sm:inline text-[12px] font-medium">{t('player.prev')}</span>
          </button>
          <button
            onClick={goNextEpisode}
            className={`flex items-center gap-1 sm:gap-1.5 transition-all ${activeEpisode >= episodesList.length ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
            title={t('player.next')}
          >
            <SkipForward size={15} className="sm:w-4 sm:h-4" fill="currentColor" />
            <span className="hidden sm:inline text-[12px] font-medium">{t('player.next')}</span>
          </button>

          {!isFocusMode && (
            <>
              <div className="relative" ref={watchlistRef}>
                <button
                  onClick={handleToggleBackendWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center gap-1 sm:gap-2 transition-all ${isBookmarked ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
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
                  <div className="absolute bottom-full mb-3 right-0 bg-[#1a1c21] border border-white/15 rounded-[4px] shadow-2xl py-2 min-w-[140px] z-[110] animate-in slide-in-from-bottom-2 duration-200">
                    {["Watching", "Planning", "Completed", "On-Hold", "Dropped"].map((status) => {
                      const bookmarkItem = backendWatchlist.find(item => item.animeId === String(id));
                      const isActive = bookmarkItem?.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => handleUpdateWatchlistStatus(status)}
                          className={`w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider transition-colors ${isActive ? 'text-discord-500 bg-discord-500/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          {status}
                        </button>
                      );
                    })}
                    {isBookmarked && (
                      <div className="border-t border-white/15 mt-2 pt-2">
                        <button
                          onClick={() => handleUpdateWatchlistStatus("Remove")}
                          className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-discord-600 hover:bg-discord-600/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className={isBookmarked ? "" : "border-t border-white/15 mt-2 pt-2"}>
                      <button
                        onClick={() => setShowWatchlistDropdown(false)}
                        className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-discord-600 hover:text-discord-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleReport}
                className={`flex items-center gap-2 sm:gap-3 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/70 hover:text-white'}`}
              >
                <Flag size={14} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-[12px] font-medium uppercase tracking-wider">{t('player.report')}</span>
              </button>

              {/* Anaixo.buzz Embeds Link */}
              <a
                href="https://anixo.buzz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 text-white/70 hover:text-discord-500 transition-all group"
                title="Get Free Anime Iframe Embeds at anaixo.buzz"
              >
                <span className="text-[15px] sm:text-[17px] transform group-hover:scale-125 transition-transform duration-200">🌐</span>
                <span className="hidden sm:inline text-[12px] font-medium uppercase tracking-wider">Embed</span>
              </a>

              {/* Watch Together Button */}
              {!wtRoom && handleCreateWtRoom && (
                <div className="flex items-center bg-discord-500/10 rounded-full border border-discord-500/20 overflow-hidden">
                  <button
                    onClick={handleCreateWtRoom}
                    className="flex items-center gap-1.5 sm:gap-3 transition-all text-white/60 hover:text-discord-500 hover:bg-discord-500/20 px-2.5 sm:px-3 py-1.5"
                    title="Start Watch Together Now"
                  >
                    <Users size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-[12px] font-bold uppercase tracking-wider text-discord-500">Watch Together</span>
                  </button>
                  {handleScheduleWtRoom && (
                    <>
                      <div className="w-px h-5 bg-discord-500/30"></div>
                      <button
                        onClick={handleScheduleWtRoom}
                        className="px-2.5 sm:px-3 py-1.5 text-white/60 hover:text-discord-500 hover:bg-discord-500/20 transition-all"
                        title="Schedule for Later"
                      >
                        <Clock size={14} className="sm:w-4 sm:h-4" />
                      </button>
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
        <section className="flex flex-col md:flex-row md:items-center justify-between py-4 lg:py-6 gap-4 lg:gap-6">
          <div className="text-center md:text-left">
            <p className="text-[13px] lg:text-[14px] font-bold text-white/80 tracking-wide">
              You are watching <span className="text-discord-600">{t('player.episode')}{activeEpisode}</span>
            </p>
            <p className="text-[9px] lg:text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">
              Switch servers if the current link is unstable.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-10">
            <div className="flex bg-[#161616] p-1 rounded-sm border border-white/15">
              <button
                onClick={() => setPlayerLang("sub")}
                disabled={!hasSub}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "sub" ? "bg-discord-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  } ${!hasSub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <MessageSquare size={12} fill="currentColor" className="opacity-50" />
                Sub
              </button>
              <button
                onClick={() => setPlayerLang("dub")}
                disabled={!hasDub}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "dub" ? "bg-discord-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  } ${!hasDub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <Mic size={12} fill="currentColor" className="opacity-50" />
                Dub
              </button>
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-0.5 md:gap-1 sm:mr-auto sm:mr-20">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveServer(s)}
                  disabled={wtRoom && s !== 1}
                  className={`px-1.5 sm:px-3 py-0.5 sm:py-1.5 text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all flex-shrink-0 ${activeServer === s
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
