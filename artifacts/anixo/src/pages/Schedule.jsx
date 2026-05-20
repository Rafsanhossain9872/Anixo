import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useLanguage } from "../context/LanguageContext";
import { Clock, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AlphabetNav from "../components/home/AlphabetNav";

export default function Schedule() {
  const [clock, setClock] = useState(new Date());
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Get next 7 days timestamps
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const start = Math.floor(d.getTime() / 1000);
    const end = start + 86400;
    days.push({ date: new Date(d), start, end });
  }

  const startTs = days[0].start;
  const endTs = days[days.length - 1].end;

  const { data: scheduleData = [], isLoading } = useQuery({
    queryKey: ["full-schedule", startTs, endTs],
    queryFn: () => getSchedule(startTs, endTs),
    staleTime: 5 * 60 * 1000,
  });

  // Group schedule by day
  const grouped = days.map(({ date, start, end }) => {
    return {
      date,
      items: scheduleData
        .filter((s) => s.airingAt >= start && s.airingAt < end && !s.media?.isAdult)
        .sort((a, b) => a.airingAt - b.airingAt),
    };
  });

  const formatTime = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const dayLabel = (d) => {
    const isToday = new Date().toDateString() === d.toDateString();
    if (isToday) return "TODAY";
    return d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  };

  const dateLabel = (d) => {
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="max-w-[1720px] mx-auto px-2 md:px-4 pt-24 pb-12">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-white mb-1">Airing Schedule</h1>
          <p className="text-white/40 text-sm font-medium">
             Release times are automatically synced to <b>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}</b> (GMT {(-clock.getTimezoneOffset() / 60 >= 0 ? "+" : "") + (-clock.getTimezoneOffset() / 60)}:00)
          </p>
        </div>

        {/* Schedule Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse bg-[#121212] rounded-xl h-[400px] border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {grouped.map(({ date, items }, idx) => (
              <div key={idx} className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-lg transition-transform hover:scale-[1.01]">
                {/* Day Header */}
                <div className={`p-4 flex items-center justify-between border-b border-white/5 ${new Date().toDateString() === date.toDateString() ? "bg-red-600/5 group" : "bg-white/[0.01]"
                  }`}>
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-black tracking-widest uppercase ${new Date().toDateString() === date.toDateString() ? "text-red-500" : "text-white/30"
                      }`}>
                      {dayLabel(date)}
                    </span>
                    <span className="text-[16px] font-black text-white/90">
                      {dateLabel(date)}
                    </span>
                  </div>
                  <Calendar size={18} className="text-white/10" />
                </div>

                {/* Items */}
                <div className="flex-1 p-2 space-y-1">
                  {items.length === 0 ? (
                    <div className="h-[100px] flex items-center justify-center">
                      <span className="text-[11px] font-bold text-white/10 uppercase tracking-widest italic">No releases</span>
                    </div>
                  ) : (
                    items.map((item) => {
                      const isPast = item.airingAt * 1000 < Date.now();
                      return (
                        <div
                          key={item.id}
                          onClick={() => navigate(`/watch/${item.media?.id}`)}
                          className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer group ${isPast ? "opacity-60" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                            <div className="w-[45px] py-1 bg-white/5 rounded flex flex-col items-center">
                              <span className={`text-[10px] font-black tabular-nums ${isPast ? "text-white/30" : "text-white/100"}`}>
                                {formatTime(item.airingAt)}
                              </span>
                            </div>
                            <span className={`text-[10px] uppercase ${isPast ? "text-red-900/40" : "text-red-600/60"}`}>
                              AIRING
                            </span>
                          </div>
                          <div className="flex-1 space-y-1 overflow-hidden">
                            <h3 className={`text-sm font-medium transition-colors truncate flex-1 ${isPast ? "text-white/70 line-through" : "text-white/80 group-hover:text-white"}`}>
                              {getTitle(item.media?.title)}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] bg-white/5 px-1.5 rounded uppercase tracking-wider ${isPast ? "text-white/10" : "text-white/30"}`}>
                                EP {item.episode}
                              </span>
                              {item.media?.format && (
                                <span className={`text-[9px] uppercase ${isPast ? "text-white/5" : "text-white/15"}`}>
                                  {item.media.format}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alphabet Navigation Section */}
        <div className="mt-20 pt-10 border-t border-white/[0.02]">
          <AlphabetNav />
        </div>
      </main>

      <Footer />
    </div>
  );
}
