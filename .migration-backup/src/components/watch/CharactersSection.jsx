import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function CharactersSection({ characters }) {
  const [showAllChars, setShowAllChars] = useState(false);

  if (!characters?.edges?.length) return null;

  const charLimit = showAllChars ? characters.edges.length : 12;
  const hasMore = characters.edges.length > 12;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-6 w-1 bg-red-600 rounded-full" />
          <h2 className="text-[14px] font-bold tracking-[0.3em] text-white uppercase">Character Cast</h2>
        </div>
        <span className="text-[10px] font-medium text-white/20 uppercase tracking-widest hidden sm:block">
          {characters.edges.length} Characters
        </span>
      </header>

      {/* Mobile: Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:hidden -mx-4 px-4">
        {characters.edges.slice(0, charLimit).map(edge => (
          <Link
            key={edge.node.id}
            to={`/character/${edge.node.id}`}
            className="group flex-shrink-0 w-[130px] snap-start"
          >
            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-2">
              <img
                src={edge.node.image?.large}
                alt={edge.node.name?.userPreferred}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-[11px] font-semibold text-white truncate leading-tight">{edge.node.name?.userPreferred}</p>
                <p className="text-[8px] font-medium text-white/40 uppercase tracking-wider mt-0.5">{edge.role}</p>
              </div>
            </div>
            {edge.voiceActors?.[0] && (
              <div className="flex items-center gap-1.5 px-1">
                <img
                  src={edge.voiceActors[0].image?.large}
                  alt={edge.voiceActors[0].name?.userPreferred}
                  className="w-5 h-5 rounded-full object-cover border border-white/10"
                  loading="lazy"
                />
                <span className="text-[9px] text-white/30 truncate">{edge.voiceActors[0].name?.userPreferred}</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Desktop: Grid Layout */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {characters.edges.slice(0, charLimit).map(edge => (
          <Link
            key={edge.node.id}
            to={`/character/${edge.node.id}`}
            className="group flex bg-[#0d0d0d] rounded-sm overflow-hidden border border-white/5 h-[76px] transition-all hover:bg-[#111] hover:border-red-600/30"
          >
            {/* Character Side */}
            <div className="relative w-14 h-full overflow-hidden shrink-0">
              <img src={edge.node.image?.large} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col justify-center px-3 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-white transition-colors group-hover:text-red-500 truncate">{edge.node.name?.userPreferred}</span>
              <span className="text-[8px] font-medium text-white/20 uppercase tracking-widest truncate">{edge.role}</span>
            </div>
            {/* Voice Actor Side */}
            {edge.voiceActors?.[0] && (
              <>
                <div className="flex flex-col justify-center px-3 items-end flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-white/50 truncate">{edge.voiceActors[0].name?.userPreferred}</span>
                  <span className="text-[7px] font-medium text-white/10 uppercase tracking-wider">Japanese</span>
                </div>
                <div className="relative w-14 h-full overflow-hidden shrink-0 border-l border-white/5">
                  <img src={edge.voiceActors[0].image?.large} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* View More / View Less Button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowAllChars(!showAllChars)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-sm text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest"
          >
            <ChevronDown size={14} className={`transition-transform duration-300 ${showAllChars ? 'rotate-180' : ''}`} />
            {showAllChars ? 'View Less' : `View More (${characters.edges.length - 12})`}
          </button>
        </div>
      )}
    </div>
  );
}
