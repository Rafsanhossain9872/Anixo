import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ALL_GENRES } from "../../constants/genres";
import NavSidebar from "./NavSidebar";
import { useLanguage } from "../../context/LanguageContext";
import { searchAnime } from "../../services/api";
import { getWatchUrl } from "../../utils/url";
import { Search, Shuffle, Camera, SlidersHorizontal, Mic, Menu, Bell, MessageSquare } from "lucide-react";

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
  const mobileSearchRef = useRef(null);
  const { language, toggleLanguage, getTitle } = useLanguage();
  const { user, loading: authLoading, globalNotifications, fetchNotifications, authToast } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    format_in: [],
    status: "",
    season: "",
  });

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
      const isInsideDesktop = searchContainerRef.current && searchContainerRef.current.contains(event.target);
      const isInsideMobile = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);

      if (!isInsideDesktop && !isInsideMobile) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time search logic matching Hero.jsx
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim() && Object.keys(searchFilters).every(k => !searchFilters[k] || searchFilters[k].length === 0)) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchAnime(searchQuery, searchFilters);
        setSearchResults(results);
      } catch (err) {
        console.error("Navbar Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchFilters]);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-[110] bg-[#0B0B0E] h-[56px]" style={{ willChange: 'transform' }}>
        <div className="max-w-[1720px] mx-auto px-4 h-full flex items-center justify-between relative z-20">
          
          {/* LEFT: Hamburger + Logo + Left Links */}
          <div className="flex items-center gap-4 shrink-0 h-full">
            <button
              onClick={() => {
                setSidebarTab("menu");
                setShowSidebar(true);
              }}
              className="text-white/60 hover:text-white transition-colors duration-150 p-1 xl:hidden"
            >
              <Menu strokeWidth={2.5} size={24} />
            </button>

            {!isLandingPage && (
              <Link to="/home" className="flex items-baseline gap-0 hover:opacity-80 transition-opacity">
                <span className="text-white font-extrabold text-[22px] tracking-tight">Tenzora</span>
              </Link>
            )}

            {!isLandingPage && (
              <div className="hidden xl:flex items-center gap-1 ml-2 h-full">
                <Link to="/browse?format=TV" className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase">Types</Link>
                <Link to="/browse?genre=Action" className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase">Genres</Link>
                <button onClick={async () => {
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
                }} className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase">Random</button>
                <Link to="/chat" className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase">Live Chat</Link>
                <Link to="/community" className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase">Community</Link>
                <Link to="/nsfw" className="px-3 h-full flex items-center text-[12px] font-bold text-[#ff2a5f] hover:text-[#ff7e40] transition-colors duration-200 uppercase">Hentai</Link>
                <Link to="/watch2gether" className="px-3 h-full flex items-center text-[12px] font-bold text-white/50 hover:text-white transition-colors duration-200 uppercase gap-1.5">
                  Watch2gather
                  <span className="bg-discord-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">BETA</span>
                </Link>
              </div>
            )}
          </div>

          {/* CENTER: Spacer (Search is on right now) */}
          {!isLandingPage && (
            <div className="flex-1 hidden xl:flex justify-end px-4 h-full items-center" ref={searchContainerRef}>
              <div className="relative w-full max-w-[400px]">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center bg-[#1A1A1E] border border-transparent rounded-full px-4 h-[40px] hover:bg-[#202026] focus-within:border-discord-500/50 focus-within:bg-[#1A1A1E] transition-colors duration-150 w-full"
                >
                  <Search className="w-[18px] h-[18px] text-white/40 mr-2.5 shrink-0" strokeWidth={2.5} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                    placeholder="Search Anime"
                    className="bg-transparent text-[14px] font-medium text-white/90 outline-none w-full placeholder-white/30"
                  />
                  {isSearching && <div className="w-4 h-4 border-2 border-discord-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />}
                  
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/browse");
                      setShowDropdown(false);
                    }}
                    className="text-white/40 hover:text-white transition-colors p-1 ml-1 shrink-0"
                    title="Advanced Search"
                  >
                    <SlidersHorizontal size={16} strokeWidth={2.5} />
                  </button>
                </form>

                {/* Desktop Dropdown Results */}
                {showDropdown && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1E] border border-white/[0.08] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[110] animate-in fade-in zoom-in-95 duration-200">
                    {/* Advanced Filters Panel */}
                    {showFilters && (
                      <div className="p-4 border-b border-white/[0.05] bg-[#141418]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Quick Filters</span>
                          <button
                            onClick={() => setSearchFilters({ format_in: [], status: "", season: "" })}
                            className="text-[9px] text-discord-400 hover:text-discord-300 font-bold uppercase transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {['TV', 'MOVIE', 'OVA', 'ONA'].map(f => (
                              <button
                                key={f}
                                onClick={() => setSearchFilters(prev => ({
                                  ...prev,
                                  format_in: prev.format_in.includes(f) ? prev.format_in.filter(x => x !== f) : [...prev.format_in, f]
                                }))}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${searchFilters.format_in.includes(f) ? 'bg-discord-600 border-discord-600 text-white' : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:border-white/15'}`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={searchFilters.status}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                              className="bg-white/[0.04] border border-white/[0.08] text-[9px] text-white/50 rounded-md px-2 py-1 outline-none flex-1 focus:border-discord-500/50 transition-colors"
                            >
                              <option value="">All Status</option>
                              <option value="RELEASING">Airing</option>
                              <option value="FINISHED">Finished</option>
                            </select>
                            <select
                              value={searchFilters.season}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, season: e.target.value }))}
                              className="bg-white/[0.04] border border-white/[0.08] text-[9px] text-white/50 rounded-md px-2 py-1 outline-none flex-1 focus:border-discord-500/50 transition-colors"
                            >
                              <option value="">All Seasons</option>
                              <option value="WINTER">Winter</option>
                              <option value="SPRING">Spring</option>
                              <option value="SUMMER">Summer</option>
                              <option value="FALL">Fall</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    {isSearching ? (
                      <div className="p-6 text-center text-white/30 text-[13px] animate-pulse">Searching...</div>
                    ) : (
                      <>
                        <div className="px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Results</span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilters(!showFilters); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${showFilters ? 'bg-discord-600/20 text-discord-400' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'}`}
                          >
                            <SlidersHorizontal size={10} strokeWidth={3} />
                            <span className="text-[9px] font-bold uppercase">Filters</span>
                          </button>
                        </div>

                        {searchResults.length > 0 ? (
                          <ul className="max-h-[60vh] overflow-y-auto mini-scrollbar py-2">
                            {searchResults.map((anime) => {
                              const currentEps = anime.nextAiringEpisode ? (anime.nextAiringEpisode.episode - 1) : anime.episodes;
                              return (
                                <Link
                                  key={anime.id}
                                  to={getWatchUrl(anime.id, anime.title)}
                                  onClick={() => {
                                    setShowDropdown(false);
                                    setSearchQuery("");
                                  }}
                                  className="flex items-start gap-4 p-3 hover:bg-white/[0.04] cursor-pointer transition-colors border-b border-white/[0.02] last:border-0 group text-left"
                                >
                                  <img
                                    src={anime.coverImage?.medium || anime.coverImage?.large}
                                    alt={getTitle(anime.title)}
                                    loading="lazy"
                                    className="w-[40px] h-[54px] object-cover rounded-md flex-shrink-0 bg-[#0B0B0E]"
                                  />
                                  <div className="flex flex-col min-w-0 justify-center">
                                    <span className="text-white/90 text-[13px] font-medium truncate mb-1 group-hover:text-discord-400 transition-colors">
                                      {getTitle(anime.title)}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[9px] text-white/40 bg-white/[0.05] px-1.5 py-[2.5px] rounded-md flex items-center gap-1 font-medium leading-none">
                                        <span className="font-black text-[8px] tracking-tight translate-y-[0.2px]">CC</span>
                                        <span className="translate-y-[-0.2px]">{currentEps || "?"}</span>
                                      </span>
                                      <span className="text-[9px] text-white/40 bg-white/[0.05] px-1.5 py-[2.5px] rounded-md flex items-center gap-1 font-medium leading-none">
                                        <Mic size={9} fill="currentColor" className="translate-y-[0.2px]" />
                                        <span className="translate-y-[-0.2px]">{currentEps || "?"}</span>
                                      </span>
                                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">
                                        {anime.format || "TV"}
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="p-6 text-center text-white/30 text-[13px]">No results found.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT: Icons */}
          {!isLandingPage && (
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="xl:hidden w-[38px] h-[38px] flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
              >
                <Search size={18} strokeWidth={2.5} />
              </button>
              
              {/* Desktop EN Toggle */}
              <button
                onClick={toggleLanguage}
                className="hidden md:flex items-center justify-center w-[38px] h-[38px] rounded-full font-bold text-[13px] text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
                title="Toggle Language"
              >
                {language}
              </button>

              {/* Desktop AI Recommendations Icon */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-ai-chat'));
                }}
                className="hidden md:flex w-auto px-3 h-[38px] gap-2 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
                title="AI Recommendations"
              >
                <MessageSquare size={18} strokeWidth={2.5} />
                <span className="text-[12px] font-bold">AI</span>
              </button>

              {/* Notifications */}
              <div className="relative flex items-center">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (!isNotifOpen) fetchNotifications();
                    setIsNotifOpen(!isNotifOpen);
                  }}
                  className={`w-[38px] h-[38px] flex items-center justify-center rounded-full transition-colors duration-150 ${isNotifOpen ? 'text-discord-400 bg-white/[0.05]' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'}`}
                >
                  <Bell size={18} strokeWidth={2.5} />
                  {unreadCount > 0 && (
                    <span className="absolute top-[8px] right-[8px] bg-discord-600 text-white text-[9px] font-black min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border-[2px] border-[#0B0B0E]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
              </div>

              {/* Profile / Avatar or LOGIN button */}
              {user ? (
                <div className="ml-1">
                  <AvatarDropdown />
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="ml-1 h-[38px] flex items-center justify-center rounded-md px-3 text-white/50 hover:text-white hover:bg-white/[0.05] font-bold text-[12px] uppercase tracking-widest transition-colors duration-150"
                  title="Login"
                >
                  LOGIN
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="md:hidden absolute top-[56px] left-0 w-full bg-[#0B0B0E] border-b border-white/[0.05] p-3 animate-in slide-in-from-top duration-200 z-10 shadow-lg">
            <div className="relative w-full">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-[#1A1A1E] border border-transparent rounded-full px-4 h-[44px] w-full"
              >
                <Search className="w-[18px] h-[18px] text-white/40 mr-2.5" strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Anime"
                  className="bg-transparent text-[15px] font-medium text-white/90 outline-none w-full placeholder-white/30"
                  autoFocus
                />
                {isSearching && <div className="w-4 h-4 border-2 border-discord-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />}
                <button
                  type="button"
                  onClick={() => {
                    navigate("/browse");
                    setIsSearchOpen(false);
                    setShowDropdown(false);
                  }}
                  className="text-white/40 p-1 rounded-full transition-colors shrink-0 ml-1"
                >
                  <SlidersHorizontal size={18} strokeWidth={2.5} />
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <NavSidebar open={showSidebar} onClose={() => setShowSidebar(false)} initialTab={sidebarTab} />
      
      {/* Floating AI Chat */}
      <AiChat />
    </>
  );
}
