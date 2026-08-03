import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", 
  "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", 
  "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller"
];

export default function GenreNav() {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full bg-[#111] border-y border-white/[0.05] py-3 relative group">
      <div className="max-w-[1720px] mx-auto px-4 relative flex items-center">
        {/* Left Button */}
        <button 
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-gradient-to-r from-[#111] via-[#111] to-transparent text-white/50 hover:text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Scrollable Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-3 md:gap-6 px-6"
        >
          {GENRES.map(genre => (
            <button
              onClick={() => navigate(`/browse?genre=${genre}`)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#1A1A1E] text-white/60 text-[13px] font-medium hover:text-white hover:bg-discord-600 transition-colors duration-150 border border-white/[0.05]"
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Right Button */}
        <button 
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-gradient-to-l from-[#111] via-[#111] to-transparent text-white/50 hover:text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
