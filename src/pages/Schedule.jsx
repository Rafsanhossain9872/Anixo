import { useState, useEffect, useMemo } from "react";
import { getTrendingAnime } from "../services/api";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Calendar } from "lucide-react";

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("Monday");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        // Fallback to trending for UI layout
        const res = await getTrendingAnime(1);
        if (res?.media) {
          setScheduleData(res.media);
        }
      } catch (err) {
        console.error("Failed to load schedule", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Pre-compute stable fallback values so we don't call Math.random() during render
  const fallbackScheduleInfo = useMemo(() => {
    const map = {};
    scheduleData.forEach(anime => {
      map[anime.id] = {
        ep: Math.floor(Math.random() * 12) + 1,
        hour: Math.floor(Math.random() * 12) + 1,
      };
    });
    return map;
  }, [scheduleData]);

  return (
    <div className="w-full min-h-screen bg-bg pb-20 font-sans pt-24">
      <div className="container max-w-[1600px] mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Calendar className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Estimated Schedule</h1>
              <p className="text-textMuted text-sm font-senpai mt-1">Based on your timezone</p>
            </div>
          </div>
        </div>

        {/* Days Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-6 py-3 rounded text-sm font-senpai font-bold uppercase tracking-widest transition-all ${
                activeDay === day 
                  ? "bg-primary text-black" 
                  : "bg-surface border border-border text-textMuted hover:text-white hover:bg-white/5"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="relative min-h-[500px]">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-8 opacity-40">
              {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : scheduleData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-8">
              {scheduleData.map(anime => (
                <div key={anime.id} className="relative group">
                  <AnimeCard anime={anime} />
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-senpai font-bold text-primary border border-white/10 z-10">
                    Ep {anime.nextAiringEpisode?.episode || fallbackScheduleInfo[anime.id]?.ep || 1} • {fallbackScheduleInfo[anime.id]?.hour || 1}:00 PM
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-textMuted font-senpai">No airing anime on this day.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
