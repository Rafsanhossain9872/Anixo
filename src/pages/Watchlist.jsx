import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { getWatchlist } from "../services/watchlistService";
import { syncAnilist } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings, RefreshCw, Trash2, BarChart2, Bookmark } from "lucide-react";
import AnimeCard from "../components/common/AnimeCard";

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncCooldown, setSyncCooldown] = useState(() => {
    const lastSync = localStorage.getItem('lastAnilistSync');
    if (lastSync) {
      const diff = Math.floor((Date.now() - parseInt(lastSync)) / 1000);
      if (diff < 30) return 30 - diff;
    }
    return 0;
  });

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const { backendApi } = await import("../services/api");
      const res = await backendApi.post("/watchlist/import", {
        items: [],
        mode: "Replace"
      });
      if (res.data.success) {
        setWatchlist([]);
        setShowClearModal(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    let timer;
    if (syncCooldown > 0) {
      timer = setInterval(() => setSyncCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [syncCooldown]);

  const handleSync = async () => {
    if (syncCooldown > 0) return;
    if (!user?.anilist?.username) {
      setSyncError({ type: 'auth', message: 'Please connect your AniList account in Settings first to import your bookmarks.' });
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await syncAnilist();
      if (res.success) {
        localStorage.setItem('lastAnilistSync', Date.now().toString());
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

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Watch Later", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin", icon: User, path: "/admin" }] : []),
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  const subTabs = ["All", "Watching", "On-Hold", "Planning", "Completed", "Dropped"];

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    const fetchWatchlist = async () => {
      const res = await getWatchlist();
      if (res.success) {
        setWatchlist(res.watchlist || []);
      }
      setIsLoading(false);
    };
    fetchWatchlist();
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen text-white bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="w-8 h-8 border-4 border-discord-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const filteredWatchlist = watchlist.filter(item => activeTab === "All" || item.status === activeTab);

  return (
    <div className="min-h-screen text-white bg-[#0B0B0E] flex flex-col font-senpai">
      <Navbar />

      <div className="w-full pt-[100px] px-4 md:px-8 pb-12 max-w-[1600px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-12 w-full max-w-4xl mx-auto px-1 sm:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "bookmarks" && location.pathname === "/watchlist");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${
                  isActive 
                  ? "bg-discord-600 text-white border-discord-600" 
                  : "bg-white/[0.02] border-white/15 text-white/30 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" />
                <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Sync Error Notice */}
        {syncError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between">
            <span>{syncError.message}</span>
            <button onClick={() => setSyncError(null)} className="text-red-400 hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Senpaiflix Style Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bookmark className="text-discord-500 w-6 h-6" />
            <h1 className="text-2xl font-black">Watch Later</h1>
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-bold">
              {filteredWatchlist.length}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing || syncCooldown > 0}
              className="px-4 py-1.5 bg-discord-600/10 text-discord-500 border border-discord-500/20 rounded-md text-[11px] uppercase tracking-wider font-bold hover:bg-discord-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing..." : syncCooldown > 0 ? `Wait ${syncCooldown}s` : "Sync AniList"}
            </button>
            {watchlist.length > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                className="px-4 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[11px] uppercase tracking-wider font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Categories (Sub Nav) */}
        <div className="mb-6 border-b border-white/10 pb-1">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
            {subTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors relative ${
                  activeTab === tab ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-discord-500 rounded-t-full shadow-[0_0_10px_rgba(var(--discord-500-rgb),0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category Label (Senpaiflix Style) */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-discord-500 shadow-[0_0_8px_rgba(var(--discord-500-rgb),0.8)]" />
          <h2 className="text-discord-500 font-bold text-sm">
            {activeTab === "All" ? "All Anime" : activeTab}
          </h2>
          <span className="text-white/30 text-xs ml-auto font-medium">
            {filteredWatchlist.length} titles
          </span>
        </div>

        {/* Anime Grid */}
        {filteredWatchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-[#111] border border-white/15 rounded-2xl shadow-xl">
            <Heart size={32} className="text-white/20 mb-4" />
            <h2 className="text-lg font-black text-white mb-2 uppercase">Empty Watch Later</h2>
            <p className="text-white/30 text-[12px] max-w-xs text-center">
              Add some anime to your Watch Later list to see them here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {filteredWatchlist.map((item) => {
              // Convert Watchlist item to AnimeCard prop structure
              const anime = {
                id: parseInt(item.animeId),
                title: { english: item.title, romaji: item.title, native: item.title },
                coverImage: { extraLarge: item.coverImage, large: item.coverImage, medium: item.coverImage },
                // Use the watchlist status as the top-left format tag to match Senpaiflix
                format: item.status, 
                isProgress: true,
                episode: item.progress || 1,
                currentTime: item.currentTime
              };

              return <AnimeCard key={item.animeId} anime={anime} />;
            })}
          </div>
        )}

        {/* Clear All Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-2">Clear Watch Later</h3>
              <p className="text-white/60 text-sm mb-6">
                Are you sure you want to clear your entire Watch Later list? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isClearing ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
