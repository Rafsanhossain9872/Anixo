import { useState } from "react";
import { Tv, Heart, Star, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getWatchUrl } from "../../utils/url";
import { optimizeImage } from "../../utils/image";

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 py-2.5 px-2 -mx-2 border-b border-white/[0.05] last:border-0">
      <div className="w-[60px] h-[84px] rounded-[6px] bg-[#1a1a1a] animate-pulse shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-3.5 bg-[#1a1a1a] rounded animate-pulse w-full" />
        <div className="flex gap-2">
          <div className="h-2.5 bg-[#1a1a1a] rounded animate-pulse w-8" />
          <div className="h-2.5 bg-[#1a1a1a] rounded animate-pulse w-12" />
        </div>
      </div>
    </div>
  );
}

function ListItem({ anime }) {
  const { t } = useTranslation();
  const { getTitle } = useLanguage();
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-4 py-2.5 px-2 -mx-2 cursor-pointer group border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] rounded-xl transition-colors duration-300"
      onClick={() => navigate(getWatchUrl(anime.id, anime.title))}
    >
      <div className="relative overflow-hidden rounded-[8px] shrink-0 bg-[#111]">
        <img
          src={optimizeImage(anime.coverImage?.extraLarge || anime.coverImage?.large, 200)}
          alt={getTitle(anime.title)}
          loading="lazy"
          onLoad={(e) => e.target.classList.remove("opacity-0")}
          className="w-[60px] h-[84px] object-cover opacity-0 transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0 mt-[7px]" />
          <p className="text-[14px] font-bold text-[#e5e5e5] truncate group-hover:text-discord-400 transition-colors leading-snug">
            {getTitle(anime.title)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-3">
          <span className="text-[11px] font-bold text-white/50 bg-white/5 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
            {anime.format || "TV"}
          </span>
          {anime.seasonYear && (
             <span className="text-[11px] font-bold text-white/50 flex items-center gap-1">
               <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                 <line x1="16" y1="2" x2="16" y2="6" />
                 <line x1="8" y1="2" x2="8" y2="6" />
                 <line x1="3" y1="10" x2="21" y2="10" />
               </svg>
               {anime.seasonYear}
             </span>
          )}
          {anime.episodes && (
             <span className="text-[11px] font-bold text-white/50 flex items-center gap-1">
               <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="2" y="2" width="20" height="15" rx="2" ry="2" />
                 <path d="M17 2v15" />
                 <path d="M7 2v15" />
                 <path d="M2 7h20" />
                 <path d="M2 12h20" />
                 <path d="M8 22h8" />
                 <path d="M12 17v5" />
               </svg>
               {anime.episodes}
             </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, hasArrow = false, path }) {
  const navigate = useNavigate();
  const content = (
    <div className="flex items-center gap-2.5">
      <h2 className="text-[16px] md:text-[18px] font-bold text-white uppercase leading-tight tracking-tight flex items-center gap-2">
        {hasArrow && <ArrowUpRight size={18} className="text-white/60" />}
        {title}
      </h2>
    </div>
  );

  return (
    <div className="flex items-center justify-between mb-4">
      {path ? (
        <Link to={path} className="group hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

export default function TwoColumnSection({ leftData, leftTitle, leftPath, rightData, rightTitle, rightPath, isLoading }) {
  return (
    <section className="mt-8 mb-8 w-full overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
        
        {/* ── LEFT COLUMN ── */}
        <div className="w-full">
          <SectionHeader title={leftTitle} hasArrow={!!leftPath} path={leftPath} />
          <div className="w-full">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : leftData?.slice(0, 6).map((anime, i) => (
                <ListItem key={`l-${anime.id}-${i}`} anime={anime} />
              ))
            }
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-full">
          <SectionHeader title={rightTitle} hasArrow={!!rightPath} path={rightPath} />
          <div className="w-full">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : rightData?.slice(0, 6).map((anime, i) => (
                <ListItem key={`r-${anime.id}-${i}`} anime={anime} />
              ))
            }
          </div>
        </div>

      </div>
    </section>
  );
}
