import {
  ChevronLeft, ChevronRight, LayoutGrid, List,
  Search, X, MessageSquare, Mic, PlayCircle, Filter
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function EpisodeSidebar({
  episodesList, filteredEpisodes, episodeLayout, setEpisodeLayout,
  episodePage, setEpisodePage, EPISODES_PER_PAGE,
  activeEpisode, setActiveEpisode, watchedEpisodes,
  isEpisodeSearchOpen, setIsEpisodeSearchOpen,
  episodeSearchQuery, setEpisodeSearchQuery,
  malEpisodes, tmdbEpisodes, kitsuEpisodes, anime, wtRoom,
  fillerData, hideFillerEpisodes, setHideFillerEpisodes
}) {
  const { t } = useTranslation();
  const isSearching = episodeSearchQuery?.trim().length > 0;
  
  const pageStart = isSearching
    ? episodePage * EPISODES_PER_PAGE + 1
    : episodePage * EPISODES_PER_PAGE + 1;
    
  const pageEnd = isSearching
    ? Math.min((episodePage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length)
    : Math.min((episodePage + 1) * EPISODES_PER_PAGE, episodesList?.length || 0);

  const currentSlice = isSearching
    ? filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE)
    : filteredEpisodes.filter(ep => ep >= pageStart && ep <= pageEnd);

  // Helper: resolve episode title from multiple sources
  const getEpTitle = (ep) => {
    const tmdbEp = tmdbEpisodes?.[String(ep)];
    if (tmdbEp?.title && tmdbEp.title.en) {
      return tmdbEp.title.en;
    }
    
    const epData = malEpisodes?.find?.(e => e.mal_id === ep);
    const aniListEp = anime?.streamingEpisodes?.find?.(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
    ) || (anime?.streamingEpisodes ? anime.streamingEpisodes.at(ep - 1) : null);
    
    const providerEp = anime?.episodes?.find?.(e => e.number === ep);
    
    return epData?.title
      || aniListEp?.title?.replace(/^Episode \d+\s*-\s*/i, '')
      || providerEp?.title
      || `Episode ${ep}`;
  };

  const getEpThumb = (ep) => {
    const tmdbEp = tmdbEpisodes?.[String(ep)];
    if (tmdbEp?.image) return tmdbEp.image;
    
    const kitsuEp = kitsuEpisodes?.[String(ep)];
    if (kitsuEp?.thumbnail) return kitsuEp.thumbnail;
    
    const providerEp = anime?.episodes?.find?.(e => e.number === ep);
    if (providerEp?.image) return providerEp.image;
    
    const aniListEp = anime?.streamingEpisodes?.find?.(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
    ) || (anime?.streamingEpisodes ? anime.streamingEpisodes.at(ep - 1) : null);
    if (aniListEp?.thumbnail) return aniListEp.thumbnail;
    
    const epData = malEpisodes?.find?.(e => e.mal_id === ep);
    if (epData?.images?.jpg?.image_url) return epData.images.jpg.image_url;
    
    return anime?.coverImage?.large || anime?.coverImage?.medium;
  };

  const getEpDescription = (ep) => {
    const tmdbEp = tmdbEpisodes?.[String(ep)];
    if (tmdbEp?.overview) return tmdbEp.overview;
    if (tmdbEp?.summary) return tmdbEp.summary.replace(/Source:.*/gi, '').trim();
    
    const kitsuEp = kitsuEpisodes?.[String(ep)];
    if (kitsuEp?.description) return kitsuEp.description;
    
    const providerEp = anime?.episodes?.find?.(e => e.number === ep);
    if (providerEp?.description) return providerEp.description;
    
    const epData = malEpisodes?.find?.(e => e.mal_id === ep);
    if (epData?.synopsis) return epData.synopsis;
    
    const aniListEp = anime?.streamingEpisodes?.find?.(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
    ) || (anime?.streamingEpisodes ? anime.streamingEpisodes.at(ep - 1) : null);
    if (aniListEp?.description) return aniListEp.description;
    
    return "";
  };

  const getEpDate = (ep) => {
    const epData = malEpisodes?.find?.(e => e.mal_id === ep);
    if (epData?.aired) {
      try {
        return new Date(epData.aired).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      } catch {
        return "";
      }
    }
    return "";
  };

  const isW2GNonHost = wtRoom && !wtRoom.isHost;

  return (
    <aside className="lg:col-span-1 space-y-4 pt-4 lg:pt-0 animate-in fade-in slide-in-from-right duration-500 flex flex-col">
      <div
        className="bg-[#0d0d0d] border border-white/15 overflow-hidden flex flex-col h-[500px] md:h-[600px] lg:h-full lg:max-h-[600px] xl:max-h-[650px]"
        style={{ clipPath: 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)' }}
      >
        {/* Header */}
        <header className="p-4 border-b border-white/15 flex flex-col gap-3 bg-[#111] min-h-[60px]">
          <div className="flex items-center justify-between w-full">
            {isEpisodeSearchOpen ? (
              <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-right-2 duration-300">
                <Search size={14} className="text-discord-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search episode or title..."
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] text-white placeholder:text-white/20 w-full font-medium"
                />
                <button
                  onClick={() => { setIsEpisodeSearchOpen(false); setEpisodeSearchQuery(""); }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">{t('sidebar.episodes')}</h2>
                  <div className="flex gap-2">
                    <MessageSquare size={12} className="text-discord-500" fill="currentColor" />
                    <Mic size={12} className="text-white/20" fill="currentColor" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white/50">
                  <Search size={17} className="hover:text-white cursor-pointer transition-colors" onClick={() => setIsEpisodeSearchOpen(true)} />
                  <button
                    onClick={() => {
                      if (episodeLayout === "grid") setEpisodeLayout("list");
                      else setEpisodeLayout("grid");
                    }}
                    className="hover:text-white transition-colors cursor-pointer flex items-center"
                  >
                    {episodeLayout === "grid" && <LayoutGrid size={17} />}
                    {episodeLayout === "list" && <List size={17} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Filler Toggle & Info */}
          {!isEpisodeSearchOpen && fillerData && Object.keys(fillerData).length > 0 && (
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 flex items-center gap-1.5">
                    <Filter size={12} />
                    Hide Filler Episodes
                  </span>
                </div>
              <button
                onClick={() => setHideFillerEpisodes(!hideFillerEpisodes)}
                className={`relative w-8 h-4 rounded-full transition-colors ${hideFillerEpisodes ? 'bg-discord-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${hideFillerEpisodes ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </header>

        {/* Range Selector */}
        {filteredEpisodes.length > 0 && (
          <div className="p-4 bg-[#0a0a0a] border-b border-white/15">
            <div className="flex items-center justify-between bg-[#161616] px-3 py-2 rounded-sm border border-white/15">
              <button disabled={episodePage === 0} onClick={() => setEpisodePage(p => p - 1)} className={`transition-colors ${episodePage > 0 ? 'text-white hover:text-discord-500' : 'text-white/5'}`}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-[11px] font-bold tracking-widest text-white/80">
                {String(pageStart).padStart(3, '0')}-{String(pageEnd).padStart(3, '0')}
              </span>
              <button disabled={isSearching ? episodePage >= Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE) - 1 : episodePage >= Math.ceil((episodesList?.length || 0) / EPISODES_PER_PAGE) - 1} onClick={() => setEpisodePage(p => p + 1)} className={`transition-colors ${(isSearching ? episodePage < Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE) - 1 : episodePage < Math.ceil((episodesList?.length || 0) / EPISODES_PER_PAGE) - 1) ? 'text-white hover:text-discord-500' : 'text-white/5'}`}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Episode List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 mini-scrollbar bg-[#0d0d0d]">
          {filteredEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-white/30 animate-in fade-in duration-300">
              <Search size={32} className="mb-3 opacity-20" />
              <span className="text-[13px] font-medium">{t('sidebar.noEpisodes')}</span>
              <button onClick={() => setEpisodeSearchQuery("")} className="mt-4 text-[11px] text-discord-500 hover:text-discord-400 font-bold uppercase tracking-widest transition-colors">
                {t('sidebar.clearSearch')}
              </button>
            </div>
          ) : episodeLayout === "list" && (
            <div className="flex flex-col gap-2">
              {currentSlice.map((ep, index) => {
                const isFiller = fillerData && fillerData[ep]?.isFiller;
                const isMixed = fillerData && fillerData[ep]?.isMixed;
                return (
                  <button
                    key={ep}
                    onClick={() => setActiveEpisode(ep)}
                    disabled={isW2GNonHost}
                    title={isW2GNonHost ? "Only the host can change episodes" : isFiller ? "Filler Episode" : isMixed ? "Mixed Canon/Filler" : ""}
                    className={`w-full text-left flex p-1.5 transition-all duration-200 rounded-[8px] border relative overflow-hidden group ${
                      activeEpisode === ep
                        ? "bg-[#b2a5ff] border-[#b2a5ff] shadow-lg shadow-[#b2a5ff]/20"
                        : isW2GNonHost
                          ? "bg-[#161616] border-white/5 cursor-not-allowed opacity-50"
                          : "bg-[#161616] border-white/5 hover:bg-[#252525] hover:border-white/90 hover:shadow-lg hover:-translate-y-[2px]"
                    }`}
                  >
                    {isFiller && <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500/50 z-10" />}
                    {isMixed && <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500/50 z-10" />}
                    
                    {/* Left: Thumbnail & Badge */}
                    <div className="relative shrink-0 overflow-hidden rounded-[6px] w-[130px] aspect-video sm:w-[145px]">
                      <img
                        src={getEpThumb(ep)}
                        alt=""
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                        fetchpriority={index < 4 ? "high" : "auto"}
                        className="w-full h-full object-cover bg-white/5"
                      />
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-[2px] rounded-[3px] border border-white/10 shadow-sm backdrop-blur-md">
                        <span className="text-[9px] font-semibold text-white/90 tracking-wider leading-none">EP {ep}</span>
                      </div>
                    </div>

                    {/* Right: Details */}
                    <div className="flex flex-col justify-between ml-3 flex-1 min-w-0 py-0.5 pr-1">
                      <div className="flex flex-col">
                        <span className={`text-[14px] font-semibold line-clamp-1 ${activeEpisode === ep ? 'text-white' : 'text-white/90 group-hover:text-white'}`}>
                          {getEpTitle(ep)}
                        </span>
                        <p className={`text-[12px] leading-[1.3] line-clamp-3 mt-1 font-normal ${activeEpisode === ep ? 'text-[#3e2e5c]' : 'text-white/40'}`}>
                          {getEpDescription(ep) || "No description available."}
                        </p>
                      </div>
                      
                      <div className={`flex items-center justify-between mt-2 ${activeEpisode === ep ? 'text-white/90' : 'text-white/30'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`text-[9px] font-bold px-1 py-[1px] rounded-[3px] border leading-none ${activeEpisode === ep ? 'border-white/70 text-white/90' : 'border-white/20 text-white/40'}`}>CC</div>
                          <Mic size={13} fill="currentColor" className="opacity-90" />
                        </div>
                        <span className={`text-[11px] font-medium ${activeEpisode === ep ? 'text-white/90' : 'text-white/20'}`}>
                          {getEpDate(ep)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {episodeLayout === "grid" && (
            <div 
              className="gap-2 lg:gap-2.5" 
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))' }}
            >
              {currentSlice.map(ep => {
                const isFiller = fillerData && fillerData[ep]?.isFiller;
                const isMixed = fillerData && fillerData[ep]?.isMixed;
                return (
                  <button
                    key={ep}
                    onClick={() => setActiveEpisode(ep)}
                    disabled={isW2GNonHost}
                    title={isW2GNonHost ? "Only the host can change episodes" : isFiller ? "Filler Episode" : isMixed ? "Mixed Canon/Filler" : ""}
                    className={`aspect-square w-full flex items-center justify-center text-[12px] font-bold transition-colors rounded-[4px] relative overflow-hidden ${
                      activeEpisode === ep
                        ? "bg-discord-600 text-white shadow-md shadow-discord-600/20"
                        : isW2GNonHost
                          ? "bg-[#1a1a1a] text-white/20 cursor-not-allowed"
                          : watchedEpisodes.includes(ep)
                            ? "bg-[#1a1a1a] text-white/30 hover:bg-[#2a2a2a] hover:text-white"
                            : isFiller
                              ? "bg-amber-950/40 text-amber-500 hover:bg-amber-900/60 hover:text-amber-300 border border-amber-500/20"
                              : isMixed
                                ? "bg-emerald-950/40 text-emerald-500 hover:bg-emerald-900/60 hover:text-emerald-300 border border-emerald-500/20"
                                : "bg-[#2a2a2a] text-white/90 hover:bg-white hover:text-black hover:shadow-lg"
                    }`}
                  >
                    {ep}
                    {isFiller && activeEpisode !== ep && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500/50" />}
                    {isMixed && activeEpisode !== ep && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500/50" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
