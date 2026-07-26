import { useState } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import parse from "html-react-parser";
import { Mic, Download, Frown, Smile, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AnimeDetailsSection({
  anime, resolvedInfo, getTitle, activeServer, streamUrl,
  userRating, setUserRating
}) {
  const { t } = useTranslation();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  if (!anime) return null;

  return (
    <section className="py-8 lg:py-12 border-t border-white/15 mt-6 lg:mt-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Poster Column */}
        <div className="w-[180px] sm:w-[220px] shrink-0 mx-auto md:mx-0">
          <div className="relative group overflow-hidden rounded-[4px] border border-white/15 shadow-2xl aspect-[2/3] w-full">
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
              <p className="text-[13px] text-white/60 italic line-clamp-1 mt-1 mb-4">
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
              <Link to={`/browse?format=${(anime.format || "TV").toUpperCase()}`} className="bg-white/10 hover:bg-white/20 hover:text-white text-white/90 h-6 flex items-center px-2 rounded-[2px] uppercase transition-colors">{anime.format || "TV"}</Link>
              <span className="bg-white/10 text-white/90 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.duration ? `${anime.duration} min` : "? min"}</span>
            </div>
          </div>

          {/* Description */}
          <div
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className={`text-[14px] text-white/80 leading-relaxed mb-8 transition-all duration-500 cursor-pointer ${isDescExpanded ? "" : "line-clamp-4"}`}
          >
            {resolvedInfo.description ? parse(DOMPurify.sanitize(resolvedInfo.description)) : "No description available."}
          </div>

          {/* Grid Info */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-y-3 gap-x-6 text-[13px] mb-8">
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.country')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.country || 'Unknown'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.premiered')}</span>
              <span className="text-white/90 capitalize break-words">{resolvedInfo.premiered || 'Unknown'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.dateAired')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.aired || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.episodes')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.episodes || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.duration')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.duration || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.status')}</span>
              <span className="text-white/90 capitalize break-words">{resolvedInfo.status || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.malScore')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.mal_score || '?'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.links')}</span>
              <div className="flex items-center gap-1 flex-wrap">
                {anime.idMal && <a href={`https://myanimelist.net/anime/${anime.idMal}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-discord-500 transition-colors">{t('details.mal')}</a>}
                {anime.idMal && <span className="text-white/90">,</span>}
                {anime.id && <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-discord-500 transition-colors ml-1">AL</a>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.studios')}</span>
              <span className="text-white/90 truncate">{resolvedInfo.studios || "N/A"}</span>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <span className="text-white/60 font-medium min-w-[85px] shrink-0">{t('details.producers')}</span>
              <span className="text-white/90 break-words">{resolvedInfo.producers || "N/A"}</span>
            </div>
          </div>

          {/* Download (Server 4 specific) */}
          {activeServer === 4 && streamUrl && (
            <button
              onClick={() => {
                const downloadUrl = streamUrl.includes('#')
                  ? streamUrl.replace('#', '&download=1#')
                  : `${streamUrl}&download=1`;
                window.open(downloadUrl, '_blank');
              }}
              className="flex items-center gap-1.5 text-white/60 hover:text-green-500 transition-all mb-4"
            >
              <Download size={15} />
              <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">{t('details.download')}</span>
            </button>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {(resolvedInfo.genres || []).map(g => (
              <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-4 py-1 bg-white/5 border border-white/15 rounded-[4px] text-[12px] font-medium text-white/70 hover:text-white hover:border-white/20 hover:bg-white/10 transition-colors cursor-pointer">
                {g}
              </Link>
            ))}
          </div>
        </div>

        {/* Rating Section */}
        <div className="flex flex-col gap-4 w-full md:w-[280px] lg:w-[320px] shrink-0">
          <div className="bg-[#0d0d0d] border border-white/15 p-7 rounded-sm shadow-xl relative mt-0 md:mt-2 min-h-[160px] flex flex-col items-center justify-center">
            {userRating ? (
              <div className="text-center py-4 animate-in zoom-in duration-500">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 size={28} className="text-white/60" />
                </div>
                <p className="text-[14px] font-medium text-white/80 mb-1">{t('details.ratingThanks')}</p>
                <p className="text-[12px] text-white/40">{t('details.ratingFeedback')}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-[18px] font-medium text-white/80 mb-1">{t('details.ratingPrompt')}</h3>
                  <p className="text-[13px] text-white/50 font-medium">
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
