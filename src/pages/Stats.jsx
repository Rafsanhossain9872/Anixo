import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, BarChart2 } from "lucide-react";

const ANILIST_API = "https://graphql.anilist.co";

// --- Progress Bar Component ---
const ProgressBar = ({ label, value, max, color = "#e50914" }) => {
  const percentage = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#888] w-32 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 relative"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
        </div>
      </div>
      <span className="text-sm text-white font-medium w-12 text-right">{value}</span>
    </div>
  );
};

// --- Simple Donut Chart Component ---
const SimpleDonut = ({ segments, size = 120 }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  const processed = [];
  let currentOffset = 0;
  for (const seg of segments) {
    const dash = (seg.value / total) * circumference;
    processed.push({ ...seg, dash, offset: -currentOffset });
    currentOffset += dash;
  }


  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 blur-xl opacity-30" style={{ background: `radial-gradient(circle, ${segments[0]?.color || '#e50914'} 0%, transparent 70%)` }} />
      <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-[-90deg] relative z-10">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1a1a1a" strokeWidth="18" />
        {processed.map((seg, i) => (
          <circle
            key={i}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${seg.dash} ${circumference}`}
            strokeDashoffset={seg.offset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        ))}
      </svg>
    </div>
  );
};

// --- Stat Card Component ---
const StatCard = ({ label, value, sub, icon: Icon, color = "#e50914" }) => (
  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-white/20 group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-current opacity-10 blur-2xl" />
    <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full" style={{ background: `${color}20`, filter: 'blur(40px)' }} />
    <div className="relative z-10">
      {Icon && <div className="mb-3 text-white/30 group-hover:text-white/60 transition-colors"><Icon size={24} strokeWidth={1.5} /></div>}
      <p className="text-xs text-[#888] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {sub && <p className="text-xs text-[#666]">{sub}</p>}
    </div>
  </div>
);

const STATUS_COLORS = {
  Completed: "#22c55e",
  Watching: "#e50914",
  Planning: "#3b82f6",
  Dropped: "#6b7280",
  "On-Hold": "#f59e0b",
  Paused: "#f59e0b",
};

const GENRE_COLORS = ["#e50914", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6"];

// --- Animations ---
const styles = `
  @keyframes shine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
  .animate-shine {
    animation: shine 3s infinite ease-in-out;
  }
`;

export default function Stats() {
  const { user, globalWatchlist, globalProgress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [animeDetails, setAnimeDetails] = useState({});
  const [anilistStats, setAnilistStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) navigate("/"); }, [user, navigate]);

  // Fetch data
  useEffect(() => {
    const run = async () => {
      try {
        // If AniList connected
        if (user?.anilist?.accessToken && user?.anilist?.username) {
          const query = `
            query ($userName: String) {
              MediaListCollection(userName: $userName, type: ANIME) {
                lists {
                  entries {
                    score(format: POINT_10)
                    progress
                    status
                    media {
                      id duration episodes format genres
                      coverImage { large }
                      studios(isMain: true) { nodes { id name } }
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
          const lists = json.data?.MediaListCollection?.lists || [];
          const allEntries = lists.flatMap(l => l.entries || []);
          setAnilistStats(allEntries);
        } else {
          // No AniList - fetch metadata for local IDs
          const allIds = [...new Set([
            ...(globalWatchlist || []).map(w => w.animeId),
            ...(globalProgress || []).map(p => p.animeId)
          ])].filter(Boolean).map(Number).filter(n => !isNaN(n));

          if (allIds.length > 0) {
            const fetchBatch = async (ids) => {
              const query = `
              query ($idIn: [Int]) {
                Page(page: 1, perPage: 50) {
                  media(idIn: $idIn, type: ANIME) {
                    id genres episodes duration format
                    coverImage { large }
                    studios(isMain: true) { nodes { id name } }
                  }
                }
              }
            `;
              const res = await fetch(ANILIST_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { idIn: ids } })
              });
              const json = await res.json();
              return json.data?.Page?.media || [];
            };

            const chunks = [];
            for (let i = 0; i < allIds.length; i += 50) chunks.push(allIds.slice(i, i + 50));
            const results = (await Promise.all(chunks.map(fetchBatch))).flat();
            const map = {};
            results.forEach(m => { map[String(m.id)] = m; });
            setAnimeDetails(map);
          }
        }
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
  const alEntries = anilistStats || [];

  // Watch time
  const totalMinutes = isAnilistConnected
    ? alEntries.reduce((sum, e) => sum + (e.progress || 0) * (e.media?.duration || 24), 0)
    : progress.reduce((sum, p) => sum + (p.episode * (animeDetails[String(p.animeId)]?.duration || 24)), 0);
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

  // Status breakdown
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
    alEntries.forEach(e => e.media?.genres?.forEach(g => genreCount[g] = (genreCount[g] || 0) + 1));
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => animeDetails[String(id)]?.genres?.forEach(g => genreCount[g] = (genreCount[g] || 0) + 1));
  }
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenreValue = topGenres[0]?.[1] || 1;

  // Studio breakdown
  const studioData = {}; // { name: { count: number, cover: string|null } }
  if (isAnilistConnected) {
    alEntries.forEach(e => {
      const cover = e.media?.coverImage?.large;
      e.media?.studios?.nodes?.forEach(s => {
        if (!studioData[s.name]) {
          studioData[s.name] = { count: 0, cover: cover || null };
        }
        studioData[s.name].count++;
      });
    });
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => {
      const detail = animeDetails[String(id)];
      const cover = detail?.coverImage?.large;
      detail?.studios?.nodes?.forEach(s => {
        if (!studioData[s.name]) {
          studioData[s.name] = { count: 0, cover: cover || null };
        }
        studioData[s.name].count++;
      });
    });
  }
  const topStudios = Object.entries(studioData).sort((a, b) => b[1].count - a[1].count).slice(0, 6);

  // Format breakdown
  const formatCount = {};
  if (isAnilistConnected) {
    alEntries.forEach(e => { if (e.media?.format) formatCount[e.media.format] = (formatCount[e.media.format] || 0) + 1; });
  } else {
    const allTrackedIds = [...new Set([...watchlist.map(w => w.animeId), ...progress.map(p => p.animeId)])];
    allTrackedIds.forEach(id => {
      const fmt = animeDetails[String(id)]?.format;
      if (fmt) formatCount[fmt] = (formatCount[fmt] || 0) + 1;
    });
  }
  const topFormats = Object.entries(formatCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxFormatValue = topFormats[0]?.[1] || 1;

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin", icon: User, path: "/admin" }] : []),
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" },
  ];

  if (!user) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />

        <div className="w-full pt-[80px] px-4 md:px-8 pb-16 max-w-[1200px] mx-auto flex-1">

          {/* Nav Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${isActive
                      ? "bg-discord-600 text-white border-discord-600 shadow-lg"
                      : "bg-white/[0.02] border-white/15 text-white/30 hover:text-white hover:bg-white/[0.05] hover:border-white/25"
                    }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" />
                  <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Watch Statistics</h1>
            <p className="text-sm text-[#666]">Your anime journey overview</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-[#333] border-t-discord-600 rounded-full animate-spin mb-4" />
              <p className="text-[#666]">Crunching your data...</p>
            </div>
          ) : totalInLibrary === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-br from-[#111] to-[#0f0f0f] border border-white/10 rounded-3xl max-w-md mx-auto text-center">
              <BarChart2 size={40} className="text-[#444] mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Data Yet</h3>
              <p className="text-sm text-[#666] mb-6">Start watching and bookmarking anime to see your stats here!</p>
              <Link to="/browse" className="px-6 py-2 bg-gradient-to-r from-discord-600 to-discord-700 text-white rounded-lg text-sm font-medium hover:from-discord-700 hover:to-discord-800 transition-all shadow-lg">Explore Anime</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-8">

              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                  label="Watch Time"
                  value={totalDays > 0 ? `${totalDays}d ${totalHours % 24}h` : `${totalHours}h`}
                  sub={`${totalMinutes.toLocaleString()} minutes`}
                  icon={Clock}
                  color="#e50914"
                />
                <StatCard
                  label="Completed"
                  value={completedCount}
                  sub={`${totalInLibrary} total`}
                  color="#22c55e"
                />
                <StatCard
                  label="Average Score"
                  value={avgScore}
                  sub={`${scoredEntries.length} rated`}
                  color="#f59e0b"
                />
                <StatCard
                  label="Episodes Watched"
                  value={progress.reduce((s, p) => s + p.episode, 0).toLocaleString()}
                  color="#3b82f6"
                />
              </div>

              {/* Two Column Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Library Status */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-discord-600/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <h3 className="text-base font-medium text-white mb-8 flex items-center gap-2">
                      <div className="w-2 h-2 bg-discord-600 rounded-full animate-pulse" />
                      Library Status
                    </h3>
                    <div className="flex items-center gap-8">
                      <div className="relative shrink-0">
                        <SimpleDonut segments={statusSegments} size={120} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{totalInLibrary}</span>
                          <span className="text-xs text-[#666]">Total</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 flex-1">
                        {statusSegments.map((seg, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
                              <span className="text-sm text-[#888]">{seg.label}</span>
                            </div>
                            <span className="text-sm text-white font-medium">{seg.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format Breakdown */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <h3 className="text-base font-medium text-white mb-8 flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                      Formats
                    </h3>
                    {topFormats.length > 0 ? (
                      <div className="flex flex-col gap-5">
                        {topFormats.map(([label, value], i) => (
                          <ProgressBar
                            key={i}
                            label={label}
                            value={value}
                            max={maxFormatValue}
                            color={GENRE_COLORS[i % GENRE_COLORS.length]}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#666] text-sm">No format data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Genres */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-600/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <h3 className="text-base font-medium text-white mb-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
                    Top Genres
                  </h3>
                  {topGenres.length > 0 ? (
                    <div className="flex flex-col gap-5">
                      {topGenres.map(([label, value], i) => (
                        <ProgressBar
                          key={i}
                          label={label}
                          value={value}
                          max={maxGenreValue}
                          color={GENRE_COLORS[i % GENRE_COLORS.length]}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#666] text-sm">No genre data yet</p>
                  )}
                </div>
              </div>

              {/* Top Studios */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-600/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <h3 className="text-base font-medium text-white mb-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    Top Studios
                  </h3>
                  {topStudios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topStudios.map(([name, data], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 bg-gradient-to-r from-[#0a0a0a] to-[#111] p-5 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <span className="text-xl font-bold text-[#666] w-10">{i + 1}</span>
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#2a2a2a] flex-shrink-0 shadow-lg">
                            {data.cover ? (
                              <img src={data.cover} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#666] font-bold text-2xl bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
                                {name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-base text-white font-medium block truncate">{name}</span>
                            <span className="text-sm text-[#666]">{data.count} anime</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#666] text-sm">No studio data yet</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
