import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ALL_GENRES } from "../../constants/genres";
import NavSidebar from "./NavSidebar";
import { useLanguage } from "../../context/LanguageContext";
import { searchAnime } from "../../services/api";
import { getWatchUrl } from "../../utils/url";
import { MessageSquare, Mic, Clock, CheckCircle, CheckCircle2, SlidersHorizontal, X, Users } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";
import AvatarDropdown from "../user/AvatarDropdown";
import AiChat from "../chat/AiChat";
import NotificationDropdown from "../user/NotificationDropdown";


export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState(null);
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
  const [showLoginTip, setShowLoginTip] = useState(() => {
    const lastSeen = localStorage.getItem('loginTipSeenAt');
    if (!lastSeen) return true;
    
    // Check if 1 hour (3600000 ms) has passed
    const hasOneHourPassed = (Date.now() - parseInt(lastSeen, 10)) > 3600000;
    return hasOneHourPassed;
  });
  const [searchFilters, setSearchFilters] = useState({
    format_in: [],
    status: "",
    season: "",
  });

  const unreadCount = globalNotifications.filter(n => !n.isRead).length;

  const displayGenres = ALL_GENRES;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "true" && !showLoginModal && !user) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
        // Clear the query param so it doesn't trigger again
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

  const links = [
    { name: "TYPES", path: "/browse", dropdown: "types" },
    { name: "GENRES", path: "/browse", dropdown: "genres" },
    { name: "LIVE CHAT", path: "/chat" },
    { name: "COMMUNITY", path: "/community" },
    { name: "HENTAI", path: "/nsfw" },
    { 
      name: "WATCH TOGETHER", 
      path: "/watch2gether", 
      icon: (
        <div className="relative flex items-center justify-center">
          <Users size={18} />
          <span className="absolute -top-2 -right-4 bg-discord-600 text-[6px] font-black uppercase text-white px-1 rounded-sm shadow-lg leading-tight">Beta</span>
        </div>
      ) 
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-110 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-lg" style={{ willChange: 'transform' }}>
        <div className="max-w-[1720px] mx-auto px-2 md:px-4 h-[56px] flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSidebarTab("menu");
                setShowSidebar(true);
              }}
              className="md:hidden text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            {!isLandingPage && (
              <a
                href="/home"
                className="flex items-center gap-0 shrink-0"
              >
                <img src="/logo.png" alt="AniXo" fetchPriority="high" decoding="async" className="h-[82px] md:h-[114px] w-auto object-contain" style={{ filter: 'brightness(1.2) contrast(1.1)' }} />
              </a>
            )}
          </div>

          {/* Navigation links */}
          {!isLandingPage && (
            <div className="flex max-md:hidden items-center gap-2 lg:gap-6 h-full shrink-0">
              {links.map((link) => (
                <div
                  key={link.name}
                  className="h-full flex items-center relative group"
                  onMouseEnter={() => link.dropdown && setActiveDropdown(link.dropdown)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={link.path || "#"}
                    onClick={(e) => {
                      if (link.action === "sidebar") {
                        e.preventDefault();
                        setSidebarTab("schedule");
                        setShowSidebar(true);
                      }
                    }}
                    className={`text-[9px] lg:text-[11px] font-bold tracking-[0.5px] lg:tracking-[1px] transition-all duration-200 px-1.5 lg:px-3 py-1 rounded-[4px] flex items-center uppercase whitespace-nowrap ${
                      link.name === "HENTAI"
                        ? "bg-gradient-to-r from-[#ff2a5f] to-[#ff7e40] bg-clip-text text-transparent hover:scale-110"
                        : activeDropdown === link.dropdown && link.dropdown
                          ? "text-discord-500"
                          : showSidebar && link.action === "sidebar"
                            ? "text-discord-500"
                            : "text-white/40 hover:text-white"
                      }`}
                  >
                    {link.icon ? (
                      <span className="flex items-center justify-center w-full h-full text-white/70 group-hover:text-white group-hover:scale-110 transition-all">
                        {link.icon}
                      </span>
                    ) : (
                      link.name
                    )}
                  </Link>

                  {/* Types Dropdown */}
                  {link.dropdown === 'types' && activeDropdown === 'types' && (
                    <div
                      className="absolute top-[56px] left-0 bg-black/90 backdrop-blur-xl border-x border-b border-white/10 shadow-2xl p-4 w-[180px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="flex flex-col gap-1">
                        {[
                          { label: "Movies", value: "MOVIE" },
                          { label: "TV Series", value: "TV" },
                          { label: "OVAs", value: "OVA" },
                          { label: "ONAs", value: "ONA" },
                          { label: "Specials", value: "SPECIAL" },
                        ].map((type) => (
                          <Link
                            key={type.value}
                            to={`/browse?format=${type.value}`}
                            onClick={() => setActiveDropdown(null)}
                            className="text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2.5 rounded text-[13px] font-medium transition-all leading-tight flex items-center hover:text-discord-400"
                          >
                            {type.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Genres Mega-Dropdown */}
                  {link.dropdown === 'genres' && activeDropdown === 'genres' && (
                    <div
                      className="absolute top-[56px] left-0 -translate-x-[50px] bg-black/90 backdrop-blur-xl border-x border-b border-white/10 shadow-2xl p-5 w-[650px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="grid grid-cols-5 gap-x-4 gap-y-7">
                        {displayGenres.map((genre) => (
                          <Link
                            key={genre}
                            to={`/browse?genre=${genre}`}
                            onClick={() => setActiveDropdown(null)}
                            className="text-[#888] hover:text-white hover:bg-white/[0.03] px-2 py-1 rounded text-[12px] font-medium transition-all leading-tight flex items-center gap-2 group"
                          >
                            <div className="w-[3px] h-[3px] bg-discord-600 rounded-full group-hover:scale-150 transition-transform" />
                            {genre}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-discord-900/30 flex items-center justify-between font-bold uppercase tracking-widest text-[9px]">
                        <span className="text-[#666]">Explore 41 unique categories</span>
                        <Link to="/browse" className="text-discord-500 hover:text-discord-400">View All Filters</Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Right controls */}
          {!isLandingPage && (
            <div className="flex items-center gap-4">
              {/* Desktop Search Bar */}
              <div ref={searchContainerRef} className="relative flex items-center max-md:hidden">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center bg-white/[0.03] border border-white/15 rounded-[6px] px-3 py-1.5 focus-within:border-discord-500/50 transition-all w-[240px] xl:w-[320px]"
                >
                  <svg className="w-3.5 h-3.5 text-white/20" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                    placeholder="Search anime"
                    className="bg-transparent text-[13px] text-white outline-none px-2.5 w-full placeholder-white/60"
                  />
                  {isSearching && <div className="w-3 h-3 border-2 border-discord-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />}
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/browse");
                      setShowDropdown(false);
                    }}
                    className="bg-white/5 text-white/40 hover:bg-white/10 p-1.5 rounded-[4px] ml-1 transition-all flex items-center justify-center shrink-0"
                    title="Go to Advanced Search"
                  >
                    <SlidersHorizontal size={14} strokeWidth={3} />
                  </button>
                </form>

                {/* Desktop Dropdown Results */}
                {showDropdown && (
                  <div className="absolute top-full right-0 w-[400px] mt-2 bg-[#1a1a1a] border border-white/10 rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-110 animate-in fade-in zoom-in-95 duration-200">
                    {/* Advanced Filters Panel */}
                    {showFilters && (
                      <div className="p-4 border-b border-white/15 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Quick Filters</span>
                            <div className="w-1 h-1 bg-discord-600 rounded-full" />
                          </div>
                          <button
                            onClick={() => setSearchFilters({ format_in: [], status: "", season: "" })}
                            className="text-[9px] text-discord-500 hover:text-discord-400 font-bold uppercase"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="space-y-3">
                          {/* Formats */}
                          <div className="flex flex-wrap gap-1.5">
                            {['TV', 'MOVIE', 'OVA', 'ONA'].map(f => (
                              <button
                                key={f}
                                onClick={() => setSearchFilters(prev => ({
                                  ...prev,
                                  format_in: prev.format_in.includes(f) ? prev.format_in.filter(x => x !== f) : [...prev.format_in, f]
                                }))}
                                className={`px-2 py-1 rounded-[4px] text-[9px] font-bold border transition-all ${searchFilters.format_in.includes(f) ? 'bg-discord-600 border-discord-600 text-white' : 'bg-white/5 border-white/15 text-white/40 hover:border-white/20'}`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                          {/* Status & Season */}
                          <div className="flex gap-2">
                            <select
                              value={searchFilters.status}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                              className="bg-white/5 border border-white/15 text-[9px] text-white/60 rounded px-2 py-1 outline-none flex-1"
                            >
                              <option value="">All Status</option>
                              <option value="RELEASING">Airing</option>
                              <option value="FINISHED">Finished</option>
                            </select>
                            <select
                              value={searchFilters.season}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, season: e.target.value }))}
                              className="bg-white/5 border border-white/15 text-[9px] text-white/60 rounded px-2 py-1 outline-none flex-1"
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
                      <div className="p-6 text-center text-white/40 text-[13px] animate-pulse">Searching...</div>
                    ) : (
                      <>
                        {/* Dropdown Header with Quick Filter Toggle */}
                        <div className="px-4 py-2 border-b border-white/15 flex items-center justify-between bg-white/[0.01]">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Results</span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilters(!showFilters); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${showFilters ? 'bg-discord-600/20 text-discord-500' : 'text-white/30 hover:text-white/60'}`}
                          >
                            <SlidersHorizontal size={10} strokeWidth={3} />
                            <span className="text-[9px] font-bold uppercase">Quick Filters</span>
                          </button>
                        </div>

                        {searchResults.length > 0 ? (
                          <ul className="max-h-[60vh] overflow-y-auto scrollbar-hide py-2">
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
                                  className="flex items-start gap-4 p-3 hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/15 last:border-0 group text-left"
                                >
                                  <img
                                    src={anime.coverImage?.medium || anime.coverImage?.large}
                                    alt={getTitle(anime.title)}
                                    loading="lazy"
                                    className="w-[40px] h-[54px] object-cover rounded-[3px] flex-shrink-0 bg-white/5"
                                  />
                                  <div className="flex flex-col min-w-0 justify-center">
                                    <span className="text-white text-[13px] font-medium truncate mb-1 group-hover:text-discord-500 transition-colors">
                                      {getTitle(anime.title)}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[9px] text-white/40 bg-white/5 px-1.5 py-[2.5px] rounded flex items-center gap-1 font-medium leading-none">
                                        <span className="font-black text-[8px] tracking-tight translate-y-[0.2px]">CC</span>
                                        <span className="translate-y-[-0.2px]">{currentEps || "?"}</span>
                                      </span>
                                      <span className="text-[9px] text-white/40 bg-white/5 px-1.5 py-[2.5px] rounded flex items-center gap-1 font-medium leading-none">
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
                          <div className="p-6 text-center text-white/40 text-[13px]">No results found.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Search Icon Toggle */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="md:hidden text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  {isSearchOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  )}
                </svg>
              </button>



              {/* Single Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex max-md:hidden items-center justify-center bg-[#2a2a2a] border border-white/10 h-[26px] min-w-[34px] rounded-[4px] text-[10px] font-black text-white hover:bg-discord-600 transition-all duration-300 group overflow-hidden"
                title={`Switch to ${language === 'EN' ? 'Japanese' : 'English'}`}
              >
                <span className="italic tracking-tighter transform group-hover:scale-110 transition-transform">
                  {language === "EN" ? "EN" : "JP"}
                </span>
              </button>

              {/* Anixo AI Chat Icon */}
              <AiChat />

              {/* Bell icon - Mobile and Desktop */}
              <div className="relative">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (!isNotifOpen) fetchNotifications();
                    setIsNotifOpen(!isNotifOpen);
                  }}
                  className={`block transition-all transform hover:scale-110 relative ${isNotifOpen ? 'text-discord-500' : 'text-[#888] hover:text-white'}`}
                >
                  <svg className={`w-[19px] h-[19px] ${unreadCount > 0 ? 'fill-discord-500/20' : 'fill-[#888]/10'}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-discord-600 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
              </div>

              {/* Login Link / Avatar Dropdown */}
              {user ? (
                <AvatarDropdown />
              ) : !authLoading ? (
                <div className="relative">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="text-[12px] font-bold bg-discord-600 hover:bg-discord-700 text-white px-3 py-1.5 rounded-[4px] transition-all uppercase tracking-widest ml-1 cursor-pointer"
                  >
                    Login
                  </button>
                  
                  {showLoginTip && (
                    <div className="absolute top-[calc(100%+14px)] right-0 w-64 bg-[#1a1a1a] border border-discord-500/30 rounded-lg p-3 shadow-2xl z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLoginTip(false);
                          localStorage.setItem('loginTipSeenAt', Date.now().toString());
                        }}
                        className="absolute top-1.5 right-1.5 p-1 text-white/40 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                      
                      <div className="flex gap-2.5 items-start mt-1">
                        <div className="bg-white/5 p-1.5 rounded-md flex-shrink-0">
                           <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                             <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                               <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                               <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                               <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                               <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                             </g>
                           </svg>
                        </div>
                        <div className="flex-1 pr-2">
                          <p className="text-[12px] text-white/90 font-medium leading-relaxed">
                            Now you can sign in or login using your Gmail acc direct
                          </p>
                        </div>
                      </div>
                      
                      {/* Triangle Pointer */}
                      <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#1a1a1a] border-t border-l border-discord-500/30 rotate-45"></div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Mobile Secondary Search Row - Absolute Overlay */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="md:hidden absolute top-[56px] left-0 w-full bg-black/90 backdrop-blur-xl border-b border-white/10 px-2 pb-3 pt-1 animate-in slide-in-from-top duration-300 z-10 shadow-2xl">
            <div className="relative">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-white/[0.05] border border-discord-500/30 rounded-[8px] px-3 py-2"
              >
                <svg className="w-4 h-4 text-discord-500 mr-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for anime..."
                  className="bg-transparent text-[14px] text-white outline-none w-full placeholder-white/60"
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
                  className="bg-white/5 text-white/40 p-2 rounded-[6px] transition-all flex items-center justify-center shrink-0"
                  title="Advanced Search"
                >
                  <SlidersHorizontal size={16} strokeWidth={3} />
                </button>
              </form>

              {/* Mobile Dropdown Results */}
              {showDropdown && (searchQuery.trim() || Object.keys(searchFilters).some(k => searchFilters[k]?.length > 0)) && (
                <div className="absolute top-full left-0 w-full mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-[12px] shadow-2xl overflow-hidden z-[200]">
                  {/* Mobile Quick Filters Panel */}
                  {showFilters && (
                    <div className="p-4 border-b border-white/15 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Quick Filters</span>
                        <button
                          onClick={() => setSearchFilters({ format_in: [], status: "", season: "" })}
                          className="text-[10px] text-discord-500 font-bold uppercase"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {['TV', 'MOVIE', 'OVA', 'ONA'].map(f => (
                            <button
                              key={f}
                              onClick={() => setSearchFilters(prev => ({
                                ...prev,
                                format_in: prev.format_in.includes(f) ? prev.format_in.filter(x => x !== f) : [...prev.format_in, f]
                              }))}
                              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-bold border transition-all ${searchFilters.format_in.includes(f) ? 'bg-discord-600 border-discord-600 text-white' : 'bg-white/5 border-white/15 text-white/40'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={searchFilters.status}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="bg-white/5 border border-white/15 text-[11px] text-white/60 rounded-[6px] px-3 py-2 outline-none flex-1"
                          >
                            <option value="">All Status</option>
                            <option value="RELEASING">Airing</option>
                            <option value="FINISHED">Finished</option>
                          </select>
                          <select
                            value={searchFilters.season}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, season: e.target.value }))}
                            className="bg-white/5 border border-white/15 text-[11px] text-white/60 rounded-[6px] px-3 py-2 outline-none flex-1"
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
                    <div className="p-8 text-center text-white/40 text-[14px] animate-pulse font-medium">Searching anime...</div>
                  ) : (
                    <>
                      {/* Mobile Dropdown Header */}
                      <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between bg-white/[0.01]">
                        <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Results</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilters(!showFilters); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${showFilters ? 'bg-discord-600/20 text-discord-500' : 'bg-white/5 text-white/40'}`}
                        >
                          <SlidersHorizontal size={12} strokeWidth={3} />
                          <span className="text-[10px] font-bold uppercase">Quick Filters</span>
                        </button>
                      </div>

                      {searchResults.length > 0 ? (
                        <ul className="max-h-[60vh] overflow-y-auto py-2">
                          {searchResults.map((anime) => {
                            const currentEps = anime.nextAiringEpisode ? (anime.nextAiringEpisode.episode - 1) : anime.episodes;
                            return (
                              <Link
                                key={anime.id}
                                to={getWatchUrl(anime.id, anime.title)}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                  setShowFilters(false);
                                }}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/15 last:border-0"
                              >
                                <img
                                  src={anime.coverImage?.medium || anime.coverImage?.large}
                                  alt={getTitle(anime.title)}
                                  className="w-[45px] h-[60px] object-cover rounded-[6px]"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-white text-[14px] font-medium truncate mb-1">{getTitle(anime.title)}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-discord-500 font-bold uppercase tracking-widest">{anime.format || "TV"}</span>
                                    <span className="text-[10px] text-white/40 font-medium">{currentEps || "?"} Episodes</span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-white/40 text-[14px]">No results found.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Navigation Sidebar (includes Schedule) */}
      <NavSidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        initialTab={sidebarTab}
      />

      {/* Global Toast (Premium Minimalist Design) */}
      {authToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-none px-4">
          <div className="bg-[#1a1a1a] border border-white/10 px-4 py-2.5 rounded-md flex items-center gap-2 shadow-lg pointer-events-auto">
            {authToast.toLowerCase().includes("welcome") || authToast.toLowerCase().includes("success") ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : null}
            <p className="text-white text-[13px] font-medium">
              {authToast}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
