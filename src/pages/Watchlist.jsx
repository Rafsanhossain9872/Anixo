import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { getWatchlist, removeFromWatchlist, addToWatchlist } from "../services/watchlistService";
import { syncAnilist } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings, ChevronDown, Check, Play, Tv, Search, X, RefreshCw, ArrowRight, Trash2 } from "lucide-react";
import { ALL_GENRES } from "../constants/genres";

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("All");
  const [openStatusPicker, setOpenStatusPicker] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleSync = async () => {
    if (!user?.anilist?.username) {
      setSyncError({ type: 'auth', message: 'Please connect your AniList account in Settings first to import your bookmarks.' });
      return;
    }
    
    setIsSyncing(true);
    try {
      const res = await syncAnilist();
      if (res.success) {
        window.location.reload(); 
      } else {
        setSyncError({ type: 'error', message: res.message || "Failed to sync with AniList. Please try again later." });
      }
    } catch (e) {
      console.error(e);
      setSyncError({ type: 'error', message: "An unexpected error occurred during sync." });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Browse Filters State Copy ---
  const [searchInput, setSearchInput] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const displayGenres = ALL_GENRES;
  const [filters, setFilters] = useState({
    search: "", include: [], exclude: [], formats: [], status: "", sort: "POPULARITY_DESC", year: "", season: "", country: [], rating: "", language: [], excludeMyList: false, page: 1
  });

  const toggleGenre = (genre) => {
    setFilters(prev => {
      const include = prev.include;
      const exclude = prev.exclude;
      if (include.includes(genre)) {
        return { ...prev, include: include.filter(g => g !== genre), exclude: [...exclude, genre] };
      } else if (exclude.includes(genre)) {
        return { ...prev, exclude: exclude.filter(g => g !== genre) };
      } else {
        return { ...prev, include: [...include, genre] };
      }
    });
  };

  const toggleFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key === 'types' ? 'formats' : key] || [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key === 'types' ? 'formats' : key]: updated };
    });
  };

  const setSingleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ search: "", include: [], exclude: [], formats: [], status: "", sort: "POPULARITY_DESC", year: "", season: "", country: [], rating: "", language: [], excludeMyList: false, page: 1 });
    setSearchInput("");
    setOpenDropdown(null);
  };

  // ---------------------------------

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  const subTabs = ["All", "Watching", "On-Hold", "Planning", "Completed", "Dropped"];

  useEffect(() => {
    if (!user) {
      navigate("/"); // Redirect to home if not logged in
      return;
    }

    const fetchWatchlist = async () => {
      const res = await getWatchlist();
      if (res.success) {
        let list = res.watchlist || [];
        
        // Fetch metadata from Anilist to power the advanced filters
        try {
          const ids = list.map(item => parseInt(item.animeId)).filter(id => !isNaN(id));
          if (ids.length > 0) {
            const query = `
              query ($ids: [Int]) {
                Page(page: 1, perPage: 50) {
                  media(id_in: $ids, type: ANIME) {
                    id
                    format
                    status
                    seasonYear
                    season
                    countryOfOrigin
                    genres
                  }
                }
              }
            `;
            
            const { data } = await axios.post("https://graphql.anilist.co", {
              query,
              variables: { ids }
            }, { headers: { "Content-Type": "application/json", "Accept": "application/json" } });
            
            const mediaList = data?.data?.Page?.media || [];
            const mediaMap = {};
            mediaList.forEach(m => mediaMap[m.id] = m);
            
            list = list.map(item => {
              const meta = mediaMap[parseInt(item.animeId)];
              if (meta) {
                return {
                  ...item,
                  format: meta.format,
                  airingStatus: meta.status,
                  year: meta.seasonYear,
                  season: meta.season,
                  countryOfOrigin: meta.countryOfOrigin,
                  genres: meta.genres
                };
              }
              return item;
            });
          }
        } catch (e) {
          console.error("Failed to fetch watchlist metadata for filters", e);
        }

        setWatchlist(list);
      }
      setIsLoading(false);
    };

    fetchWatchlist();
  }, [user, navigate]);

  const handleRemove = async (animeId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const res = await removeFromWatchlist(animeId);
    if (res.success) {
      setWatchlist(res.watchlist);
    }
  };

  const handleUpdateStatus = async (item, newStatus, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isUpdating || item.status === newStatus) {
      setOpenStatusPicker(null);
      return;
    }

    setIsUpdating(true);
    const res = await addToWatchlist(item.animeId, item.title, item.coverImage, newStatus);
    if (res.success) {
      setWatchlist(res.watchlist);
    }
    setIsUpdating(false);
    setOpenStatusPicker(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenStatusPicker(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen text-white bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const filteredWatchlist = watchlist.filter(item => {
    // Basic Tabs & Search
    const matchesTab = activeTab === "All" || item.status === activeTab;
    const matchesSearch = !searchInput || item.title?.toLowerCase().includes(searchInput.toLowerCase());
    
    // Advanced Filters (assumes item has these fields populated, if not they will bypass or fail depending on logic)
    // If a filter is active and the item lacks the field, we assume it fails the filter.
    const matchesFormat = filters.formats.length === 0 || filters.formats.includes(item.format || item.type);
    
    // Browse page 'status' means airing status (RELEASING, FINISHED, etc.), Watchlist item.status is 'Watching', 'Completed' etc.
    // Assuming backend might send 'airingStatus' for the filter.
    const matchesStatus = !filters.status || item.airingStatus === filters.status;
    
    const matchesYear = !filters.year || String(item.year) === String(filters.year);
    const matchesSeason = !filters.season || item.season === filters.season;
    
    // Country & Language
    const matchesCountry = filters.country.length === 0 || filters.country.includes(item.countryOfOrigin || item.country);
    const itemLanguages = item.language || []; // Assuming array like ['SUB', 'DUB']
    const matchesLanguage = filters.language.length === 0 || filters.language.some(l => itemLanguages.includes(l));

    // Genres (include / exclude)
    const itemGenres = item.genres || [];
    const matchesInclude = filters.include.length === 0 || filters.include.every(g => itemGenres.includes(g));
    const matchesExclude = filters.exclude.length === 0 || !filters.exclude.some(g => itemGenres.includes(g));

    return matchesTab && matchesSearch && matchesFormat && matchesStatus && matchesYear && matchesSeason && matchesCountry && matchesLanguage && matchesInclude && matchesExclude;
  });

  // Apply sorting if needed
  filteredWatchlist.sort((a, b) => {
    if (filters.sort === "TRENDING_DESC" || filters.sort === "POPULARITY_DESC") {
      return (b.popularity || 0) - (a.popularity || 0);
    }
    if (filters.sort === "SCORE_DESC") {
      return (b.score || 0) - (a.score || 0);
    }
    if (filters.sort === "START_DATE_DESC") {
      return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    }
    return 0; // Default or unsupported sort
  });
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a] flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1600px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 w-full max-w-4xl mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "bookmarks" && location.pathname === "/watchlist");
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
                <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-md transition-colors ${
                activeTab === tab 
                ? "bg-white text-black border border-white" 
                : "bg-[#161616] text-white/40 border border-white/5 hover:bg-[#1f1f1f] hover:text-white/80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters Interface Copy from Browse */}
        <div className="mb-6 w-full max-w-4xl mx-auto">
          <div className="hidden md:flex flex-col gap-6">
            <div className="flex h-[52px] bg-[#0d0d0d] border border-white/10 rounded-xl overflow-visible shadow-2xl relative">
              <div className="flex-[2.5] relative flex items-center border-r border-white/5">
                <Search className="absolute left-6 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Universal Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-14 pr-12 text-[14px] text-white font-medium placeholder-white/30 outline-none"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput("")} className="absolute right-4 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                    <X size={12} className="text-white/40" />
                  </button>
                )}
              </div>

              {[
                { label: "Types", key: "types", options: [{ label: "TV", value: "TV" }, { label: "Movie", value: "MOVIE" }, { label: "OVA", value: "OVA" }, { label: "ONA", value: "ONA" }, { label: "Special", value: "SPECIAL" }] },
                { label: "Genres", key: "genre", options: displayGenres },
                { label: "Status", key: "status", options: [{ label: "Any", value: "" }, { label: "Releasing", value: "RELEASING" }, { label: "Finished", value: "FINISHED" }, { label: "Upcoming", value: "NOT_YET_RELEASED" }] },
                { label: "Advanced", key: "advanced", active: filters.year || filters.season || filters.rating }
              ].map(dd => (
                <div key={dd.key} className="flex-1 relative flex items-center border-r border-white/5 group">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                    className={`w-full h-full flex items-center justify-between px-6 transition-all hover:bg-white/2 ${openDropdown === dd.key ? 'bg-white/3' : ''}`}
                  >
                    <span className={`text-[11px] uppercase tracking-[0.2em] font-medium transition-colors ${dd.active ? 'text-red-500' : 'text-white/40'}`}>
                      {dd.label}
                    </span>
                    <ChevronDown size={12} className={`text-white/20 transition-transform duration-300 ${openDropdown === dd.key ? 'rotate-180 text-red-500' : ''}`} />
                  </button>

                  {openDropdown === dd.key && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className={`absolute top-[calc(100%+8px)] bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-50 ${dd.key === 'genre' ? 'w-[540px] max-w-[calc(100vw-32px)] left-1/2 -translate-x-1/2' :
                          dd.key === 'advanced' ? 'right-0' : 'w-40 left-0'
                        }`}>
                        {(dd.key === 'types' || dd.key === 'status') && (
                          <div className="flex flex-col gap-0.5">
                            {dd.options.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  if (dd.key === 'types') {
                                    toggleFilter('types', opt.value);
                                  } else {
                                    setSingleFilter('status', opt.value);
                                  }
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] transition-all flex items-center justify-between group ${(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value)
                                  ? 'bg-red-600/10 text-red-500 font-medium'
                                  : 'text-white/40 hover:bg-white/3 hover:text-white'
                                  }`}
                              >
                                <span>{opt.label}</span>
                                {(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                              </button>
                            ))}
                          </div>
                        )}

                        {dd.key === 'genre' && (
                          <div className="space-y-3 p-1">
                            <div className="grid grid-cols-5 gap-1">
                              {dd.options.map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => toggleGenre(opt)}
                                  className={`px-2 py-1.5 rounded text-left text-[10px] transition-all flex items-center justify-between group ${filters.include.includes(opt)
                                    ? 'bg-red-600/10 text-red-500 font-medium border border-red-500/20'
                                    : 'text-white/30 border border-transparent hover:bg-white/3 hover:text-white/60'
                                    }`}
                                >
                                  <span className="truncate">{opt}</span>
                                  {filters.include.includes(opt) && <Check size={9} />}
                                </button>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2 text-[9px]">
                              <button onClick={handleReset} className="px-4 py-1.5 uppercase tracking-widest text-white/20 hover:text-white transition-colors">Reset</button>
                              <button onClick={() => setOpenDropdown(null)} className="px-5 py-1.5 bg-white/5 border border-white/10 text-white uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all">Close</button>
                            </div>
                          </div>
                        )}

                        {dd.key === 'advanced' && (
                          <div className="w-[320px] p-2 space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">Season</label>
                                <div className="relative">
                                  <select
                                    value={filters.season}
                                    onChange={(e) => setSingleFilter('season', e.target.value)}
                                    className="w-full h-7 bg-white/3 border border-white/5 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/6 transition-all cursor-pointer appearance-none"
                                  >
                                    <option value="" className="bg-[#0d0d0d]">Season</option>
                                    {["WINTER", "SPRING", "SUMMER", "FALL"].map(s => <option key={s} value={s} className="bg-[#0d0d0d]">{s}</option>)}
                                  </select>
                                  <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-1">
                              <div className="space-y-1.5">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">Country</label>
                                <div className="space-y-1 px-0.5">
                                  {[{ label: "China", v: "CN" }, { label: "Japan", v: "JP" }].map(c => (
                                    <button key={c.v} onClick={() => toggleFilter('country', c.v)} className="flex items-center gap-1.5 group w-full py-0.5">
                                      <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.country.includes(c.v) ? 'bg-red-600 border-red-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                        {filters.country.includes(c.v) && <Check size={7} strokeWidth={4} className="text-white" />}
                                      </div>
                                      <span className={`text-[10px] transition-colors ${filters.country.includes(c.v) ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>{c.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>


                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                              <button
                                onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")}
                                className="flex items-center gap-1.5 group py-1"
                              >
                                <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.excludeMyList ? 'bg-red-600 border-red-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                  {filters.excludeMyList && <Check size={7} strokeWidth={4} className="text-white" />}
                                </div>
                                <span className={`text-[10px] transition-colors ${filters.excludeMyList ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>Exclude my list</span>
                              </button>
                              <div className="flex gap-2">
                                <button onClick={handleReset} className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">Reset</button>
                                <button onClick={() => setOpenDropdown(null)} className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all">Close</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}



              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-10 bg-red-600 text-white flex items-center gap-4 rounded-r-xl group active:scale-95 transition-all overflow-hidden relative disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <span className="text-[13px] font-normal uppercase tracking-[0.2em] relative z-10">{isSyncing ? "Syncing..." : "Sync"}</span>
                <RefreshCw size={14} className={`relative z-10 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            <div className="bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl p-3 space-y-3">
              <div className="relative h-10 flex items-center border border-white/5 rounded-lg">
                <Search className="absolute left-3 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Universal Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-10 pr-9 text-[12px] text-white font-medium placeholder-white/20 outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={12} className="text-white/40" />
                  </button>
                )}
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                {[
                  { label: "Types", key: "types", options: [{ label: "TV", value: "TV" }, { label: "Movie", value: "MOVIE" }, { label: "OVA", value: "OVA" }, { label: "ONA", value: "ONA" }, { label: "Special", value: "SPECIAL" }] },
                  { label: "Genres", key: "genre", options: displayGenres },
                  { label: "Status", key: "status", options: [{ label: "Any", value: "" }, { label: "Releasing", value: "RELEASING" }, { label: "Finished", value: "FINISHED" }, { label: "Upcoming", value: "NOT_YET_RELEASED" }] },
                  { label: "Advanced", key: "advanced", active: filters.year || filters.season || filters.rating }
                ].map(dd => (
                  <div key={dd.key} className={`${dd.key === "genre" ? "static group" : "relative group"}`}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                      className={`w-full h-10 flex items-center justify-between px-4 rounded-lg border border-white/10 bg-black/20 transition-all hover:bg-white/3 ${openDropdown === dd.key ? "bg-white/6" : ""}`}
                    >
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-medium transition-colors ${dd.active ? "text-red-500" : "text-white/50"}`}>
                        {dd.label}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-white/30 transition-transform duration-300 ${openDropdown === dd.key ? "rotate-180 text-red-500" : ""}`}
                      />
                    </button>

                    {openDropdown === dd.key && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                        <div
                          className={`absolute top-full mt-2 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-50 ${dd.key === "genre"
                              ? "left-0 right-0 w-auto max-h-[70vh] overflow-y-auto"
                              : dd.key === "advanced"
                                ? "right-0 w-80"
                                : "left-0 w-40"
                            }`}
                        >
                          {(dd.key === "types" || dd.key === "status") && (
                            <div className="flex flex-col gap-0.5">
                              {dd.options.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    if (dd.key === 'types' || dd.key === "types") {
                                      toggleFilter("types", opt.value);
                                    } else {
                                      setSingleFilter("status", opt.value);
                                    }
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] transition-all flex items-center justify-between group ${dd.key === "types" ? (filters.formats.includes(opt.value) ? "bg-red-600/10 text-red-500 font-medium" : "text-white/40 hover:bg-white/3 hover:text-white")
                                      : filters.status === opt.value
                                        ? "bg-red-600/10 text-red-500 font-medium"
                                        : "text-white/40 hover:bg-white/3 hover:text-white"
                                    }`}
                                >
                                  <span>{opt.label}</span>
                                  {(dd.key === "types" ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                                </button>
                              ))}
                            </div>
                          )}

                          {dd.key === "genre" && (
                            <div className="space-y-3 p-1">
                              <div className="grid grid-cols-3 gap-1">
                                {dd.options.map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => toggleGenre(opt)}
                                    className={`px-2 py-1.5 rounded text-left text-[10px] transition-all flex items-center justify-between group ${filters.include.includes(opt)
                                        ? "bg-red-600/10 text-red-500 font-medium border border-red-500/20"
                                        : "text-white/30 border border-transparent hover:bg-white/3 hover:text-white/60"
                                      }`}
                                  >
                                    <span className="truncate">{opt}</span>
                                    {filters.include.includes(opt) && <Check size={9} />}
                                  </button>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2 text-[9px]">
                                <button
                                  onClick={handleReset}
                                  className="px-4 py-1.5 uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                                >
                                  Reset
                                </button>
                                <button
                                  onClick={() => setOpenDropdown(null)}
                                  className="px-5 py-1.5 bg-white/5 border border-white/10 text-white uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}

                          {dd.key === "advanced" && (
                            <div className="w-[320px] max-w-[calc(100vw-32px)] p-2 space-y-3">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">
                                    Season
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={filters.season}
                                      onChange={e => setSingleFilter("season", e.target.value)}
                                      className="w-full h-7 bg-white/3 border border-white/5 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/6 transition-all cursor-pointer appearance-none"
                                    >
                                      <option value="" className="bg-[#0d0d0d]">Season</option>
                                      {["WINTER", "SPRING", "SUMMER", "FALL"].map(s => (
                                        <option key={s} value={s} className="bg-[#0d0d0d]">
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      size={8}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pb-1">
                                <div className="space-y-1.5">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">
                                    Country
                                  </label>
                                  <div className="space-y-1 px-0.5">
                                    {[{ label: "China", v: "CN" }, { label: "Japan", v: "JP" }].map(c => (
                                      <button
                                        key={c.v}
                                        onClick={() => toggleFilter("country", c.v)}
                                        className="flex items-center gap-1.5 group w-full py-0.5"
                                      >
                                        <div
                                          className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.country.includes(c.v)
                                              ? "bg-red-600 border-red-600"
                                              : "bg-white/5 border-white/10 group-hover:border-white/20"
                                            }`}
                                        >
                                          {filters.country.includes(c.v) && (
                                            <Check size={7} strokeWidth={4} className="text-white" />
                                          )}
                                        </div>
                                        <span
                                          className={`text-[10px] transition-colors ${filters.country.includes(c.v)
                                              ? "text-white/90"
                                              : "text-white/30 group-hover:text-white/50"
                                            }`}
                                        >
                                          {c.label}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>


                              </div>

                              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                <button
                                  onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")}
                                  className="flex items-center gap-1.5 group py-1"
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.excludeMyList ? "bg-red-600 border-red-600" : "bg-white/5 border-white/10 group-hover:border-white/20"
                                      }`}
                                  >
                                    {filters.excludeMyList && (
                                      <Check size={7} strokeWidth={4} className="text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] transition-colors ${filters.excludeMyList
                                        ? "text-white/90"
                                        : "text-white/30 group-hover:text-white/50"
                                      }`}
                                  >
                                    Exclude my list
                                  </span>
                                </button>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleReset}
                                    className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => setOpenDropdown(null)}
                                    className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">

                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-2 h-10 bg-red-600 text-white flex items-center justify-center gap-3 rounded-lg active:scale-95 transition-all overflow-hidden relative disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                  <span className="text-[11px] font-normal uppercase tracking-[0.2em] relative z-10">{isSyncing ? "Syncing" : "Sync"}</span>
                  <RefreshCw size={14} className={`relative z-10 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(filters.include.length + filters.exclude.length + filters.formats.length + (filters.status ? 1 : 0) + (filters.year ? 1 : 0)) > 0 && (
              <>
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-white/40 hover:text-red-500 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all mr-2">
                  <Trash2 size={10} /> Reset
                </button>
                {filters.include.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-red-600/10 border border-red-600/30 rounded-full text-[9px] text-red-500 font-bold uppercase tracking-widest transition-all">
                    {g}
                    <X size={10} className="cursor-pointer text-red-500/50 group-hover:text-red-500" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.exclude.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-white/30 font-bold uppercase tracking-widest">
                    <span className="line-through">{g}</span>
                    <X size={10} className="cursor-pointer text-white/20 group-hover:text-white" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.formats.map(f => (
                  <div key={f} className="group flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 rounded-full text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                    {f}
                    <X size={10} className="cursor-pointer text-blue-500/50 group-hover:text-blue-500" onClick={() => toggleFilter('types', f)} />
                  </div>
                ))}
                {filters.status && (
                  <div className="group flex items-center gap-2 px-3 py-1.5 bg-green-600/10 border border-green-600/30 rounded-full text-[9px] text-green-500 font-bold uppercase tracking-widest">
                    {filters.status.replace('_', ' ')}
                    <X size={10} className="cursor-pointer text-green-500/50 group-hover:text-green-500" onClick={() => setSingleFilter('status', '')} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {filteredWatchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-[#111] border border-white/5 rounded-2xl shadow-xl relative overflow-hidden max-w-3xl mx-auto">
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Heart size={32} className="text-white/20" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
              {activeTab === "All" ? "Collection Empty" : `No ${activeTab} Anime`}
            </h2>
            <p className="text-white/30 mb-8 text-[13px] max-w-xs text-center leading-relaxed">
              Discover new shows and add them to your collection to keep track of your journey!
            </p>
            <Link to="/browse" className="bg-white text-black font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95">
              Browse Anime
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-x-4 gap-y-4">
            {filteredWatchlist.map((item) => {
              const timeQuery = item.currentTime ? `&t=${item.currentTime}` : "";
              const watchUrl = `/watch/${item.animeId}?ep=${item.progress || 1}${timeQuery}`;

              return (
                <div key={item.animeId} className="group relative flex bg-[#16171B] hover:bg-[#1C1E23] rounded-[4px] transition-colors duration-300 h-[100px] sm:h-[120px]">
                  
                  {/* Poster */}
                  <Link to={watchUrl} className="shrink-0 w-[70px] sm:w-[85px] h-full relative overflow-hidden rounded-l-[4px]">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#111] text-white/10 text-[10px] font-black uppercase tracking-widest text-center">No Cover</div>
                    )}
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Play size={20} className="text-white ml-1 shadow-lg" fill="currentColor" />
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex flex-col justify-between p-3 sm:p-4 flex-1 min-w-0 relative">
                    
                    {/* Top Row: Title & Dropdown */}
                    <div className="flex justify-between items-start gap-4">
                      <Link to={watchUrl} className="font-medium text-[13px] sm:text-[14px] text-white/90 group-hover:text-red-500 transition-colors line-clamp-2 pr-2 leading-snug tracking-wide">
                        {item.title}
                      </Link>
                      
                      {/* Status Dropdown */}
                      <div 
                        className="relative shrink-0" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenStatusPicker(openStatusPicker === item.animeId ? null : item.animeId);
                        }}
                      >
                        <button className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer capitalize">
                          {item.status || "Planning"}
                          <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${openStatusPicker === item.animeId ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {openStatusPicker === item.animeId && (
                          <div className="absolute top-full right-0 mt-2 bg-[#1a1c21] border border-white/10 rounded-md shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden min-w-[140px] z-50 animate-in fade-in zoom-in-95 duration-200">
                            {subTabs.filter(t => t !== "All").map((tab) => (
                              <button
                                key={tab}
                                onClick={(e) => handleUpdateStatus(item, tab, e)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] transition-colors ${
                                  item.status === tab ? "bg-white/5 text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                {tab}
                                {item.status === tab && <Check size={14} className="text-white" />}
                              </button>
                            ))}
                            {/* Remove Option */}
                            <div className="border-t border-white/5 mt-1 pt-1">
                              <button
                                onClick={(e) => { handleRemove(item.animeId, e); setOpenStatusPicker(null); }}
                                className="w-full text-left px-3 py-2.5 text-[11px] text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                Remove from List
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Meta Data */}
                    <div className="flex items-center gap-4 text-[10px] sm:text-[11px] font-bold tracking-wider text-white/40">
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                        <Tv size={12} className="opacity-70" />
                        <span>EP {item.progress || 1}</span>
                      </div>
                      {item.format && (
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-white/60 uppercase">
                          <span>{item.format}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {syncError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSyncError(null)}
          />
          <div className="relative bg-[#111] border border-white/5 rounded-2xl p-6 max-w-[320px] w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-bold text-white mb-2">
              {syncError.type === 'auth' ? 'Connect AniList' : 'Sync Failed'}
            </h3>
            <p className="text-white/40 text-[12px] mb-6 leading-relaxed">
              {syncError.message}
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setSyncError(null)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/50 text-[11px] font-bold hover:bg-white/10 transition-all"
              >
                Close
              </button>
              {syncError.type === 'auth' && (
                <button 
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex-1 py-2.5 rounded-lg bg-[#02A9FF] text-white text-[11px] font-bold hover:bg-[#02A9FF]/90 transition-all"
                >
                  Go to Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
