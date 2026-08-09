import { useState, useEffect } from "react";
import { getTrendingAnime, getPopularAnime } from "../services/api";
import AnimeRow from "../components/home/AnimeRow";
import { Search } from "lucide-react";

export default function Stories() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");

  const tags = ["All", "Action", "Romance", "Fantasy", "Thriller", "Slice of Life"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendRes, popRes] = await Promise.all([
          getTrendingAnime(1),
          getPopularAnime(1)
        ]);
        setTrending(trendRes?.media || []);
        setPopular(popRes?.media || []);
      } catch (e) {
        console.error("Failed to load stories data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const heroStory = trending.length > 0 ? trending[0] : null;

  return (
    <div className="w-full min-h-screen bg-bg pb-20 font-sans">
      
      {/* Cinematic Spotlight Hero */}
      <div className="relative w-full h-[600px] mb-8">
        {heroStory ? (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <img 
                src={heroStory.bannerImage || heroStory.coverImage?.extraLarge} 
                alt="Spotlight"
                className="w-full h-full object-cover blur-xl opacity-40 scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
            </div>
            
            <div className="relative h-full container max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-center gap-10 pt-20">
              <div className="w-48 md:w-64 shrink-0 shadow-2xl rounded-lg overflow-hidden border border-white/10 group">
                <img 
                  src={heroStory.coverImage?.extraLarge} 
                  alt="Cover"
                  className="w-full h-full object-cover aspect-[2/3] group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex-1 text-center md:text-left max-w-2xl">
                <span className="text-accent font-senpai text-xs font-bold tracking-widest uppercase mb-2 block">Premium Webtoon</span>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{heroStory.title?.english || heroStory.title?.romaji}</h1>
                <p className="text-textMuted text-sm md:text-base line-clamp-3 mb-6 italic">{heroStory.description?.replace(/<[^>]*>?/gm, '')}</p>
                <button className="bg-primary text-black px-8 py-3 rounded font-black uppercase tracking-widest text-sm hover:bg-yellow-400 transition-colors">Read Now</button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-surface/50 animate-pulse" />
        )}
      </div>

      {/* Dynamic Search & Tags */}
      <div className="container max-w-[1600px] mx-auto px-4 md:px-8 mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
            <input 
              type="text" 
              placeholder="Search stories, authors, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-full py-3 pl-12 pr-4 text-white font-senpai text-sm focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-full font-senpai text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTag === tag ? "bg-white text-black" : "bg-surface border border-border text-textMuted hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Distinct Cover Art Grids */}
      <div className="stories-grids">
        <AnimeRow 
          title="Trending Stories" 
          subtitle="Top Reads Today"
          data={trending.slice(1)} 
          isLoading={isLoading} 
          isScrollable={true} 
        />
        <AnimeRow 
          title="New Arrivals" 
          subtitle="Fresh Chapters"
          data={popular} 
          isLoading={isLoading} 
          isScrollable={true} 
        />
      </div>
    </div>
  );
}
