import { useState } from "react";
import { Tv, Heart, Star, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getWatchUrl } from "../../utils/url";

/* ── Skeleton Loaders ── */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 py-2.5 px-2 -mx-2 border-b border-white/15 last:border-0">
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

function SkeletonRankedItem({ featured }) {
  if (featured) {
    return (
      <div className="mb-4 relative rounded-xl overflow-hidden aspect-[16/9] w-full bg-[#1a1a1a] animate-pulse" />
    );
  }
  return (
    <div className="flex items-center gap-4 py-2.5 px-2 -mx-2 border-b border-white/15 last:border-0">
      <div className="w-8 h-8 bg-[#1a1a1a] rounded-full animate-pulse shrink-0" />
      <div className="w-[60px] h-[84px] rounded-[6px] bg-[#1a1a1a] animate-pulse shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-3.5 bg-[#1a1a1a] rounded animate-pulse w-3/4" />
        <div className="flex gap-2">
          <div className="h-2.5 bg-[#1a1a1a] rounded animate-pulse w-10" />
          <div className="h-2.5 bg-[#1a1a1a] rounded animate-pulse w-8" />
        </div>
      </div>
    </div>
  );
}

/* ── Small list item (used in New Releases & Just Completed) ── */
function ListItem({ anime }) {
  const { t } = useTranslation();
  const { getTitle } = useLanguage();
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-4 py-2.5 px-2 -mx-2 cursor-pointer group border-b border-white/15 last:border-0 hover:bg-white/[0.03] rounded-xl transition-all duration-300"
      onClick={() => navigate(getWatchUrl(anime.id, anime.title))}
    >
      <div className="relative overflow-hidden rounded-[6px] shrink-0 shadow-md ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-300">
        <img
          src={anime.coverImage?.extraLarge || anime.coverImage?.large}
          alt={getTitle(anime.title)}
          loading="lazy"
          onLoad={(e) => e.target.classList.remove("opacity-0")}
          className="w-[60px] h-[84px] object-cover opacity-0 transition-transform duration-500 group-hover:scale-110 bg-[#1a1a1a]"
          style={{ imageRendering: 'auto' }}
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-[#e5e5e5] truncate group-hover:text-discord-400 transition-colors leading-snug">
          {getTitle(anime.title)}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[9px] font-bold text-white/60 bg-white/5 px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider">
            {anime.format || "TV"}
          </span>
          {anime.averageScore && (
            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-[3px] flex items-center gap-1">
              <Star size={9} fill="currentColor" /> {anime.averageScore}%
            </span>
          )}
          {anime.status === "NOT_YET_RELEASED" ? (
            <span className="text-[9px] font-black bg-discord-500/10 text-discord-400 px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider">
              {t('threeColumn.upcoming')}
            </span>
          ) : (
            <span className="text-[9px] text-white/60 font-medium flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-[3px]">
              <Tv size={9} /> {anime.episodes || "?"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Ranked item (used in Most Viewed) ── */
function RankedItem({ anime, rank, featured }) {
  const { t } = useTranslation();
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  if (featured) {
    return (
      <div className="cursor-pointer group mb-4 relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover:ring-discord-500/50 transition-all duration-500" onClick={() => navigate(getWatchUrl(anime.id, anime.title))}>
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1a1a1a]">
          <img
            src={anime.coverImage?.large}
            alt={getTitle(anime.title)}
            loading="lazy"
            onLoad={(e) => e.target.classList.remove("opacity-0")}
            className="w-full h-full object-cover opacity-0 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </div>
        
        {/* Large rank number overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 z-10">
          <span className="text-[64px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 leading-none italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            {rank}
          </span>
          <div className="pb-1.5 flex-1 min-w-0">
            <p className="text-[14px] font-black text-white leading-tight uppercase group-hover:text-discord-400 transition-colors drop-shadow-md truncate">
              {getTitle(anime.title)}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] font-bold uppercase tracking-wider text-white/80">
              {anime.status === "NOT_YET_RELEASED" ? (
                <span className="bg-discord-500/30 text-discord-100 px-1.5 py-0.5 rounded-[3px] backdrop-blur-md">{t('threeColumn.upcoming')}</span>
              ) : (
                <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-[3px] backdrop-blur-md"><Tv size={10} className="text-white" /> {anime.episodes || "?"}</span>
              )}
              <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-[3px] backdrop-blur-md"><Heart size={10} fill="currentColor" className="text-discord-400" /> {anime.favourites || "?"}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-[3px] backdrop-blur-md">{anime.format}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-4 py-2.5 px-2 -mx-2 cursor-pointer group border-b border-white/15 last:border-0 hover:bg-white/[0.03] rounded-xl transition-all duration-300"
      onClick={() => navigate(getWatchUrl(anime.id, anime.title))}
    >
      <span className="text-[32px] font-black italic text-white/10 group-hover:text-discord-500 transition-all duration-300 w-8 text-center select-none group-hover:-translate-y-1 drop-shadow-sm">
        {rank}
      </span>
      <div className="relative overflow-hidden rounded-[6px] shrink-0 shadow-md ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-300">
        <img
          src={anime.coverImage?.extraLarge || anime.coverImage?.large}
          alt={getTitle(anime.title)}
          loading="lazy"
          onLoad={(e) => e.target.classList.remove("opacity-0")}
          className="w-[60px] h-[84px] object-cover opacity-0 transition-transform duration-500 group-hover:scale-110 bg-[#1a1a1a]"
          style={{ imageRendering: 'auto' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-[#e5e5e5] truncate group-hover:text-discord-400 transition-colors leading-tight uppercase">
          {getTitle(anime.title)}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[9px] font-bold uppercase tracking-wider text-white/60">
          {anime.status === "NOT_YET_RELEASED" ? (
             <span className="bg-discord-500/10 text-discord-400 px-1.5 py-0.5 rounded-[3px]">{t('threeColumn.upcoming')}</span>
          ) : (
             <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-[3px]"><Tv size={9} /> {anime.episodes || "?"}</span>
          )}
          <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-[3px] text-white/80"><Heart size={9} fill="currentColor" className="text-discord-500/80" /> {anime.favourites || "?"}</span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded-[3px]">{anime.format}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Section title with arrow ── */
function SectionHeader({ title, hasArrow = false, path }) {
  const navigate = useNavigate();
  const lines = title.split("\n");
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-5 bg-discord-600 rounded-full" />
        <h2 className="text-lg font-extrabold text-white uppercase leading-tight tracking-tight">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </h2>
      </div>
      {hasArrow && (
        <span
          onClick={() => path && navigate(path)}
          className="w-6 h-6 bg-discord-600 rounded-[3px] flex items-center justify-center text-white cursor-pointer hover:bg-discord-700 transition-colors"
        >
          <ArrowUpRight size={14} />
        </span>
      )}
    </div>
  );
}

/* ── Main three-column section ── */
export default function ThreeColumnSection({ newReleases, mostViewed, justCompleted, isLoading }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Day");

  return (
    <section className="mt-12 max-w-[1720px] mx-auto px-2 md:px-4 w-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-20 items-start w-full">

        {/* ── LEFT: New Releases ── */}
        <div className="w-full">
          <SectionHeader
            title={t('threeColumn.newReleases')}
            hasArrow
            path="/browse?sort=START_DATE_DESC"
          />
          <div className="w-full">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : newReleases.slice(0, 6).map((anime, i) => (
                <ListItem key={`nr-${anime.id}-${i}`} anime={anime} />
              ))
            }
          </div>
        </div>

        {/* ── CENTER: Most Viewed ── */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-5 w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-5 bg-discord-600 rounded-full" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                {t('threeColumn.mostViewed')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: t('threeColumn.day'), value: "Day" },
                { label: t('threeColumn.week'), value: "Week" },
                { label: t('threeColumn.month'), value: "Month" }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`text-[11px] md:text-[12px] font-medium transition-colors pb-[2px] ${activeTab === tab.value
                      ? "text-white border-b border-white"
                      : "text-[#666] hover:text-[#aaa]"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 w-full">
            {isLoading ? (
              <>
                <SkeletonRankedItem featured />
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRankedItem key={i} />)}
              </>
            ) : (
              <>
                {mostViewed
                  .slice(
                    activeTab === "Day" ? 0 : activeTab === "Week" ? 6 : 12,
                    activeTab === "Day" ? 6 : activeTab === "Week" ? 12 : 18
                  )
                  .slice(0, 6)
                  .map((anime, i) => (
                    <RankedItem key={`mv-${activeTab}-${anime.id}-${i}`} anime={anime} rank={i + 1} featured={i === 0} />
                  ))}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Just Completed ── */}
        <div className="w-full">
          <SectionHeader
            title={t('threeColumn.justCompleted')}
            hasArrow
            path="/browse?status=FINISHED"
          />
          <div className="w-full">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : justCompleted.slice(0, 6).map((anime, i) => (
                <ListItem key={`jc-${anime.id}-${i}`} anime={anime} />
              ))
            }
          </div>
        </div>

      </div>
    </section>
  );
}
