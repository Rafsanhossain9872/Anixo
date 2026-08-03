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
        className="relative w-full bg-[#1a1a2e] border border-white/10 px-4 py-3 flex flex-wrap items-center justify-between select-none"
      >
        <div className="flex flex-wrap items-center gap-6">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-2 transition-all ${isFocusMode ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
            title={t('player.focus')}
          >
            <Moon size={16} fill={isFocusMode ? "currentColor" : "none"} />
            <span className="text-[13px] font-semibold tracking-wide">{t('player.focus')}</span>
          </button>

          <div className={`flex items-center gap-6 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
            <button
              onClick={() => setAutoNext(!autoNext)}
              className="flex items-center gap-2 group transition-all"
              title={t('player.autoNext')}
            >
              <FastForward size={16} className={`transition-all ${autoNext ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`text-[13px] font-semibold tracking-wide ${autoNext ? 'text-white' : 'text-white/70'}`}>{t('player.autoNext')}</span>
            </button>

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="flex items-center gap-2 group transition-all"
              title={t('player.autoPlay')}
            >
              <PlayCircle size={16} className={`transition-all ${autoPlay ? 'text-discord-500' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`text-[13px] font-semibold tracking-wide ${autoPlay ? 'text-white' : 'text-white/70'}`}>{t('player.autoPlay')}</span>
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-6 ml-auto sm:ml-0 ${wtRoom && !wtRoom.isHost ? 'pointer-events-none opacity-40' : ''}`}>
          <button
            onClick={goPrevEpisode}
            className={`flex items-center gap-1.5 transition-all ${activeEpisode <= 1 ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
            title={t('player.prev')}
          >
            <SkipBack size={16} fill="currentColor" />
            <span className="hidden sm:inline text-[13px] font-semibold tracking-wide">{t('player.prev')}</span>
          </button>
          <button
            onClick={goNextEpisode}
            className={`flex items-center gap-1.5 transition-all ${activeEpisode >= episodesList.length ? 'opacity-30 pointer-events-none' : 'text-white/70 hover:text-white'}`}
            title={t('player.next')}
          >
            <SkipForward size={16} fill="currentColor" />
            <span className="hidden sm:inline text-[13px] font-semibold tracking-wide">{t('player.next')}</span>
          </button>

          {!isFocusMode && (
            <>
              <div className="relative" ref={watchlistRef}>
                <button
                  onClick={handleToggleBackendWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center gap-2 transition-all ${isBookmarked ? 'text-discord-500' : 'text-white/70 hover:text-white'}`}
                >
                  {isWatchlistLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Heart size={15} fill={isBookmarked ? "currentColor" : "none"} />
                  )}
                  <span className="hidden sm:inline text-[13px] font-semibold tracking-wide">
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
                className={`flex items-center gap-2 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/70 hover:text-white'}`}
              >
                <Flag size={16} />
                <span className="hidden sm:inline text-[13px] font-semibold tracking-wide uppercase">{t('player.report')}</span>
              </button>

              {/* Anaixo.buzz Embeds Link */}
              <a
                href="https://tenzora.buzz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-white/70 hover:text-discord-500 transition-all group"
                title="Get Free Anime Iframe Embeds at anaixo.buzz"
              >
                <span className="text-[17px] transform group-hover:scale-125 transition-transform duration-200">🌐</span>
              </a>

              {/* Watch Together Button */}
              {!wtRoom && handleCreateWtRoom && (
                <div className="flex items-center bg-[#2a2a40] rounded-md border border-white/10 overflow-hidden">
                  <button
                    onClick={handleCreateWtRoom}
                    className="flex items-center justify-center transition-all text-white/70 hover:text-white hover:bg-white/10 px-3 py-1.5"
                    title="Start Watch Together Now"
                  >
                    <Users size={16} />
                  </button>
                  {handleScheduleWtRoom && (
                    <>
                      <div className="w-px h-5 bg-white/20"></div>
                      <button
                        onClick={handleScheduleWtRoom}
                        className="px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        title="Schedule for Later"
                      >
                        <Clock size={16} />
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
        <section className="w-full bg-[#0d0d10] border-x border-b border-white/10 px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-[16px] font-bold text-white tracking-wide">
              You are watching <span className="text-discord-500">{t('player.episode')} {activeEpisode}</span>
            </h3>
            <p className="text-[11px] text-white/50 font-bold uppercase tracking-[0.15em] mt-1.5 max-w-[280px]">
              SWITCH SERVERS IF THE CURRENT LINK IS UNSTABLE.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex bg-[#1a1a2e] rounded-md border border-white/5 p-1">
              <button
                onClick={() => setPlayerLang("sub")}
                disabled={!hasSub}
                className={`flex items-center gap-2 px-5 py-2 text-[12px] font-bold uppercase tracking-widest rounded-md transition-all ${playerLang === "sub" ? "bg-discord-600 text-white" : "text-white/50 hover:text-white"
                  } ${!hasSub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <MessageSquare size={14} fill="currentColor" className={playerLang === "sub" ? "" : "opacity-50"} />
                SUB
              </button>
              <button
                onClick={() => setPlayerLang("dub")}
                disabled={!hasDub}
                className={`flex items-center gap-2 px-5 py-2 text-[12px] font-bold uppercase tracking-widest rounded-md transition-all ${playerLang === "dub" ? "bg-discord-600 text-white" : "text-white/50 hover:text-white"
                  } ${!hasDub ? "opacity-20 pointer-events-none" : ""}`}
              >
                <Mic size={14} fill="currentColor" className={playerLang === "dub" ? "" : "opacity-50"} />
                DUB
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveServer(s)}
                  disabled={wtRoom && s !== 1}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md border transition-all flex-shrink-0 ${activeServer === s
                    ? "bg-discord-600 border-discord-600 text-white"
                    : wtRoom && s !== 1
                      ? "border-white/5 text-white/20 cursor-not-allowed bg-[#1a1a2e]"
                      : "border-white/10 text-white/60 hover:text-white hover:border-white/20 bg-[#1a1a2e]"
                    }`}
                >
                  SERVER {s}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
