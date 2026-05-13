import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ALL_GENRES } from "../../constants/genres";
import NavSidebar from "./NavSidebar";
import { useLanguage } from "../../context/LanguageContext";
import { searchAnime } from "../../services/api";
import { MessageSquare, Mic, Clock, CheckCircle, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";
import AvatarDropdown from "../user/AvatarDropdown";
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
  const { user, loading: authLoading, globalNotifications, authToast } = useAuth();
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
    { name: "NEW RELEASES", path: "/browse?sort=START_DATE_DESC" },

    { name: "SCHEDULE", action: "sidebar" },

  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-110 bg-gradient-to-r from-black/95 via-[#1a0a0d]/95 to-black/95 backdrop-blur-md border-b border-red-900/30 shadow-[0_4px_30px_rgba(220,38,38,0.05)]" style={{ willChange: 'transform' }}>
        <div className="max-w-[1720px] mx-auto px-2 md:px-4 h-[56px] flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSidebarTab("menu");
                setShowSidebar(true);
              }}
              className="lg:hidden text-white/80 hover:text-white transition-colors"
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
            <div className="hidden lg:flex items-center gap-6 h-full">
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
                    className={`text-[11px] font-bold tracking-[1px] transition-all duration-200 px-3 py-1 rounded-[4px] flex items-center uppercase ${activeDropdown === link.dropdown && link.dropdown
                      ? "text-red-500"
                      : showSidebar && link.action === "sidebar"
                        ? "text-red-500"
                        : "text-white/40 hover:text-white"
                      }`}
                  >
                    {link.name}
                  </Link>

                  {/* Types Dropdown */}
                  {link.dropdown === 'types' && activeDropdown === 'types' && (
                    <div
                      className="absolute top-[56px] left-0 bg-gradient-to-b from-[#180a0e] to-black border-x border-b border-red-900/30 shadow-2xl p-4 w-[180px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
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
                            className="text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2.5 rounded text-[13px] font-medium transition-all leading-tight flex items-center hover:text-red-400"
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
                      className="absolute top-[56px] left-0 -translate-x-[50px] bg-gradient-to-b from-[#180a0e] to-black border-x border-b border-red-900/30 shadow-2xl p-5 w-[650px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="grid grid-cols-5 gap-x-4 gap-y-7">
                        {displayGenres.map((genre) => (
                          <Link
                            key={genre}
                            to={`/browse?genre=${genre}`}
                            onClick={() => setActiveDropdown(null)}
                            className="text-[#888] hover:text-white hover:bg-white/[0.03] px-2 py-1 rounded text-[12px] font-medium transition-all leading-tight flex items-center gap-2 group"
                          >
                            <div className="w-[3px] h-[3px] bg-red-600 rounded-full group-hover:scale-150 transition-transform" />
                            {genre}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between font-bold uppercase tracking-widest text-[9px]">
                        <span className="text-[#666]">Explore 41 unique categories</span>
                        <Link to="/browse" className="text-red-500 hover:text-red-400">View All Filters</Link>
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
              <div ref={searchContainerRef} className="hidden md:relative md:flex md:items-center">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center bg-white/[0.03] border border-white/5 rounded-[6px] px-3 py-1.5 focus-within:border-red-500/50 transition-all w-[240px] xl:w-[320px]"
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
                  {isSearching && <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />}
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
                      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Quick Filters</span>
                            <div className="w-1 h-1 bg-red-600 rounded-full" />
                          </div>
                          <button
                            onClick={() => setSearchFilters({ format_in: [], status: "", season: "" })}
                            className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase"
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
                                className={`px-2 py-1 rounded-[4px] text-[9px] font-bold border transition-all ${searchFilters.format_in.includes(f) ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
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
                              className="bg-white/5 border border-white/5 text-[9px] text-white/60 rounded px-2 py-1 outline-none flex-1"
                            >
                              <option value="">All Status</option>
                              <option value="RELEASING">Airing</option>
                              <option value="FINISHED">Finished</option>
                            </select>
                            <select
                              value={searchFilters.season}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, season: e.target.value }))}
                              className="bg-white/5 border border-white/5 text-[9px] text-white/60 rounded px-2 py-1 outline-none flex-1"
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
                        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Results</span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilters(!showFilters); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${showFilters ? 'bg-red-600/20 text-red-500' : 'text-white/30 hover:text-white/60'}`}
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
                                  to={`/watch/${anime.id}`}
                                  onClick={() => {
                                    setShowDropdown(false);
                                    setSearchQuery("");
                                  }}
                                  className="flex items-start gap-4 p-3 hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/5 last:border-0 group text-left"
                                >
                                  <img
                                    src={anime.coverImage?.medium || anime.coverImage?.large}
                                    alt={getTitle(anime.title)}
                                    loading="lazy"
                                    className="w-[40px] h-[54px] object-cover rounded-[3px] flex-shrink-0 bg-white/5"
                                  />
                                  <div className="flex flex-col min-w-0 justify-center">
                                    <span className="text-white text-[13px] font-medium truncate mb-1 group-hover:text-red-500 transition-colors">
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
                className="flex items-center justify-center bg-[#2a2a2a] border border-white/10 h-[26px] min-w-[34px] rounded-[4px] text-[10px] font-black text-white hover:bg-red-600 transition-all duration-300 group overflow-hidden"
                title={`Switch to ${language === 'EN' ? 'Japanese' : 'English'}`}
              >
                <span className="italic tracking-tighter transform group-hover:scale-110 transition-transform">
                  {language === "EN" ? "EN" : "JP"}
                </span>
              </button>

              {/* Bell icon - Desktop Only */}
              <div className="hidden lg:relative lg:block">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`block transition-all transform hover:scale-110 relative ${isNotifOpen ? 'text-red-500' : 'text-[#888] hover:text-white'}`}
                >
                  <svg className={`w-[19px] h-[19px] ${unreadCount > 0 ? 'fill-red-500/20' : 'fill-[#888]/10'}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
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
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-[4px] transition-all uppercase tracking-widest ml-1 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer"
                >
                  Login
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Mobile Secondary Search Row - Absolute Overlay */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="md:hidden absolute top-[56px] left-0 w-full bg-[#121212] border-b border-white/5 px-2 pb-3 pt-1 animate-in slide-in-from-top duration-300 z-10 shadow-2xl">
            <div className="relative">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-white/[0.05] border border-red-500/30 rounded-[8px] px-3 py-2"
              >
                <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
                {isSearching && <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />}
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
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-[12px] shadow-2xl overflow-hidden z-[200]">
                  {/* Mobile Quick Filters Panel */}
                  {showFilters && (
                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Quick Filters</span>
                        <button
                          onClick={() => setSearchFilters({ format_in: [], status: "", season: "" })}
                          className="text-[10px] text-red-500 font-bold uppercase"
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
                              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-bold border transition-all ${searchFilters.format_in.includes(f) ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={searchFilters.status}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="bg-white/5 border border-white/5 text-[11px] text-white/60 rounded-[6px] px-3 py-2 outline-none flex-1"
                          >
                            <option value="">All Status</option>
                            <option value="RELEASING">Airing</option>
                            <option value="FINISHED">Finished</option>
                          </select>
                          <select
                            value={searchFilters.season}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, season: e.target.value }))}
                            className="bg-white/5 border border-white/5 text-[11px] text-white/60 rounded-[6px] px-3 py-2 outline-none flex-1"
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
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Results</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilters(!showFilters); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${showFilters ? 'bg-red-600/20 text-red-500' : 'bg-white/5 text-white/40'}`}
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
                                to={`/watch/${anime.id}`}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                  setShowFilters(false);
                                }}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0"
                              >
                                <img
                                  src={anime.coverImage?.medium || anime.coverImage?.large}
                                  alt={getTitle(anime.title)}
                                  className="w-[45px] h-[60px] object-cover rounded-[6px]"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-white text-[14px] font-medium truncate mb-1">{getTitle(anime.title)}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{anime.format || "TV"}</span>
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-bottom-5 fade-in duration-500 pointer-events-none px-4">
          <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 pointer-events-auto">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              authToast.toLowerCase().includes("welcome") || authToast.toLowerCase().includes("success")
                ? "bg-green-500/10 text-green-500" 
                : "bg-red-500/10 text-red-500"
            }`}>
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <p className="text-white text-[13px] font-bold tracking-tight">
              {authToast}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
