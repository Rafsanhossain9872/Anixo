import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  List as ListIcon,
  LayoutGrid,
  Filter,
  Calendar,
  Radio,
  Play,
  RotateCcw,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimeCard from "../common/AnimeCard";

export default function EstimatedSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [filterShow, setFilterShow] = useState(false);
  const [filters, setFilters] = useState({
    format: "ALL", // ALL, TV, MOVIE, OVA, ONA
    status: "ALL", // ALL, PAST, UPCOMING
  });
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef(null);

  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: "smooth" });
    }
  };

  // Generate 21 days (-3 days past + Today + 17 days future)
  const days = useMemo(() => {
    const list = [];
    for (let i = -3; i <= 17; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [todayStr] = useState(() => new Date().toDateString());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const scrollToToday = () => {
    setSelectedDate(new Date());
    if (scrollRef.current) {
      const todayBtn = scrollRef.current.querySelector('[data-today="true"]');
      if (todayBtn) {
        const container = scrollRef.current;
        const scrollPos =
          todayBtn.offsetLeft -
          container.offsetLeft -
          container.clientWidth / 2 +
          todayBtn.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollPos), behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const todayBtn = scrollRef.current.querySelector('[data-today="true"]');
      if (todayBtn) {
        setTimeout(() => {
          const container = scrollRef.current;
          const scrollPos =
            todayBtn.offsetLeft -
            container.offsetLeft -
            container.clientWidth / 2 +
            todayBtn.clientWidth / 2;
          container.scrollLeft = Math.max(0, scrollPos);
        }, 120);
      }
    }
  }, []);

  const startTs = Math.floor(new Date(selectedDate).setHours(0, 0, 0, 0) / 1000);
  const endTs = startTs + 86400;

  const { data: scheduleData = [], isLoading } = useQuery({
    queryKey: ["schedule-section", startTs, endTs],
    queryFn: () => getSchedule(startTs, endTs),
    staleTime: 5 * 60 * 1000,
  });

  const selectedDayItems = useMemo(() => {
    return scheduleData
      .filter((s) => {
        const itemDate = new Date(s.airingAt * 1000).toDateString();
        if (itemDate !== selectedDate.toDateString() || s.media?.isAdult) return false;

        const isPast = s.airingAt * 1000 < now;
        if (filters.status === "PAST" && !isPast) return false;
        if (filters.status === "UPCOMING" && isPast) return false;

        if (filters.format !== "ALL") {
          const format = s.media?.format || "TV";
          if (format !== filters.format) return false;
        }

        if (searchQuery.trim()) {
          const title = getTitle(s.media?.title).toLowerCase();
          if (!title.includes(searchQuery.toLowerCase().trim())) return false;
        }

        return true;
      })
      .sort((a, b) => a.airingAt - b.airingAt);
  }, [scheduleData, selectedDate, filters, searchQuery, now, getTitle]);

  const formatTime = (ts) => {
    return new Date(ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getRelativeTimeText = (ts) => {
    const diffMs = ts * 1000 - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMs < 0) {
      const pastMins = Math.abs(diffMins);
      if (pastMins < 60) return `Aired ${pastMins}m ago`;
      const pastHours = Math.floor(pastMins / 60);
      return `Aired ${pastHours}h ago`;
    }

    if (diffMins < 60) return `In ${diffMins}m`;
    return `In ${diffHours}h ${diffMins % 60}m`;
  };

  const getDayName = (d) => d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const getDayNum = (d) => String(d.getDate()).padStart(2, "0");
  const getMonthName = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const isToday = (d) => d.toDateString() === todayStr;
  const isSelected = (d) => d.toDateString() === selectedDate.toDateString();

  const offset = -new Date().getTimezoneOffset();
  const offsetHrs = Math.floor(Math.abs(offset) / 60);
  const offsetMins = Math.abs(offset) % 60;
  const offsetStr = `UTC${offset >= 0 ? "+" : "-"}${String(offsetHrs).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const hasActiveFilters = filters.format !== "ALL" || filters.status !== "ALL" || searchQuery !== "";

  return (
    <section className="max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-6 my-6">
      {/* Solid sharp outer container */}
      <div className="bg-[#0b0c10] border border-white/20 rounded-none shadow-2xl overflow-hidden">

        {/* --- Sharp Header Bar --- */}
        <div className="p-4 border-b border-white/20 bg-[#12141c] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-discord-500 shrink-0" />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base md:text-lg font-black tracking-widest text-white uppercase font-mono">
                  AIRING SCHEDULE
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-white/50 mt-0.5">
                {tzName} ({offsetStr})
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            {!isToday(selectedDate) && (
              <button
                onClick={scrollToToday}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1e2a] hover:bg-discord-600 border border-white/20 text-xs font-mono font-bold text-white transition-colors"
              >
                <RotateCcw size={13} />
                <span>TODAY</span>
              </button>
            )}

            {/* List / Grid Toggle */}
            <div className="flex items-center bg-[#090a0d] border border-white/20 p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                  viewMode === "list"
                    ? "bg-discord-500 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <ListIcon size={14} />
                <span>LIST</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                  viewMode === "grid"
                    ? "bg-discord-500 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <LayoutGrid size={14} />
                <span>GRID</span>
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="relative z-50">
              <button
                onClick={() => setFilterShow(!filterShow)}
                className={`flex items-center gap-2 px-3.5 py-1.5 bg-[#1c1e2a] border transition-colors text-xs font-mono font-bold ${
                  hasActiveFilters
                    ? "border-discord-500 text-discord-400 bg-discord-500/10"
                    : "border-white/20 text-white/80 hover:text-white hover:border-white/40"
                }`}
              >
                <Filter size={14} />
                <span>FILTER</span>
                {hasActiveFilters && <span className="w-1.5 h-1.5 bg-discord-400" />}
              </button>

              {/* Filter Drawer */}
              {filterShow && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterShow(false)} />
                  <div className="absolute top-full right-0 mt-2 w-64 bg-[#12141c] border border-white/20 shadow-2xl p-4 flex flex-col gap-4 z-50 font-mono">
                    {/* Search */}
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 block">
                        Search Anime Title
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Type to filter..."
                          className="w-full bg-[#08090c] border border-white/20 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-discord-500 font-mono"
                        />
                        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                      </div>
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    {/* Format */}
                    <div>
                      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Format</span>
                        {filters.format !== "ALL" && (
                          <button
                            onClick={() => setFilters((p) => ({ ...p, format: "ALL" }))}
                            className="text-discord-400 hover:underline text-[10px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {["ALL", "TV", "MOVIE", "OVA", "ONA"].map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilters((prev) => ({ ...prev, format: f }))}
                            className={`px-2.5 py-1 text-xs font-bold font-mono transition-colors ${
                              filters.format === f
                                ? "bg-discord-500 text-white"
                                : "bg-[#1c1e2a] text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    {/* Air Status */}
                    <div>
                      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Air Status</span>
                        {filters.status !== "ALL" && (
                          <button
                            onClick={() => setFilters((p) => ({ ...p, status: "ALL" }))}
                            className="text-discord-400 hover:underline text-[10px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { key: "ALL", label: "ALL" },
                          { key: "PAST", label: "AIRED" },
                          { key: "UPCOMING", label: "UPCOMING" },
                        ].map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setFilters((prev) => ({ ...prev, status: s.key }))}
                            className={`px-2.5 py-1 text-xs font-bold font-mono transition-colors ${
                              filters.status === s.key
                                ? "bg-discord-500 text-white"
                                : "bg-[#1c1e2a] text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- Sharp Date Carousel Bar --- */}
        <div className="p-3 bg-[#0e1017] border-b border-white/20 flex items-center">
          <button
            onClick={scrollLeft}
            className="hidden md:flex w-8 h-12 bg-[#171924] hover:bg-discord-600 border border-white/20 items-center justify-center text-white transition-colors shrink-0 mr-2"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto mini-scrollbar flex-1 py-1 snap-x scroll-smooth"
          >
            {days.map((date, i) => {
              const today = isToday(date);
              const active = isSelected(date);

              return (
                <button
                  key={i}
                  data-today={today}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex flex-col items-center justify-center min-w-[70px] sm:min-w-[76px] h-[56px] transition-colors shrink-0 snap-start select-none border font-mono ${
                    active
                      ? "bg-discord-600 border-discord-400 text-white border-b-4 border-b-discord-300"
                      : today
                      ? "bg-[#181b28] border-discord-500/60 text-white hover:bg-[#202434]"
                      : "bg-[#12141c] border-white/15 text-white/60 hover:bg-[#1a1c27] hover:text-white"
                  }`}
                >
                  <span
                    className={`text-[9px] font-black tracking-widest uppercase ${
                      active ? "text-white" : today ? "text-discord-400" : "text-white/40"
                    }`}
                  >
                    {today ? "TODAY" : getDayName(date)}
                  </span>
                  <span className="text-base font-black leading-none mt-0.5">
                    {getDayNum(date)}
                  </span>
                  <span
                    className={`text-[9px] font-bold tracking-wider uppercase mt-0.5 ${
                      active ? "text-white/80" : "text-white/30"
                    }`}
                  >
                    {getMonthName(date)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={scrollRight}
            className="hidden md:flex w-8 h-12 bg-[#171924] hover:bg-discord-600 border border-white/20 items-center justify-center text-white transition-colors shrink-0 ml-2"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* --- Content List / Grid Area --- */}
        <div className="min-h-[360px] p-3 sm:p-4 bg-[#0b0c10]">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 bg-[#12141c] border border-white/10 animate-pulse"
                >
                  <div className="w-12 h-4 bg-white/10" />
                  <div className="w-10 h-14 bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-4 bg-white/10" />
                    <div className="w-1/4 h-3 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDayItems.length > 0 ? (
            viewMode === "list" ? (
              /* --- Sharp Solid List Rows --- */
              <div className="flex flex-col border border-white/15 divide-y divide-white/15">
                {selectedDayItems.map((item) => {
                  const isPast = item.airingAt * 1000 < now;
                  const isAiringNow =
                    Math.abs(item.airingAt * 1000 - now) < 20 * 60 * 1000 && !isPast;

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/watch/${item.media?.id}`)}
                      className={`group relative flex items-center justify-between p-3 sm:p-3.5 transition-colors cursor-pointer overflow-hidden ${
                        isAiringNow
                          ? "bg-[#121f1a] hover:bg-[#162821]"
                          : isPast
                          ? "bg-[#0c0d12] hover:bg-[#13151f]"
                          : "bg-[#11131c] hover:bg-[#181b27]"
                      }`}
                    >
                      {/* Left Accent Bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-[4px] z-10 ${
                          isAiringNow
                            ? "bg-emerald-400"
                            : isPast
                            ? "bg-white/20"
                            : "bg-discord-500 group-hover:bg-discord-400"
                        }`}
                      />

                      {/* Right Faded Cover Poster Backdrop */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                        <img
                          src={item.media?.bannerImage || item.media?.coverImage?.extraLarge || item.media?.coverImage?.large}
                          alt=""
                          className="w-full h-full object-cover object-right opacity-20 group-hover:opacity-40 transition-all duration-300 transform group-hover:scale-105 filter contrast-125 [mask-image:linear-gradient(to_left,black_5%,transparent_70%)] [-webkit-mask-image:linear-gradient(to_left,black_5%,transparent_70%)]"
                          loading="lazy"
                        />
                      </div>

                      {/* Content Left */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pl-2 font-mono relative z-10">
                        {/* Time Column */}
                        <div className="flex flex-col items-start w-16 sm:w-20 shrink-0">
                          <span
                            className={`text-sm sm:text-base font-black tracking-wider ${
                              isAiringNow
                                ? "text-emerald-400"
                                : isPast
                                ? "text-white/40"
                                : "text-white"
                            }`}
                          >
                            {formatTime(item.airingAt)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-tight ${
                              isAiringNow
                                ? "text-emerald-400"
                                : isPast
                                ? "text-white/30"
                                : "text-discord-400"
                            }`}
                          >
                            {isAiringNow ? "AIRING NOW" : getRelativeTimeText(item.airingAt)}
                          </span>
                        </div>

                        {/* Thumbnail */}
                        <div className="w-[42px] h-[58px] bg-black border border-white/20 shrink-0 overflow-hidden relative shadow-md">
                          <img
                            src={item.media?.coverImage?.medium || item.media?.coverImage?.large}
                            alt={getTitle(item.media?.title)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <h3
                            className={`text-sm sm:text-base font-bold truncate transition-colors ${
                              isPast
                                ? "text-white/60 group-hover:text-white"
                                : "text-white group-hover:text-discord-400"
                            }`}
                          >
                            {getTitle(item.media?.title)}
                          </h3>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#1b1e2c] text-white border border-white/20">
                              EP {item.episode}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-discord-600/30 text-discord-300 border border-discord-500/40">
                              {item.media?.format || "TV"}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#181a24] text-indigo-400 border border-indigo-500/30">
                              SUB
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Right */}
                      <div className="flex items-center gap-3 shrink-0 relative z-10">
                        <div className="hidden sm:flex items-center gap-2 font-mono">
                          {isAiringNow ? (
                            <span className="px-2.5 py-1 text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                              <Radio size={13} className="animate-pulse" /> LIVE NOW
                            </span>
                          ) : isPast ? (
                            <span className="px-2.5 py-1 text-xs font-bold uppercase bg-white/5 text-white/40 border border-white/20 flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-500" /> AIRED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold uppercase bg-discord-500/20 text-discord-300 border border-discord-500/40 flex items-center gap-1.5">
                              <Clock size={13} className="text-discord-400" /> UPCOMING
                            </span>
                          )}
                        </div>

                        {/* Watch Button */}
                        <div className="w-8 h-8 bg-[#1a1d29] group-hover:bg-discord-600 text-white flex items-center justify-center border border-white/20 group-hover:border-discord-500 transition-colors">
                          <Play size={14} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* --- Sharp Solid Grid View --- */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {selectedDayItems.map((item) => {
                  const isPast = item.airingAt * 1000 < now;

                  return (
                    <div key={item.id} className="relative group flex flex-col font-mono">
                      <AnimeCard anime={item.media} />

                      {/* Time Badge Overlay */}
                      <div className="absolute top-2 left-2 bg-black/90 px-2 py-0.5 text-white text-[11px] font-bold border border-white/20 z-20 pointer-events-none flex items-center gap-1.5">
                        <Clock
                          size={11}
                          className={isPast ? "text-emerald-400" : "text-discord-400"}
                        />
                        <span>{formatTime(item.airingAt)}</span>
                      </div>

                      {/* Episode Badge Overlay */}
                      <div className="absolute bottom-14 right-2 bg-discord-600 px-2 py-0.5 text-white text-[10px] font-bold z-20 pointer-events-none border border-white/20">
                        EP {item.episode}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* --- Empty State --- */
            <div className="py-16 flex flex-col items-center justify-center text-center font-mono">
              <div className="w-14 h-14 bg-[#141620] border border-white/20 flex items-center justify-center text-white/40 mb-3">
                <Calendar size={26} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">
                NO SCHEDULE FOUND
              </h3>
              <p className="text-xs text-white/40 max-w-sm mb-4">
                No anime releases found for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setFilters({ format: "ALL", status: "ALL" });
                    setSearchQuery("");
                  }}
                  className="px-4 py-1.5 text-xs font-bold uppercase bg-discord-600 hover:bg-discord-700 text-white transition-colors border border-discord-500"
                >
                  CLEAR FILTERS
                </button>
              )}
            </div>
          )}
        </div>

        {/* --- Footer --- */}
        <div className="py-3 px-4 bg-[#12141c] border-t border-white/20 flex items-center justify-between text-[11px] font-mono text-white/50">
          <span>TIMEZONE CONVERSION: {tzName} ({offsetStr})</span>
          <span className="hidden sm:inline">ANIXO SCHEDULE ENGINE</span>
        </div>
      </div>
    </section>
  );
}
