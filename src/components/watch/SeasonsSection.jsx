import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getWatchUrl } from "../../utils/url";

export default function SeasonsSection({ stableSeasons, getTitle }) {
 const { t } = useTranslation();
 const scrollRef = useRef(null);
 const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 250, behavior: 'smooth' });

 if (!stableSeasons || stableSeasons.length === 0) return null;

 return (
 <section className="py-8 my-10 bg-[#0d0d0d]/80 border border-white/15 rounded-[4px] animate-in fade-in duration-700">
 <header className="mb-8 px-6 flex items-center justify-between">
 <h2 className="text-[18px] font-black text-white tracking-wide">
 {t('seasons.title')}
 </h2>
 <div className="flex items-center gap-2">
 <button onClick={() => scroll(-1)} className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
 <ChevronLeft size={20} />
 </button>
 <button onClick={() => scroll(1)} className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
 <ChevronRight size={20} />
 </button>
 </div>
 </header>

 <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-6">
  {stableSeasons.map((item) => (
    <Link
      key={item.id}
      to={item.isActive ? "#" : getWatchUrl(item.id, item.title)}
      onClick={(e) => item.isActive && e.preventDefault()}
      className={`flex-shrink-0 relative group transition-all duration-300 rounded-[8px] overflow-hidden border ${
        item.isActive
          ? 'border-discord-400 shadow-[0_0_15px_rgba(88,101,242,0.3)] z-10'
          : 'border-white/10 hover:border-white/20'
      }`}
      style={{ width: '260px', height: '86px' }}
    >
      {/* Blurred Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={item.coverImage?.large || item.coverImage?.medium}
          alt=""
          className="w-full h-full object-cover opacity-30 blur-sm scale-110"
        />
        <div className="absolute inset-0 bg-black/60" />
        {/* Dotted pattern overlay */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center">
        <span className={`text-[10px] font-black tracking-widest uppercase mb-1 ${item.isActive ? 'text-discord-400' : 'text-discord-400'}`}>
          {item.relationToMain ? item.relationToMain.replace('_', ' ') : 'RELATED'}
        </span>
        
        <h3 className={`text-[13.5px] font-bold leading-tight line-clamp-1 w-full ${item.isActive ? 'text-white' : 'text-white/90 group-hover:text-white'}`}>
          {getTitle(item.title)}
        </h3>
        
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-white/50 uppercase tracking-wider">
          {item.format && !['TV', 'TV_SHORT'].includes(item.format) ? <span>{item.format.replace('_', ' ')}</span> : <span>TV</span>}
          {item.startDate?.year && (
            <>
              <span className="text-[8px]">•</span>
              <span>{item.startDate.year}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  ))}
 </div>
 </section>
 );
}
