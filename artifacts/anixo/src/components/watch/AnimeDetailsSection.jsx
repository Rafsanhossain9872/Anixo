import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Download, Frown, Smile, CheckCircle2 } from "lucide-react";

export default function AnimeDetailsSection({
  anime, resolvedInfo, getTitle, activeServer, streamUrl,
  userRating, setUserRating
}) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  if (!anime) return null;

  return (
    <section className="py-8 lg:py-12 border-t border-white/5 mt-6 lg:mt-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Poster Column */}
        <div className="w-[180px] sm:w-[220px] shrink-0 mx-auto md:mx-0">
          <div className="relative group overflow-hidden rounded-[4px] border border-white/10 shadow-2xl aspect-[2/3] w-full">
            {anime.coverImage && (
              <img
                src={anime.coverImage.extraLarge || anime.coverImage.large}
                alt={getTitle(anime.title)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-[32px] font-bold text-white leading-tight mb-1 line-clamp-2">
              {getTitle(anime.title)}
            </h1>
            {anime.synonyms && anime.synonyms.length > 0 && (
              <p className="text-[13px] text-white/40 italic line-clamp-1 mt-1 mb-4">
                {anime.synonyms.slice(0, 3).join("; ")}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6 text-[11px] font-bold">
              <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                <span className="px-1.5 h-full bg-[#e3e3e3] text-black flex items-center">CC</span>
                <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                <span className="px-1.5 h-full bg-[#f4a1ce] text-black flex items-center justify-center"><Mic size={11} fill="currentColor" /></span>
                <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
              </div>
              <span className="bg-[#b0b0b0] text-[#111] h-6 flex items-center px-2 rounded-[2px] font-medium">{resolvedInfo.rating || "?"}</span>
              {anime.isAdult && <span className="bg-[#e3e3e3] text-black h-6 flex items-center px-2 rounded-[2px] uppercase">R</span>}
              <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.format || "TV"}</span>
              <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.duration ? `${anime.duration} min` : "? min"}</span>
            </div>
          </div>

          {/* Description */}
          <div
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className={`text-[14px] text-white/60 leading-relaxed mb-8 transition-all duration-500 cursor-pointer ${isDescExpanded ? "" : "line-clamp-4"}`}
            dangerouslySetInnerHTML={{ __html: resolvedInfo.description || "No description available." }}
          />

          {/* Grid Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-[13px] mb-8">
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[70px]">Country:</span>
              <span className="text-white/80">{resolvedInfo.country || 'Unknown'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[85px]">Premiered:</span>
              <span className="text-white/80 capitalize">{resolvedInfo.premiered || 'Unknown'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[70px]">Date aired:</span>
              <span className="text-white/80">{resolvedInfo.aired || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[70px]">Episodes:</span>
              <span className="text-white/80">{resolvedInfo.episodes || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[85px]">Duration:</span>
              <span className="text-white/80">{resolvedInfo.duration || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[70px]">Status:</span>
              <span className="text-white/80 capitalize">{resolvedInfo.status || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[85px]">MAL Score:</span>
              <span className="text-white/80">{resolvedInfo.mal_score || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[70px]">Links:</span>
              <div className="flex items-center gap-1">
                {anime.idMal && <a href={`https://myanimelist.net/anime/${anime.idMal}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors">MAL</a>}
                {anime.idMal && <span className="text-white/80">,</span>}
                {anime.id && <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors ml-1">AL</a>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40 font-medium min-w-[85px]">Studios:</span>
              <span className="text-white/80 truncate">{resolvedInfo.studios || "N/A"}</span>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <span className="text-white/40 font-medium min-w-[70px]">Producers:</span>
              <span className="text-white/80 line-clamp-1">{resolvedInfo.producers || "N/A"}</span>
            </div>
          </div>

          {/* Download (Server 5 specific) */}
          {activeServer === 5 && streamUrl && (
            <button
              onClick={() => {
                const downloadUrl = streamUrl.includes('#')
                  ? streamUrl.replace('#', '&download=1#')
                  : `${streamUrl}&download=1`;
                window.open(downloadUrl, '_blank');
              }}
              className="flex items-center gap-1.5 text-white/40 hover:text-green-500 transition-all mb-4"
            >
              <Download size={15} />
              <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Download</span>
            </button>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {(resolvedInfo.genres || []).map(g => (
              <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-4 py-1 bg-white/5 border border-white/5 rounded-[4px] text-[12px] font-medium text-white/50 hover:text-white hover:border-white/20 hover:bg-white/10 transition-colors cursor-pointer">
                {g}
              </Link>
            ))}
          </div>
        </div>

        {/* Rating Section */}
        <div className="flex flex-col gap-4 w-full md:w-[280px] lg:w-[320px] shrink-0">
          <div className="bg-[#0d0d0d] border border-white/5 p-7 rounded-sm shadow-xl relative mt-0 md:mt-2 min-h-[160px] flex flex-col items-center justify-center">
            {userRating ? (
              <div className="text-center py-4 animate-in zoom-in duration-500">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 size={28} className="text-white/40" />
                </div>
                <p className="text-[14px] font-medium text-white/80 mb-1">Thank you for rating!</p>
                <p className="text-[12px] text-white/20">Your feedback is appreciated.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-[18px] font-medium text-white/80 mb-1">How'd you rate this anime?</h3>
                  <p className="text-[13px] text-white/30 font-medium">
                    {resolvedInfo.mal_score || "8.58"} / {resolvedInfo.scored_by?.toLocaleString() || "1,221"} reviews
                  </p>
                </div>
                <div className="flex items-center gap-1 w-full px-2">
                  {[
                    { icon: Frown, val: "boring" },
                    { icon: Smile, val: "decent" },
                    { icon: Smile, val: "masterpiece", isHappy: true }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserRating(item.val)}
                      className="flex-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.02] h-20 flex items-center justify-center transition-all duration-300 rounded-[2px] group"
                    >
                      <item.icon
                        size={28}
                        strokeWidth={1.5}
                        className={`text-white/30 group-hover:text-white/80 transition-colors ${item.isHappy ? 'scale-110' : ''}`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
