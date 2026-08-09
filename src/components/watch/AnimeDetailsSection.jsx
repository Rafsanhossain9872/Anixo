import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import parse from "html-react-parser";
import { Star, Clock, Tag, Calendar, ChevronDown, ChevronUp, Play, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AnimeDetailsSection({
  anime, resolvedInfo, getTitle, activeServer, streamUrl
}) {
  const { t } = useTranslation();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  if (!anime) return null;

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'releasing':
      case 'currently airing':
        return 'text-discord-500';
      case 'finished':
      case 'finished airing':
        return 'text-green-500';
      case 'not_yet_released':
      case 'upcoming':
        return 'text-yellow-500';
      default:
        return 'text-white/60';
    }
  };

  const getStatusText = (status) => {
    switch(status?.toLowerCase()) {
      case 'releasing': return 'Currently Airing';
      case 'finished': return 'Finished Airing';
      case 'not_yet_released': return 'Not Yet Released';
      default: return status || 'Unknown';
    }
  };

  const sanitizedDesc = resolvedInfo.description ? DOMPurify.sanitize(resolvedInfo.description) : "No description available.";
  const showMoreRequired = sanitizedDesc.length > 250;
  
  const displayDesc = showMoreRequired && !isDescExpanded
    ? sanitizedDesc.substring(0, 250) + "..."
    : sanitizedDesc;

  return (
    <section className="mt-6 lg:mt-10 animate-in fade-in duration-1000 px-0 sm:px-4">
      <div className="bg-[#121316] rounded-[20px] p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 max-w-[1200px] mx-auto border border-white/[0.02] shadow-2xl relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-discord-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Poster Column */}
        <div className="w-[140px] sm:w-[180px] md:w-[200px] shrink-0 mx-auto md:mx-0">
          <div className="relative group overflow-hidden rounded-xl bg-[#0a0a0a] shadow-lg aspect-[2/3] w-full">
            {anime.coverImage && (
              <img
                src={anime.coverImage.extraLarge || anime.coverImage.large}
                alt={getTitle(anime.title)}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          
          <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-white leading-tight mb-4 line-clamp-2 font-mono tracking-tight">
            {getTitle(anime.title)}
          </h1>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 bg-[#1a1b1f] border border-white/5 rounded-full px-3 py-1.5 text-yellow-500">
              <Star size={12} fill="currentColor" />
              <span>{resolvedInfo.mal_score || anime.averageScore || "?"}</span>
            </div>
            <div className="bg-[#1a1b1f] border border-white/5 rounded-full px-3 py-1.5 text-[#6993ff]">
              HD
            </div>
            <div className="flex items-center gap-1.5 bg-[#142820] border border-[#34d399]/20 rounded-full px-3 py-1.5 text-[#34d399] uppercase">
              <span className="bg-[#34d399] text-[#142820] text-[9px] px-1 rounded-sm font-black">CC</span>
              <span>SUB {anime.episodes || "?"}</span>
            </div>
            <div className="bg-[#1a1b1f] border border-white/5 rounded-full px-3 py-1.5 text-white/50">
              {anime.episodes ? `${anime.episodes} eps` : "? eps"}
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5 text-[11px] text-white/50 uppercase tracking-widest font-medium">
            <div className="flex items-center gap-1.5">
              <Tag size={12} className="text-white/30" />
              <span className="text-white/30">TYPE</span>
              <span className="text-white/80">{anime.format || "TV"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/30">STATUS</span>
              <span className={getStatusColor(resolvedInfo.status || anime.status)}>{getStatusText(resolvedInfo.status || anime.status)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-white/30" />
              <span className="text-white/30">AIRED</span>
              <span className="text-white/80">{resolvedInfo.aired || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/30">STUDIO</span>
              <span className="text-white/80 truncate max-w-[150px]">{resolvedInfo.studios || "N/A"}</span>
            </div>
          </div>

          {/* Schedule Row (Next Episode) - Only show if releasing and nextAiringEpisode exists */}
          {anime.nextAiringEpisode && (
            <div className="flex flex-wrap items-center gap-3 mb-5 p-2 pr-4 bg-[#1a1317] border border-[#3a1d28] rounded-full w-fit">
              <div className="flex items-center gap-1.5 text-[#f4a1ce] text-[10px] font-bold uppercase tracking-wider px-2">
                <Clock size={12} />
                <span>NEXT</span>
              </div>
              <div className="bg-[#2a1b22] text-[#f4a1ce] text-[11px] font-bold px-2 py-0.5 rounded uppercase">
                EP {anime.nextAiringEpisode.episode}
              </div>
              <div className="text-white/70 text-[11px] font-medium">
                {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-yellow-600 font-bold text-[11px]">
                in {Math.ceil((anime.nextAiringEpisode.airingAt * 1000 - Date.now()) / 86400000)} days
              </div>
            </div>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(resolvedInfo.genres || anime.genres || []).map(g => (
              <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-4 py-1.5 bg-[#1a1b1f] border border-white/10 rounded-full text-[11px] font-bold text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer">
                {g}
              </Link>
            ))}
          </div>

          {/* Description - Monospaced */}
          <div className="text-[13px] sm:text-[14px] text-white/60 leading-relaxed font-mono relative">
            <div className="break-words">
              {parse(displayDesc)}
            </div>
            
            {showMoreRequired && (
              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="flex items-center gap-1 mt-3 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest"
              >
                {isDescExpanded ? 'SHOW LESS' : 'SHOW MORE'}
                {isDescExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {/* Download Button (All Servers) */}
          {streamUrl && (
            <button
              onClick={() => {
                if (activeServer === 4) {
                  const downloadUrl = streamUrl.includes('#')
                    ? streamUrl.replace('#', '&download=1#')
                    : `${streamUrl}&download=1`;
                  window.open(downloadUrl, '_blank');
                } else {
                  window.open(streamUrl, '_blank');
                }
              }}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mt-6 uppercase text-[10px] tracking-widest font-bold"
              title="Download / Open External Stream"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
              <span>{activeServer === 4 ? t('details.download') : 'Download / External'}</span>
            </button>
          )}

        </div>
      </div>
    </section>
  );
}
