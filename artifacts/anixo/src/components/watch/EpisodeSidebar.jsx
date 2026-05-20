import {
  ChevronLeft, ChevronRight, LayoutGrid, List,
  Search, X, MessageSquare, Mic, PlayCircle
} from "lucide-react";

export default function EpisodeSidebar({
  filteredEpisodes, episodeLayout, setEpisodeLayout,
  episodePage, setEpisodePage, EPISODES_PER_PAGE,
  activeEpisode, setActiveEpisode, watchedEpisodes,
  isEpisodeSearchOpen, setIsEpisodeSearchOpen,
  episodeSearchQuery, setEpisodeSearchQuery,
  malEpisodes, anime
}) {
  const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
  const pageStart = episodePage * EPISODES_PER_PAGE + 1;
  const pageEnd = Math.min((episodePage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
  const currentSlice = filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE);

  // Helper: resolve episode title from multiple sources
  const getEpTitle = (ep) => {
    const epData = malEpisodes?.find(e => e.mal_id === ep);
    const aniListEp = anime?.streamingEpisodes?.find(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
    ) || anime?.streamingEpisodes?.[ep - 1];
    return epData?.title
      || aniListEp?.title?.replace(/^Episode \d+\s*-\s*/i, '')
      || `Episode ${ep}`;
  };



  return (
    <aside className="lg:col-span-1 space-y-4 pt-4 lg:pt-0 animate-in fade-in slide-in-from-right duration-500 flex flex-col">
      <div
        className="bg-[#0d0d0d] border border-white/5 overflow-hidden flex flex-col h-full lg:max-h-[600px] xl:max-h-[650px]"
        style={{ clipPath: 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)' }}
      >
        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111] min-h-[60px]">
          {isEpisodeSearchOpen ? (
            <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-right-2 duration-300">
              <Search size={14} className="text-red-500 shrink-0" />
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
                <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">Episodes</h2>
                <div className="flex gap-2">
                  <MessageSquare size={12} className="text-red-500" fill="currentColor" />
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
        </header>

        {/* Range Selector */}
        {filteredEpisodes.length > 0 && (
          <div className="p-4 bg-[#0a0a0a] border-b border-white/5">
            <div className="flex items-center justify-between bg-[#161616] px-3 py-2 rounded-sm border border-white/5">
              <button disabled={episodePage === 0} onClick={() => setEpisodePage(p => p - 1)} className={`transition-colors ${episodePage > 0 ? 'text-white hover:text-red-500' : 'text-white/5'}`}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-[11px] font-bold tracking-widest text-white/80">
                {String(pageStart).padStart(3, '0')}-{String(pageEnd).padStart(3, '0')}
              </span>
              <button disabled={episodePage >= totalPages - 1} onClick={() => setEpisodePage(p => p + 1)} className={`transition-colors ${episodePage < totalPages - 1 ? 'text-white hover:text-red-500' : 'text-white/5'}`}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Episode List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar bg-[#0d0d0d]">
          {filteredEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-white/30 animate-in fade-in duration-300">
              <Search size={32} className="mb-3 opacity-20" />
              <span className="text-[13px] font-medium">No episodes found</span>
              <button onClick={() => setEpisodeSearchQuery("")} className="mt-4 text-[11px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors">
                Clear Search
              </button>
            </div>
          ) : episodeLayout === "list" && (
            <div className="flex flex-col gap-2">
              {currentSlice.map(ep => (
                <button
                  key={ep}
                  onClick={() => setActiveEpisode(ep)}
                  className={`w-full text-left flex flex-col gap-1 px-4 py-3 text-[12px] font-medium transition-all rounded-[2px] border ${activeEpisode === ep
                    ? "bg-red-600/10 text-red-500 border-red-500 shadow-lg"
                    : "bg-[#161616] text-white/70 border-white/5 hover:bg-[#202020] hover:text-white"
                    }`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 shrink-0 mt-[2px]">EP {String(ep).padStart(2, '0')}</span>
                    <span className="line-clamp-2 leading-tight flex-1">{getEpTitle(ep)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}



          {episodeLayout === "grid" && (
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {currentSlice.map(ep => (
                <button
                  key={ep}
                  onClick={() => setActiveEpisode(ep)}
                  className={`h-9 lg:h-10 flex items-center justify-center text-[11px] lg:text-[12px] font-bold transition-all rounded-[2px] border ${activeEpisode === ep
                      ? "bg-red-600 text-white border-red-500 shadow-lg"
                      : watchedEpisodes.includes(ep)
                        ? "bg-black/40 text-white/10 border-white/5 hover:bg-black/60 hover:text-white/30"
                        : "bg-[#161616] text-white/30 border-white/5 hover:bg-[#202020] hover:text-white"
                    }`}
                >
                  {ep}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
