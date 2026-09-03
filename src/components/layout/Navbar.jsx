import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NavSidebar from "./NavSidebar";
import { useLanguage } from "../../context/LanguageContext";
import { searchAnime } from "../../services/api";
import { getWatchUrl } from "../../utils/url";
import { Search, Shuffle, Menu, Bell, X, MessageSquare } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";
import AvatarDropdown from "../user/AvatarDropdown";
import AiChat from "../chat/AiChat";
import NotificationDropdown from "../user/NotificationDropdown";

export default function Navbar() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("menu");
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);
  const { language, toggleLanguage, getTitle } = useLanguage();
  const { user, globalNotifications, fetchNotifications } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const unreadCount = globalNotifications.filter(n => !n.isRead).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "true" && !showLoginModal && !user) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
        navigate(location.pathname, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.search, showLoginModal, user, navigate, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchAnime(searchQuery, {});
        setSearchResults(results);
      } catch (err) {
        console.error("Navbar Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleRandom = async () => {
    try {
      const { getTrendingAnime } = await import('../../services/api');
      const res = await getTrendingAnime(1);
      if (res?.media?.length) {
        const randomAnime = res.media[Math.floor(Math.random() * res.media.length)];
        navigate(getWatchUrl(randomAnime.id, randomAnime.title) + '?autoplay=1');
      }
    } catch (e) {
      console.error("Failed to fetch random anime", e);
    }
  };

  if (isLandingPage) return null;

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[98%] max-w-[1600px] z-[110] font-senpai">
        <nav className="flex items-center justify-between bg-bg/95 backdrop-blur-xl border border-white/5 rounded-full px-2 py-2 sm:px-3 sm:py-2.5 shadow-2xl">
          
          {/* LOGO */}
          <div className="flex-shrink-0 mr-1 sm:mr-4 pl-1 sm:pl-2">
            <Link to="/home" className="flex items-center gap-1">
              <span className="text-white font-black text-lg sm:text-xl tracking-tighter uppercase">Tenzora</span>
            </Link>
          </div>

          {/* COMPACT MOBILE STRIP (Hidden on sm and above) */}
          <div className="flex sm:hidden items-center gap-1.5 sm:gap-3 px-1 sm:px-2 flex-1 justify-end">
            <Link to="/home" className="text-textMuted hover:text-white text-[10px] font-semibold transition-colors">Home</Link>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))} className="flex items-center gap-1 text-textMuted hover:text-discord-400 transition-colors h-7 px-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">AI</span>
            </button>
            <button onClick={toggleLanguage} className="flex items-center bg-surface rounded-full p-0.5 border border-border cursor-pointer shrink-0">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${language === 'EN' ? 'bg-white/10 text-white' : 'text-textMuted'}`}>EN</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${language === 'JP' ? 'bg-white/10 text-white' : 'text-textMuted'}`}>JP</span>
            </button>
          </div>

          {/* SCROLLABLE LINKS (Tenzora Hybrid Menu) */}
          <div className="hidden sm:flex flex-1 overflow-x-auto scrollbar-hide items-center gap-5 px-4 mask-linear-fade">
             <Link to="/home" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Home</Link>
             <Link to="/browse" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Browse</Link>
             <Link to="/browse?sort=POPULARITY_DESC" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Popular</Link>
             <Link to="/browse?format=MOVIE" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Movies</Link>
             <button onClick={handleRandom} className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap cursor-pointer">Random</button>
             <button onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))} className="text-textMuted hover:text-discord-400 text-[13px] font-semibold transition-colors whitespace-nowrap cursor-pointer">AI Chat</button>
             <Link to="/chat" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Live Chat</Link>
             <Link to="/community" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Community</Link>
             {import.meta.env.VITE_ENABLE_NSFW !== 'false' && <Link to="/nsfw" className="text-textMuted hover:text-primary text-[13px] font-semibold transition-colors whitespace-nowrap">Hentai</Link>}
             <Link to="/watchlist" className="text-textMuted hover:text-white text-[13px] font-semibold transition-colors whitespace-nowrap">Watch Later</Link>
          </div>

          {/* RIGHT SIDE ICONS */}
          <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2 ml-1 sm:ml-4 relative" ref={searchContainerRef}>
             
             {/* Search Icon / Bar */}
             {isSearchOpen ? (
               <form onSubmit={handleSearchSubmit} className="flex items-center bg-surface border border-border rounded-full px-3 h-8 sm:h-10 w-[140px] sm:w-[200px] animate-in fade-in slide-in-from-right-4">
                 <Search size={14} className="text-textMuted mr-2 shrink-0" />
                 <input
                   autoFocus
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="bg-transparent outline-none text-sm text-white w-full placeholder:text-textMuted font-senpai"
                   placeholder="Search..."
                 />
                 <button type="button" onClick={() => setIsSearchOpen(false)} className="text-textMuted hover:text-white shrink-0">
                   <X size={14} />
                 </button>
               </form>
             ) : (
               <button onClick={() => setIsSearchOpen(true)} className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-surface hover:bg-surfaceHover border border-white/5 flex items-center justify-center text-textMuted hover:text-white transition-colors cursor-pointer shrink-0">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
             )}

             {/* Search Dropdown Overlay */}
             {showDropdown && (
                <div className="absolute top-[50px] right-0 w-[300px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[120]">
                  {isSearching ? (
                    <div className="p-4 text-center text-textMuted text-xs font-senpai">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto mini-scrollbar">
                      {searchResults.map(anime => (
                        <Link 
                          key={anime.id} 
                          to={getWatchUrl(anime.id, anime.title)}
                          onClick={() => { setShowDropdown(false); setIsSearchOpen(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 p-3 hover:bg-surfaceHover border-b border-border last:border-0 transition-colors"
                        >
                          <img src={anime.coverImage?.medium} className="w-10 h-14 object-cover rounded bg-bg" alt="" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-white text-xs font-semibold truncate font-senpai">{getTitle(anime.title)}</span>
                            <span className="text-textMuted text-[10px] mt-1 font-senpai">{anime.format || "TV"}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-textMuted text-xs font-senpai">No results found.</div>
                  )}
                </div>
             )}

             {/* Shuffle Icon */}
             <button onClick={handleRandom} className="hidden md:flex w-10 h-10 rounded-full bg-surface hover:bg-surfaceHover border border-white/5 items-center justify-center text-textMuted hover:text-white transition-colors cursor-pointer">
                <Shuffle size={16} />
             </button>

             {/* EN | JP Toggle */}
             <button onClick={toggleLanguage} className="hidden sm:flex items-center bg-surface rounded-full p-1 border border-border cursor-pointer">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${language === 'EN' ? 'bg-white/10 text-white' : 'text-textMuted'}`}>EN</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${language === 'JP' ? 'bg-white/10 text-white' : 'text-textMuted'}`}>JP</span>
             </button>

             {/* Notifications */}
             <div className="relative shrink-0">
                <button
                  onClick={() => { if(!isNotifOpen) fetchNotifications(); setIsNotifOpen(!isNotifOpen); }}
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${isNotifOpen ? 'bg-surfaceHover border-white/10 text-white' : 'bg-surface border-white/5 text-textMuted hover:text-white hover:bg-surfaceHover'}`}
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full border-2 border-bg"></span>
                  )}
                </button>
                <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
             </div>

             {/* User Profile */}
             {user ? (
               <AvatarDropdown />
             ) : (
               <button onClick={() => setShowLoginModal(true)} className="flex items-center shrink-0 px-2 py-1 sm:px-5 sm:py-2 bg-white/10 hover:bg-white/20 text-white text-[9px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-widest rounded transition-colors backdrop-blur-sm">LOGIN</button>
             )}

             {/* Hamburger */}
             <button onClick={() => { setSidebarTab("menu"); setShowSidebar(true); }} className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-surface hover:bg-surfaceHover border border-white/5 flex items-center justify-center text-textMuted hover:text-white transition-colors cursor-pointer shrink-0">
                <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
             </button>
          </div>
        </nav>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <NavSidebar open={showSidebar} onClose={() => setShowSidebar(false)} initialTab={sidebarTab} />
      <AiChat />
    </>
  );
}
