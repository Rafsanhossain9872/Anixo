import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { updateSettings } from "../services/settingsService";
import { getAnilistAuthUrl, disconnectAnilist } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Shield, CheckCircle2, BarChart2 } from "lucide-react";

const getDefaults = (settings) => ({
  titleLanguage: settings?.titleLanguage || 'EN',
  videoLanguage: settings?.videoLanguage || 'Any',
  skipSeconds: settings?.skipSeconds || 5,
  bookmarksPerPage: settings?.bookmarksPerPage || 20,
  autoPlay: settings?.autoPlay ?? true,
  autoNext: settings?.autoNext ?? true,
  themeColor: settings?.themeColor || '#5865F2'
});

const THEME_COLORS = [
  { id: 'default', color: '#5865F2', label: 'Blurple' },
  { id: 'crimson', color: '#dc2626', label: 'Crimson' },
  { id: 'rose', color: '#e11d48', label: 'Deep Rose' },
  { id: 'magenta', color: '#c026d3', label: 'Magenta' },
  { id: 'violet', color: '#7c3aed', label: 'Violet' },
  { id: 'indigo', color: '#4f46e5', label: 'Indigo' },
  { id: 'blue', color: '#2563eb', label: 'Royal Blue' },
  { id: 'azure', color: '#0284c7', label: 'Azure' },
  { id: 'cyan', color: '#0891b2', label: 'Cyan' },
  { id: 'teal', color: '#0d9488', label: 'Teal' },
  { id: 'emerald', color: '#059669', label: 'Emerald' },
  { id: 'green', color: '#16a34a', label: 'Forest' },
  { id: 'lime', color: '#65a30d', label: 'Lime' },
  { id: 'gold', color: '#d97706', label: 'Gold' },
  { id: 'orange', color: '#ea580c', label: 'Burnt Orange' },
  { id: 'rust', color: '#b91c1c', label: 'Rust' },
];

