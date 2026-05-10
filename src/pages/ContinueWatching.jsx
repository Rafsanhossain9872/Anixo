import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import Pagination from "../components/common/Pagination";
import { useAuth } from "../hooks/useAuth";
import { removeProgress, getProgress } from "../services/progressService";
import { syncAnilist } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Trash2, RefreshCw } from "lucide-react";

export default function ContinueWatching() {
  const { user, globalProgress, setGlobalProgress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const itemsPerPage = 24;

  useEffect(() => {
    if (!user) navigate("/");
    
    // FETCH LATEST PROGRESS ON MOUNT (REAL SYNC)
    const syncProgress = async () => {
      try {
        const res = await getProgress();
        if (res.success) {
          setGlobalProgress(res.continueWatching);
        }
      } catch (err) {
        console.error("Failed to sync progress on mount:", err);
      }
    };

    if (user) syncProgress();
  }, [user, navigate, setGlobalProgress]);

  const handleRemove = async (animeId) => {
    const res = await removeProgress(animeId);
    if (res.success) {
      setGlobalProgress(prev => prev.filter(p => p.animeId !== animeId));
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncAnilist();
      if (res.success) {
        // Refresh local progress from backend after sync
        const progressRes = await getProgress();
        if (progressRes.success) {
          setGlobalProgress(progressRes.continueWatching);
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  const progressCards = (globalProgress || []).map(p => ({
    id: p.animeId,
    title: { english: p.title },
    coverImage: { large: p.coverImage },
    episode: p.episode,
    currentTime: p.currentTime,
    duration: p.duration,
    isProgress: true
  }));

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "watching" && location.pathname === "/watching");
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-black tracking-tight uppercase">Continue Watching</h2>
            <span className="text-[10px] md:text-[11px] font-black bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full text-white/40">{progressCards.length}</span>
          </div>
          
          {user?.anilist?.username && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-xl border transition-all text-[10px] md:text-[11px] font-black uppercase tracking-wider w-full sm:w-auto ${
                isSyncing 
                ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed' 
                : 'bg-[#02A9FF]/10 border-[#02A9FF]/20 text-[#02A9FF] hover:bg-[#02A9FF] hover:text-white hover:border-[#02A9FF]'
              }`}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>
                <span className="inline sm:hidden">{isSyncing ? 'Syncing...' : 'AniList Sync'}</span>
                <span className="hidden sm:inline">{isSyncing ? 'Syncing Library...' : 'AniList Sync'}</span>
              </span>
            </button>
          )}
        </div>

        {/* Grid */}
        {progressCards.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {progressCards
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="group relative">
                  <AnimeCard anime={anime} />
                  
                  {/* Remove Button - Positioned absolutely relative to the group */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(anime.id);
                    }}
                    className="absolute top-2 right-2 z-50 bg-black/70 backdrop-blur-md text-white/90 hover:text-red-500 hover:bg-black p-2.5 rounded-xl shadow-xl transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 border border-white/10"
                    title="Remove from history"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
            
            {progressCards.length > itemsPerPage && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(progressCards.length / itemsPerPage)}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-[#111] border border-white/5 rounded-2xl shadow-xl relative overflow-hidden max-w-3xl mx-auto">
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Clock size={32} className="text-white/20" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">No Active Session</h2>
            <p className="text-white/30 mb-8 text-[13px] max-w-xs text-center leading-relaxed">
              Start watching an anime and we'll keep track of your progress here!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link to="/browse" className="bg-white text-black font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105">
                Explore Anime
              </Link>
              {user?.anilist?.username && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-red-600 text-white font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105 flex items-center gap-2"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing Library...' : 'Sync from AniList'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
