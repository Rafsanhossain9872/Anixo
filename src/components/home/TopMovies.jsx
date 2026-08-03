import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Calendar, Star } from "lucide-react";
import { getTopMovies } from "../../services/api";
import { optimizeImage } from "../../utils/image";
import { useLanguage } from "../../context/LanguageContext";
import { getWatchUrl } from "../../utils/url";
import { useState } from "react";

function TopMoviesCard({ anime }) {
  const [imgError, setImgError] = useState(false);
  const { getTitle } = useLanguage();
  
  return (
    <Link
      to={getWatchUrl(anime?.id, anime?.title)}
      className="group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] p-2.5 rounded-xl border border-white/[0.05] transition-colors duration-300 overflow-hidden min-w-0"
    >
      {/* Poster */}
      <div className="relative w-[60px] h-[84px] overflow-hidden rounded-[8px] bg-[#111] shrink-0">
        {!imgError ? (
          <img
            src={optimizeImage(anime?.coverImage?.large, 200)}
            alt={getTitle(anime?.title)}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-bold text-white group-hover:text-discord-400 transition-colors truncate leading-snug">
          {getTitle(anime?.title)}
        </h4>
        
        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-white/50">
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-white text-[10px]">MOVIE</span>
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-white/40" />
            {anime?.seasonYear || "TBA"}
          </span>
          <span className="flex items-center gap-1 text-yellow-500">
            <Star size={12} className="fill-current" />
            {anime?.averageScore || "NR"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function TopMovies() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["topMovies"],
    queryFn: async () => {
      const res = await getTopMovies();
      return res;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return (
    <div className="flex flex-col min-w-0 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-5 bg-discord-600 rounded-full" />
          <h2 className="text-lg font-extrabold text-white uppercase leading-tight tracking-tight">
            TOP MOVIES
          </h2>
        </div>
        <span
          onClick={() => navigate("/browse?format=MOVIE")}
          className="w-6 h-6 bg-discord-600 rounded-[3px] flex items-center justify-center text-white cursor-pointer hover:bg-discord-700 transition-colors"
        >
          <ArrowUpRight size={14} />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[84px] bg-white/5 rounded-xl animate-pulse" />
          ))
        ) : error || !data?.media ? (
          <div className="text-red-400 text-sm py-4">Failed to load top movies.</div>
        ) : (
          data.media.slice(0, 10).map((anime) => (
            <TopMoviesCard key={anime?.id} anime={anime} />
          ))
        )}
      </div>
    </div>
  );
}