export default function Settings() {
  const { user, globalSettings, setGlobalSettings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // Key forces form remount when globalSettings loads/changes — no setState in effect needed
  const settingsKey = globalSettings?.updatedAt || globalSettings?._id || 'default';

  const [formData, setFormData] = useState(() => getDefaults(globalSettings));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Live Theme Preview & Revert on Unmount
  useEffect(() => {
    const applyColor = (color) => {
      if (color) {
        document.documentElement.style.setProperty('--discord-600', color);
        document.documentElement.style.setProperty('--discord-500', color);
        document.documentElement.style.setProperty('--discord-700', color);
        document.documentElement.style.setProperty('--discord-400', color);
        document.documentElement.style.setProperty('--discord-800', color);
        document.documentElement.style.setProperty('--discord-900', color);
      } else {
        document.documentElement.style.removeProperty('--discord-600');
        document.documentElement.style.removeProperty('--discord-500');
        document.documentElement.style.removeProperty('--discord-700');
        document.documentElement.style.removeProperty('--discord-400');
        document.documentElement.style.removeProperty('--discord-800');
        document.documentElement.style.removeProperty('--discord-900');
      }
    };
    
    applyColor(formData.themeColor);
    
    return () => {
      applyColor(globalSettings?.themeColor);
    };
  }, [formData.themeColor, globalSettings?.themeColor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSettings(formData);
    if (res.success) {
      setGlobalSettings(res.settings);
      localStorage.setItem("cached_settings", JSON.stringify(res.settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  const handleDisconnect = async () => {
    const res = await disconnectAnilist();
    if (res.success) {
      window.location.reload(); // Refresh to update user state
    }
    setShowConfirmModal(false);
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Watch Later", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin", icon: User, path: "/admin" }] : []),
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  return (
    <div className="min-h-screen text-white flex flex-col font-senpai selection:bg-discord-500/30" key={settingsKey}>
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "settings" && location.pathname === "/settings");
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

        {/* Settings Form */}
        <div className="max-w-[700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <form onSubmit={handleSubmit} className="bg-[#111] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
            
            <div className="p-5 md:p-10 space-y-8 md:space-y-12">
              
              {/* 1. Sync Section - Mobile Optimized */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-5 pb-8 md:pb-10 border-b border-white/15">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <img 
                      src="https://anilist.co/img/icons/icon.svg" 
                      alt="AL" 
                      className={`w-6 h-6 md:w-7 md:h-7 ${user?.anilist?.username ? 'opacity-100' : 'opacity-20 grayscale'}`} 
                    />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[14px] md:text-[15px] font-bold text-white leading-tight">
                      {user?.anilist?.username ? <>Connected as <span className="text-[#02A9FF]">{user.anilist.username}</span></> : 'AniList Sync'}
                    </h4>
                    <p className="text-[10px] md:text-[11px] font-medium text-white/30">
                      Mirror your progress automatically.
                    </p>
                  </div>
                </div>
                
                {user?.anilist?.username ? (
                  <button 
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full md:w-auto text-[10px] font-bold text-discord-500 hover:text-discord-400 transition-colors px-4 py-2 bg-discord-500/5 rounded-lg border border-discord-500/10"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => window.location.href = getAnilistAuthUrl()}
                    className="w-full md:w-auto bg-[#02A9FF] text-white text-[11px] font-bold px-6 py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* 2. Title Language - Refined Mobile Layout */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-[14px] font-bold text-white">Title Language</h3>
                  <p className="text-[11px] text-white/30">Anime name display preference.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/15 w-full md:w-auto">
                  {['EN', 'JP'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setFormData({...formData, titleLanguage: lang})}
                      className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[11px] font-bold transition-all ${formData.titleLanguage === lang ? 'bg-discord-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
                    >
                      {lang === 'EN' ? 'English' : 'Japanese'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Player Options - Simplified List */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between group">
                  <span className="text-[13px] font-medium text-white/60 group-hover:text-white transition-colors">Auto-play next episode</span>
                  <div 
                    onClick={() => setFormData({...formData, autoNext: !formData.autoNext})}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${formData.autoNext ? 'bg-discord-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${formData.autoNext ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between group">
                  <span className="text-[13px] font-medium text-white/60 group-hover:text-white transition-colors">Auto-start video</span>
                  <div 
                    onClick={() => setFormData({...formData, autoPlay: !formData.autoPlay})}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${formData.autoPlay ? 'bg-discord-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${formData.autoPlay ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                  <span className="text-[13px] font-medium text-white/60">Theme Color</span>
                  <div className="grid grid-cols-8 gap-3 mt-1">
                    {THEME_COLORS.map((theme) => {
                      const isActive = formData.themeColor.toUpperCase() === theme.color.toUpperCase();
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          title={theme.label}
                          onClick={() => setFormData({...formData, themeColor: theme.color})}
                          className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center relative justify-self-center
                            ${isActive ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#111] z-10' : 'hover:scale-110 opacity-70 hover:opacity-100'}
                          `}
                          style={{ backgroundColor: theme.color }}
                        >
                          <div className="absolute inset-0 rounded-full bg-white/10 mix-blend-overlay"></div>
                          {isActive && <CheckCircle2 size={14} className="text-white drop-shadow-md relative z-10" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-discord-600 hover:bg-discord-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-[14px] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Settings Saved Successfully</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Simple Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative bg-[#111] border border-white/15 rounded-2xl p-6 max-w-[320px] w-full shadow-2xl">
            <h3 className="text-[16px] font-bold text-white mb-2">Disconnect AniList?</h3>
            <p className="text-white/40 text-[12px] mb-6 leading-relaxed">
              Your watch progress will no longer be synced to your AniList profile.
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/50 text-[11px] font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDisconnect}
                className="flex-1 py-2.5 rounded-lg bg-discord-600/90 text-white text-[11px] font-bold hover:bg-discord-600 transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
