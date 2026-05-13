import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, BarChart2, Tv, Film, Star, Zap, Trophy, TrendingUp } from "lucide-react";

const ANILIST_API = "https://graphql.anilist.co";

// --- Mini Bar Chart Component ---
const BarChart = ({ data, color = "#ef4444" }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 md:gap-2 h-16 md:h-24 w-full">
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-1 md:gap-1.5 flex-1 min-w-0">
          <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
            <div
              className="w-full rounded-t-md md:rounded-t-lg transition-all duration-700"
              style={{
                height: `${Math.max((item.value / max) * 100, 4)}%`,
                background: `linear-gradient(to top, ${color}cc, ${color}55)`,
                boxShadow: `0 0 8px ${color}33`
              }}
            />
          </div>
          <span className="text-[7px] md:text-[9px] text-white/30 truncate w-full text-center font-bold uppercase tracking-tight">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// --- Donut Chart Component ---
const DonutChart = ({ segments, size = 120 }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  // Pre-compute cumulative offsets BEFORE render (no mutation during render)
  const segmentsWithOffset = segments.reduce((acc, seg) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0;
    const dash = (seg.value / total) * circumference;
    acc.push({ ...seg, dash, gap: circumference - dash, offset: prevOffset, nextOffset: prevOffset + dash });
    return acc;
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#ffffff08" strokeWidth="18" />
      {segmentsWithOffset.map((seg, i) => (
        <circle
          key={i}
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth="18"
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={-seg.offset}
          strokeLinecap="butt"
          style={{ filter: `drop-shadow(0 0 4px ${seg.color}66)` }}
        />
      ))}
    </svg>
  );
};

// --- Stat Card ---
const StatCard = ({ icon, label, value, sub, color = "red" }) => {
  const Icon = icon;
  const colorMap = {
    red: "from-red-500/10 to-red-500/0 border-red-500/20 text-red-400",
    blue: "from-blue-500/10 to-blue-500/0 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/10 to-purple-500/0 border-purple-500/20 text-purple-400",
    green: "from-green-500/10 to-green-500/0 border-green-500/20 text-green-400",
    yellow: "from-yellow-500/10 to-yellow-500/0 border-yellow-500/20 text-yellow-400",
  };
  const cls = colorMap[color] || colorMap.red;

  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-xl md:rounded-2xl p-3 md:p-5 flex items-center gap-2.5 md:gap-4`}>
      <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${cls.split(" ")[0].replace("from-", "bg-").replace("/10", "/20")}`}>
        <Icon size={16} className={`md:!w-5 md:!h-5 ${cls.split(" ").find(c => c.startsWith("text-"))}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/30 font-bold truncate">{label}</p>
        <p className="text-lg md:text-2xl font-black text-white leading-tight">{value}</p>
        {sub && <p className="text-[8px] md:text-[10px] text-white/30 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  Completed: "#22c55e",
  Watching: "#ef4444",
  Planning: "#3b82f6",
  Dropped: "#6b7280",
  "On-Hold": "#f59e0b",
  Paused: "#f59e0b",
};

const GENRE_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#14b8a6","#f43f5e","#a855f7"];

export default function Stats() {
  const { user, globalWatchlist, globalProgress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [animeDetails, setAnimeDetails] = useState({});
  const [anilistStats, setAnilistStats] = useState(null); // raw AniList media list entries
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) navigate("/"); }, [user, navigate]);

  // If AniList connected → fetch full AniList library (much more accurate stats)
  // If not connected → fall back to local watchlist/progress + AniList detail lookup
  useEffect(() => {
    const run = async () => {
      try {
        // === PATH 1: AniList connected ===
        if (user?.anilist?.accessToken && user?.anilist?.username) {
          const query = `
            query ($userName: String) {
              MediaListCollection(userName: $userName, type: ANIME) {
                lists {
                  name
                  status
                  entries {
                    score(format: POINT_10)
                    progress
                    status
                    media {
                      id
                      duration
                      episodes
                      format
                      genres
                      studios(isMain: true) { nodes { name } }
                      title { english romaji }
                    }
                  }
                }
              }
            }
          `;
          const res = await fetch(ANILIST_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.anilist.accessToken}`
            },
            body: JSON.stringify({ query, variables: { userName: user.anilist.username } })
          });
          const json = await res.json();
          if (json.errors) {
            console.error("AniList API Error:", json.errors);
          }
          const lists = json.data?.MediaListCollection?.lists || [];
          const allEntries = lists.flatMap(l => l.entries || []);
          setAnilistStats(allEntries);
          setLoading(false);
          return;
        }

        // === PATH 2: No AniList — use local IDs to fetch metadata ===
        const allIds = [...new Set([
          ...(globalWatchlist || []).map(w => w.animeId),
          ...(globalProgress || []).map(p => p.animeId)
        ])].filter(Boolean).map(Number).filter(n => !isNaN(n));

        if (allIds.length === 0) { setLoading(false); return; }

        const fetchBatch = async (ids) => {
          const query = `
            query ($idIn: [Int]) {
              Page(page: 1, perPage: 50) {
                media(id_in: $idIn, type: ANIME) {
                  id genres episodes duration format
                  studios(isMain: true) { nodes { name } }
                }
              }
            }
          `;
          const res = await fetch(ANILIST_API, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ query, variables: { idIn: ids } })
          });
          const json = await res.json();
          if (json.errors) console.error("AniList Fetch Error:", json.errors);
          return json.data?.Page?.media || [];
        };

        const chunks = [];
        for (let i = 0; i < allIds.length; i += 50) chunks.push(allIds.slice(i, i + 50));
        const results = (await Promise.all(chunks.map(fetchBatch))).flat();
        const map = {};
        results.forEach(m => { map[String(m.id)] = m; });
        setAnimeDetails(map);
      } catch (e) {
        console.error("Stats fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, globalWatchlist, globalProgress]);


  // --- Compute Stats ---
  const isAnilistConnected = !!(user?.anilist?.accessToken && user?.anilist?.username);
  const watchlist = globalWatchlist || [];
  const progress = globalProgress || [];

  // ── AniList path ──────────────────────────────────────────────────────────
  const alEntries = anilistStats || [];

  // Watch time
  const totalMinutes = isAnilistConnected
    ? alEntries.reduce((sum, e) => {
        const dur = e.media?.duration || 24;
        return sum + (e.progress || 0) * dur;
      }, 0)
    : progress.reduce((sum, p) => {
        const detail = animeDetails[String(p.animeId)];
        return sum + (p.episode * (detail?.duration || 24));
      }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // Completed / total
  const completedCount = isAnilistConnected
    ? alEntries.filter(e => e.status === "COMPLETED").length
    : watchlist.filter(w => w.status === "Completed").length;
  const totalInLibrary = isAnilistConnected ? alEntries.length : watchlist.length;

  // Avg score
  const scoredEntries = isAnilistConnected
    ? alEntries.filter(e => e.score > 0)
    : watchlist.filter(w => w.score > 0);
  const avgScore = scoredEntries.length > 0
    ? (scoredEntries.reduce((s, e) => s + (isAnilistConnected ? e.score : e.score), 0) / scoredEntries.length).toFixed(1)
    : "—";

  // Status breakdown for donut
  const STATUS_MAP_AL = { CURRENT: "Watching", PLANNING: "Planning", COMPLETED: "Completed", DROPPED: "Dropped", PAUSED: "On-Hold", REPEATING: "Rewatching" };
  const statusGroups = {};
  if (isAnilistConnected) {
    alEntries.forEach(e => {
      const label = STATUS_MAP_AL[e.status] || e.status;
      statusGroups[label] = (statusGroups[label] || 0) + 1;
    });
  } else {
    watchlist.forEach(w => {
      const s = w.status || "Planning";
      statusGroups[s] = (statusGroups[s] || 0) + 1;
    });
  }
  const statusSegments = Object.entries(statusGroups)
    .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || "#6b7280" }))
    .sort((a, b) => b.value - a.value);

  // Genre breakdown
  const genreCount = {};
  if (isAnilistConnected) {
    alEntries.forEach(e => {
      e.media?.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; });
    });
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => {
      animeDetails[String(id)]?.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; });
    });
  }
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  // Studio breakdown
  const studioCount = {};
  if (isAnilistConnected) {
    alEntries.forEach(e => {
      e.media?.studios?.nodes?.forEach(s => { studioCount[s.name] = (studioCount[s.name] || 0) + 1; });
    });
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => {
      animeDetails[String(id)]?.studios?.nodes?.forEach(s => { studioCount[s.name] = (studioCount[s.name] || 0) + 1; });
    });
  }
  const topStudios = Object.entries(studioCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Format breakdown
  const formatCount = {};
  if (isAnilistConnected) {
    alEntries.forEach(e => {
      if (e.media?.format) formatCount[e.media.format] = (formatCount[e.media.format] || 0) + 1;
    });
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => {
      const fmt = animeDetails[String(id)]?.format;
      if (fmt) formatCount[fmt] = (formatCount[fmt] || 0) + 1;
    });
  }
  const topFormats = Object.entries(formatCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));


  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-16 max-w-[1200px] mx-auto flex-1">

        {/* Nav Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 border ${
                  isActive
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 px-1 md:px-2">
          <h2 className="text-base md:text-xl font-black tracking-tight uppercase">Watch Statistics</h2>
          <span className="text-[8px] md:text-[10px] font-black bg-white/5 text-white/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/5 uppercase tracking-widest">Lifetime</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-bold uppercase tracking-widest animate-pulse">Crunching your data...</p>
          </div>
        ) : totalInLibrary === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 rounded-2xl max-w-lg mx-auto">
            <BarChart2 size={40} className="text-white/10 mb-4" />
            <h3 className="text-lg font-black text-white/80 mb-2">No Data Yet</h3>
            <p className="text-white/30 text-sm text-center max-w-xs">Start watching and bookmarking anime to see your stats here!</p>
            <Link to="/browse" className="mt-6 bg-red-600 text-white font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-red-700 transition-all">Explore Anime</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:gap-6">

            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <StatCard
                icon={Clock}
                label="Watch Time"
                value={totalDays > 0 ? `${totalDays}d ${totalHours % 24}h` : `${totalHours}h`}
                sub={`≈ ${totalMinutes.toLocaleString()} min`}
                color="red"
              />
              <StatCard
                icon={Trophy}
                label="Completed"
                value={completedCount}
                sub={`of ${totalInLibrary} in library`}
                color="green"
              />
              <StatCard
                icon={Star}
                label="Avg Score"
                value={avgScore}
                sub={`across ${scoredEntries.length} rated`}
                color="yellow"
              />
              <StatCard
                icon={TrendingUp}
                label="Episodes"
                value={progress.reduce((s, p) => s + p.episode, 0).toLocaleString()}
                sub="total watched"
                color="blue"
              />
            </div>

            {/* Middle Section: Donut + Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">

              {/* Library Status Donut */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-5">
                  <Tv size={13} className="text-red-500 md:!w-[15px] md:!h-[15px]" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/60">Library Status</h3>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="relative shrink-0">
                    <DonutChart segments={statusSegments} size={90} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base md:text-xl font-black text-white">{totalInLibrary}</span>
                      <span className="text-[7px] md:text-[8px] text-white/30 uppercase tracking-widest font-bold">Total</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:gap-2 flex-1 min-w-0">
                    {statusSegments.map((seg, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                          <span className="text-[10px] md:text-[11px] text-white/50 truncate font-medium">{seg.label}</span>
                        </div>
                        <span className="text-[11px] md:text-[12px] font-black text-white shrink-0">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format Breakdown */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-5">
                  <Film size={13} className="text-purple-400 md:!w-[15px] md:!h-[15px]" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/60">Format Breakdown</h3>
                </div>
                {topFormats.length > 0 ? (
                  <BarChart data={topFormats} color="#a855f7" />
                ) : (
                  <p className="text-white/20 text-xs md:text-sm text-center py-6 md:py-8">No format data yet</p>
                )}
              </div>
            </div>

            {/* Genre Section */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3 md:mb-5">
                <Zap size={13} className="text-yellow-400 md:!w-[15px] md:!h-[15px]" />
                <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/60">Top Genres</h3>
              </div>
              {topGenres.length > 0 ? (
                <div className="flex flex-col gap-2 md:gap-3">
                  {topGenres.map((g, i) => {
                    const pct = Math.round((g.value / (topGenres[0]?.value || 1)) * 100);
                    return (
                      <div key={i} className="flex items-center gap-2 md:gap-4">
                        <span className="text-[9px] md:text-[11px] text-white/50 w-20 md:w-28 shrink-0 font-bold truncate">{g.label}</span>
                        <div className="flex-1 h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(to right, ${GENRE_COLORS[i % GENRE_COLORS.length]}, ${GENRE_COLORS[(i + 1) % GENRE_COLORS.length]})`
                            }}
                          />
                        </div>
                        <span className="text-[10px] md:text-[12px] font-black text-white w-6 md:w-8 text-right shrink-0">{g.value}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-white/20 text-xs md:text-sm text-center py-6 md:py-8">No genre data yet — watch more anime!</p>
              )}
            </div>

            {/* Top Studios */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3 md:mb-5">
                <Trophy size={13} className="text-green-400 md:!w-[15px] md:!h-[15px]" />
                <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/60">Top Studios</h3>
              </div>
              {topStudios.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {topStudios.map(([name, count], i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/5 rounded-lg md:rounded-xl p-2.5 md:p-4 flex items-center justify-between gap-2 md:gap-3 hover:border-white/10 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] md:text-[12px] font-black text-white truncate">{name}</p>
                        <p className="text-[7px] md:text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">{count} anime</p>
                      </div>
                      <div
                        className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-[13px] font-black shrink-0"
                        style={{ background: `${GENRE_COLORS[i % GENRE_COLORS.length]}22`, color: GENRE_COLORS[i % GENRE_COLORS.length] }}
                      >
                        #{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/20 text-xs md:text-sm text-center py-6 md:py-8">No studio data yet</p>
              )}
            </div>

          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
