import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SeasonsSection({ stableSeasons, getTitle }) {
  if (!stableSeasons || stableSeasons.length === 0) return null;

  return (
    <section className="py-8 my-10 bg-[#0d0d0d]/80 border border-white/5 rounded-[4px] animate-in fade-in duration-700">
      <header className="mb-8 px-6 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-white tracking-wide">
          Seasons
        </h2>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <button className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-6">
        {stableSeasons.map((item) => (
          <Link
            key={item.id}
            to={item.isActive ? "#" : `/watch/${item.id}`}
            onClick={(e) => item.isActive && e.preventDefault()}
            className={`flex-shrink-0 relative group transition-all duration-500 rounded-[8px] overflow-hidden border ${item.isActive
                ? 'border-red-600/60 shadow-[0_0_25px_rgba(220,38,38,0.2)]'
                : 'border-white/5 hover:border-white/20'
              }`}
            style={{ width: '200px', height: '110px' }}
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={item.coverImage?.large || item.coverImage?.medium}
                alt=""
                className={`w-full h-full object-cover transition-all duration-700 ${item.isActive ? 'scale-110 opacity-70' : 'opacity-40 group-hover:opacity-60'
                  }`}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${item.isActive ? 'from-red-950/90 via-black/40 to-transparent' : 'from-black/90 via-black/20 to-transparent'}`} />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-end p-4">
              <h3 className={`text-[12px] font-black uppercase tracking-tight mb-1 text-center line-clamp-1 transition-all ${item.isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                }`}>
                {getTitle(item.title)}
              </h3>

              {/* Episodes Badge */}
              <div className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider transition-all ${item.isActive
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/40 group-hover:bg-white/20'
                }`}>
                {item.episodes || '?'} Eps
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
