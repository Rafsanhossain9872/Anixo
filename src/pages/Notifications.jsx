import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { markAsRead, markAllRead, clearNotifications } from "../services/notificationService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Check, Trash2, Calendar, Info, AlertCircle, ExternalLink, BarChart2 } from "lucide-react";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return Math.floor(seconds) + "s ago";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 2592000) return Math.floor(seconds / 86400) + "d ago";
  return Math.floor(seconds / 2592000) + "mo ago";
};

export default function Notifications() {
  const { user, globalNotifications, setGlobalNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleReadAll = async () => {
    const res = await markAllRead();
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleClear = async () => {
    const res = await clearNotifications();
    if (res.success) {
      setGlobalNotifications([]);
    }
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  const unreadCount = globalNotifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "notifications" && location.pathname === "/notifications");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${
                  isActive 
                  ? "bg-red-600 text-white border-red-600" 
                  : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/[0.05]"
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 md:mb-8 px-1 sm:px-2">
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="text-[16px] md:text-xl font-black tracking-tight uppercase">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-[9px] md:text-[10px] font-black bg-red-600 text-white px-2 py-0.5 md:px-2.5 rounded-full">{unreadCount} New</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReadAll} 
              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all bg-white/[0.03] hover:bg-white/[0.08] px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-white/5 w-full sm:w-auto text-center"
            >
              Mark all read
            </button>
            <button 
              onClick={handleClear} 
              className="text-[9px] md:text-[10px] flex justify-center items-center font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-all bg-white/[0.03] hover:bg-red-500/10 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-white/5 shrink-0"
            >
              <Trash2 size={13} className="md:w-[14px] md:h-[14px]" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        {globalNotifications.length > 0 ? (
          <div className="flex flex-col gap-2 md:gap-3">
            {globalNotifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all duration-300 flex gap-3 md:gap-5 relative overflow-hidden group ${
                  !notif.isRead 
                  ? "bg-white/[0.03] border-white/10 shadow-lg" 
                  : "bg-transparent border-white/5 opacity-60 hover:opacity-100 hover:bg-white/[0.02]"
                }`}
              >
                {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}

                <div className="shrink-0 mt-0.5 md:mt-1">
                  {notif.type === 'NEW_EPISODE' ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 border border-red-500/20"><Calendar size={14} className="md:w-[18px] md:h-[18px]" /></div>
                  ) : notif.type === 'WATCHLIST_UPDATE' ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><Info size={14} className="md:w-[18px] md:h-[18px]" /></div>
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-yellow-600/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20"><AlertCircle size={14} className="md:w-[18px] md:h-[18px]" /></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 md:gap-4">
                    <div>
                      <h4 className={`text-[12px] md:text-[14px] font-bold leading-tight mb-1 ${!notif.isRead ? 'text-white' : 'text-white/60'}`}>{notif.title}</h4>
                      <p className="text-[10px] md:text-[12px] text-white/30 leading-relaxed max-w-2xl line-clamp-2 md:line-clamp-none">{notif.message}</p>
                    </div>
                    {!notif.isRead && (
                      <button onClick={() => handleMarkRead(notif._id)} className="shrink-0 text-white/10 hover:text-green-500 transition-all transform hover:scale-110" title="Mark as read">
                        <Check size={14} strokeWidth={3} className="md:w-4 md:h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 md:mt-4">
                    <span className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{timeAgo(notif.createdAt)}</span>
                    {notif.animeId && (
                      <Link to={`/watch/${notif.animeId}`} className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-red-500 flex items-center gap-1.5 hover:gap-2 transition-all uppercase tracking-widest bg-red-500/5 px-2.5 sm:px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-red-500/10 whitespace-nowrap">
                        View Release <ExternalLink size={10} strokeWidth={2.5} className="md:w-3 md:h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-[#111] border border-white/5 rounded-2xl shadow-xl relative overflow-hidden max-w-3xl mx-auto">
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Bell size={32} className="text-white/20" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Zero Noise</h2>
            <p className="text-white/30 mb-8 text-[13px] max-w-xs text-center leading-relaxed">
              You don't have any new notifications right now. We'll let you know when new episodes air!
            </p>
            <Link to="/browse" className="bg-white text-black font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105">
              Explore Anime
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
