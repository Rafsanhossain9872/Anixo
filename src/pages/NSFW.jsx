import { useState, useEffect } from 'react';
import { Play, Search, Tags, ArrowLeft, Star, Eye, ThumbsUp, X, Loader2, ChevronLeft, ChevronRight, Download, History, Bookmark, BookmarkCheck, ShieldAlert, ShieldCheck, Menu, ArrowDownAz, ChevronDown, Check, Home } from 'lucide-react';
import { AdBanner728x90, AdBanner300x250, AdNativeBanner } from '../components/common/AdBanner';
import { AdsterraSmartLinkBanner } from '../components/common/AdsterraSmartLink';

const API_URL = import.meta.env.VITE_NSFW_API;

const SkeletonCard = () => (
 <div className="group glass-panel border border-[#2a2a35] bg-[#1c1c24] overflow-hidden flex flex-col animate-pulse h-full">
 <div className="relative aspect-[3/4] overflow-hidden bg-[#1c1c24]/50" />
 <div className="p-4 flex-1 flex flex-col gap-3">
 <div className="h-4 bg-[#1c1c24]/80 rounded w-3/4" />
 <div className="h-3 bg-[#1c1c24]/80 rounded w-1/2 mb-2" />
 <div className="mt-auto flex items-center justify-between">
 <div className="h-3 bg-[#1c1c24]/80 rounded w-1/4" />
 <div className="h-3 bg-[#1c1c24]/80 rounded w-1/4" />
 </div>
 </div>
 </div>
);

const VideoCard = ({ video, onClick }) => (
 <div 
 onClick={() => onClick(video)}
 className="group cursor-pointer bg-[#16161a] border border-[#2a2a35] hover:border-[#ff2a5f] transition-colors flex flex-col"
 >
 <div className="relative aspect-[3/4] overflow-hidden bg-black/50">
 <img 
 src={`https://hentai.tv${video.cover || video.thumb}`} 
 alt={video.title}
 className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-70"
 onError={(e) => { e.target.src = 'https://via.placeholder.com/400x225?text=No+Image' }}
 />
 <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/90 via-[#0b0e14]/20 to-transparent opacity-80" />
 
 <div className="absolute top-2 left-2 flex flex-col gap-1">
 {video.censored ? (
 <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-green-950 text-green-500 border border-green-800">Censored</span>
 ) : (
 <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-red-950 text-discord-500 border border-discord-800">Uncensored</span>
 )}
 </div>
 
 <div className="absolute top-2 right-2 bg-black/90 text-xs px-1.5 py-0.5 font-medium border border-[#2a2a35]">EP {video.ep}</div>
 <div className="absolute bottom-2 right-2 bg-black/90 text-xs px-1.5 py-0.5 font-mono">{video.duration}</div>
 
 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/30 backdrop-blur-[2px]">
 <div className="bg-[#ff2a5f] text-white p-3 border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300">
 <Play className="w-8 h-8 ml-1" />
 </div>
 </div>
 </div>
 
 <div className="p-3 flex-1 flex flex-col bg-[#16161a] border-t border-transparent group-hover:border-[#ff2a5f]/30 transition-colors">
 <h3 className="font-semibold text-sm line-clamp-2 mb-1 leading-snug group-hover:text-[#ff2a5f] transition-colors" title={video.title}>{video.title}</h3>
 <p className="text-xs text-gray-500 mb-2 truncate">{video.brand}</p>
 <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
 <div className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views?.toLocaleString()}</div>
 <div className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-current" /> {video.rating}</div>
 </div>
 </div>
 </div>
);

const VideoSection = ({ title, icon, videos, loading, onVideoClick, skeletonCount = 5, onViewAll }) => (
 <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-lg">{icon}</span>
 <h2 className="text-xl font-bold text-white">{title}</h2>
 </div>
 {onViewAll && !loading && videos.length > 10 && (
 <button
 onClick={onViewAll}
 className="flex items-center gap-1.5 text-sm text-[#ff7e40] hover:text-[#ff2a5f] font-medium transition-colors group"
 >
 View All
 <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
 </button>
 )}
 </div>
 {loading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
 {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
 {videos.slice(0, 10).map(video => <VideoCard key={video.id} video={video} onClick={onVideoClick} />)}
 </div>
 )}
 </div>
);


function NSFW() {
 const [videos, setVideos] = useState([]);
 const [genres, setGenres] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [searchInput, setSearchInput] = useState('');
 const [autoCompleteResults, setAutoCompleteResults] = useState([]);
 const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
 const [isAutoCompleteLoading, setIsAutoCompleteLoading] = useState(false);
 const [previousUrl, setPreviousUrl] = useState('/');
 const [sortBy, setSortBy] = useState('relevance');
 const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
 const [selectedVideo, setSelectedVideo] = useState(null);
 const [videoDetails, setVideoDetails] = useState(null);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [activeGenre, setActiveGenre] = useState(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [isHomePage, setIsHomePage] = useState(true);
 const [viewAllSection, setViewAllSection] = useState(null); // 'recent' | 'trending' | null
 const [recentVideos, setRecentVideos] = useState([]);
 const [trendingVideos, setTrendingVideos] = useState([]);
 const [trendingLoading, setTrendingLoading] = useState(false);

 const [history, setHistory] = useState(() => {
 try { return JSON.parse(localStorage.getItem('hentai_history')) || []; } catch { return []; }
 });
 const [favorites, setFavorites] = useState(() => {
 try { return JSON.parse(localStorage.getItem('hentai_favorites')) || []; } catch { return []; }
 });

 useEffect(() => { localStorage.setItem('hentai_history', JSON.stringify(history)); }, [history]);
 useEffect(() => { localStorage.setItem('hentai_favorites', JSON.stringify(favorites)); }, [favorites]);

 const ITEMS_PER_PAGE = 28; // matches server page size
 const [currentPage, setCurrentPage] = useState(1);
 const [totalServerPages, setTotalServerPages] = useState(1);

 const updateUrl = (url) => {
    url = '/nsfw' + (url === '/' ? '' : url);
 if (window.location.pathname + window.location.search !== url) {
 window.history.pushState({}, '', url);
 }
 };


 // Prevent background scrolling when sidebar is open
 useEffect(() => {
 if (isSidebarOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = 'unset';
 }
 return () => {
 document.body.style.overflow = 'unset';
 };
 }, [isSidebarOpen]);

 const fetchRecent = async () => {
 setSelectedVideo(null);
 updateUrl('/');
 setLoading(true);
 setTrendingLoading(true);
 setActiveGenre(null);
 setIsHomePage(true);
 setCurrentPage(1);
 // Fetch recent and trending independently
 const fetchRecentData = async () => {
 try {
 const res = await fetch(`${API_URL}/recent?page=1`);
 const json = await res.json();
 if (json.success) {
 setVideos(json.data);
 setRecentVideos(json.data);
 }
 } catch (e) { console.error('Recent fetch error:', e); }
 setLoading(false);
 };
 const fetchTrendingData = async () => {
 try {
 const res = await fetch(`${API_URL}/trending?page=1`);
 const json = await res.json();
 if (json.success) setTrendingVideos(json.data);
 } catch (e) { console.error('Trending fetch error:', e); }
 setTrendingLoading(false);
 };
 fetchRecentData();
 fetchTrendingData();
 };

 const fetchBrowse = async (page = 1) => {
 setSelectedVideo(null);
 setIsHomePage(false);
 setViewAllSection(null);
 updateUrl(`/browse${page > 1 ? `?page=${page}` : ''}`);
 setLoading(true);
 setActiveGenre('browse');
 setCurrentPage(page);
 try {
 const res = await fetch(`${API_URL}/recent?page=${page}`);
 const json = await res.json();
 if (json.success) {
 setVideos(json.data);
 setTotalServerPages(json.pages || 1);
 }
 } catch (e) { console.error(e); }
 setLoading(false);
 };

 const fetchTrendingAll = async (page = 1) => {
 setSelectedVideo(null);
 setIsHomePage(false);
 setViewAllSection(null);
 updateUrl(`/trending${page > 1 ? `?page=${page}` : ''}`);
 setLoading(true);
 setActiveGenre('trending');
 setCurrentPage(page);
 try {
 const res = await fetch(`${API_URL}/trending?page=${page}`);
 const json = await res.json();
 if (json.success) {
 setVideos(json.data);
 setTotalServerPages(json.pages || 1);
 }
 } catch (e) { console.error(e); }
 setLoading(false);
 };

 const fetchGenres = async () => {
 try {
 const res = await fetch(`${API_URL}/genres`);
 const json = await res.json();
 if (json.success) setGenres(json.data);
 } catch (e) {
 console.error(e);
 }
 };

 const fetchByGenre = async (slug, page = 1) => {
 setSelectedVideo(null);
 setIsHomePage(false);
 updateUrl(`/genre/${slug}${page > 1 ? `?page=${page}` : ''}`);
 setLoading(true);
 setActiveGenre(slug);
 setCurrentPage(page);
 try {
 const res = await fetch(`${API_URL}/genre/${slug}?page=${page}`);
 const json = await res.json();
 if (json.success) {
 setVideos(json.data);
 setTotalServerPages(json.pages || 1);
 }
 } catch (e) {
 console.error(e);
 }
 setLoading(false);
 };

 // No need for fetchMoreBackendData — page navigation triggers full server refetch
 const goToPage = (page) => {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 if (activeGenre === 'browse') fetchBrowse(page);
 else if (activeGenre === 'trending') fetchTrendingAll(page);
 else if (activeGenre === 'search') performSearch(searchQuery, page);
 else if (activeGenre && !['history', 'favorites'].includes(activeGenre)) fetchByGenre(activeGenre, page);
 };

 // No auto-prefetch needed — server pagination replaces client-side infinite scroll
 
 // AutoComplete Effect
 useEffect(() => {
 const timer = setTimeout(async () => {
 if (searchInput.trim().length >= 2) {
 setIsAutoCompleteLoading(true);
 try {
 const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchInput)}&page=1`);
 const json = await res.json();
 if (json.success) {
 setAutoCompleteResults(json.data.slice(0, 5));
 setIsAutoCompleteOpen(true);
 }
 } catch (e) {
 console.error(e);
 }
 setIsAutoCompleteLoading(false);
 } else {
 setAutoCompleteResults([]);
 setIsAutoCompleteOpen(false);
 }
 }, 400);
 return () => clearTimeout(timer);
 }, [searchInput]);

 const performSearch = async (query, page = 1) => {
 setSelectedVideo(null);
 setIsHomePage(false);
 updateUrl(`/search?q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`);
 setLoading(true);
 setActiveGenre('search');
 setCurrentPage(page);
 try {
 const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&page=${page}`);
 const json = await res.json();
 if (json.success) {
 setVideos(json.data);
 // Search API doesn't return pages; show what we get
 setTotalServerPages(json.data.length === 0 ? 1 : Math.max(1, page));
 }
 } catch (e) {
 console.error(e);
 }
 setLoading(false);
 };


 useEffect(() => {
 const handleUrl = () => {
 const path = window.location.pathname.replace(/^\/nsfw/, '') || '/';
 const searchParams = new URLSearchParams(window.location.search);
 
 if (!path.startsWith('/hentai/')) {
 setSelectedVideo(null);
 }
 
 if (path.startsWith('/genre/')) {
 const slug = path.replace('/genre/', '');
 if (slug) {
 fetchByGenre(slug);
 return;
 }
 } else if (path === '/search') {
 const q = searchParams.get('q');
 if (q) {
 setSearchQuery(q);
 performSearch(q);
 return;
 }
 } else if (path === '/browse') {
 fetchBrowse();
 return;
 } else if (path === '/trending') {
 fetchTrendingAll();
 return;
 }
 
 fetchRecent();
 };

 handleUrl();
 // eslint-disable-next-line
  fetchGenres();

 window.addEventListener('popstate', handleUrl);
 return () => window.removeEventListener('popstate', handleUrl);
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 const loadLocalVideos = (type) => {
 setSelectedVideo(null);
 setIsHomePage(false);
 setLoading(true);
 setActiveGenre(type);
 setCurrentPage(1);
 if (type === 'history') setVideos(history);
 if (type === 'favorites') setVideos(favorites);
 setLoading(false);
 };

 const handleSearchSubmit = (e) => {
 e.preventDefault();
 if (searchInput.trim()) {
 setSearchQuery(searchInput);
 performSearch(searchInput);
 setIsAutoCompleteOpen(false);
 }
 };

 const clearSearch = () => {
 setSearchInput('');
 setSearchQuery('');
 setAutoCompleteResults([]);
 setIsAutoCompleteOpen(false);
 setSelectedVideo(null);
 setViewAllSection(null);
 fetchRecent();
 };

 const openVideo = async (video) => {
 setPreviousUrl(window.location.pathname + window.location.search);
 updateUrl(`/hentai/${video.slug}`);
 
 setHistory(prev => {
 const filtered = prev.filter(v => v.id !== video.id);
 return [video, ...filtered].slice(0, 50);
 });

 setSelectedVideo(video);
 setVideoDetails(null);

 setLoadingDetails(true);
 try {
 const detailsRes = await fetch(`${API_URL}/details/${video.slug}`);
 const detailsJson = await detailsRes.json();
 if (detailsJson.success) setVideoDetails(detailsJson.data);
 } catch(e) { console.error(e); }
 setLoadingDetails(false);
 };

 const handleTagClick = (tag) => {
 const matchingGenre = genres.find(g => g.name.toLowerCase() === tag.toLowerCase());
 const fallbackSlug = tag.toLowerCase().trim().replace(/\s+/g, '-');
 const matchedBySlug = genres.find(g => g.slug === fallbackSlug);
 
 const targetGenre = matchingGenre || matchedBySlug;
 
 setSelectedVideo(null);
 
 if (targetGenre) {
 setSearchQuery('');
 setSearchInput('');
 fetchByGenre(targetGenre.slug);
 } else {
 setSearchQuery(tag);
 setSearchInput(tag);
 performSearch(tag);
 setIsAutoCompleteOpen(false);
 }
 };


 const getSortedVideos = () => {
 let sorted = [...videos];
 if (sortBy === 'views') {
 sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
 } else if (sortBy === 'rating') {
 sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
 } else if (sortBy === 'alpha') {
 sorted.sort((a, b) => a.title.localeCompare(b.title));
 } else if (sortBy === 'recent') {
 sorted.sort((a, b) => {
 if (a.releasedAt && b.releasedAt) return new Date(b.releasedAt) - new Date(a.releasedAt);
 return (b.year || 0) - (a.year || 0);
 });
 }
 return sorted;
 };

 const sortedVideos = getSortedVideos();
 // Server already paginates — show all videos returned from current server page
 const currentVideos = sortedVideos;
 const totalPages = totalServerPages;

 const renderPagination = () => {
 if (totalPages <= 1) return null;

 const buildPages = () => {
 const pages = [];
 if (totalPages <= 7) {
 for (let i = 1; i <= totalPages; i++) pages.push(i);
 } else if (currentPage <= 4) {
 pages.push(1, 2, 3, 4, 5, '...', totalPages);
 } else if (currentPage >= totalPages - 3) {
 pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
 } else {
 pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
 }
 return pages;
 };

 return (
 <div className="mt-12 pt-8 border-t border-[#2a2a35]/50 flex items-center justify-center gap-2 flex-wrap">
 <button
 onClick={() => goToPage(currentPage - 1)}
 disabled={currentPage === 1}
 className="w-12 h-12 flex items-center justify-center bg-[#16161a] border border-[#2a2a35] text-gray-400 hover:text-white hover:bg-[#1c1c24] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>

 {buildPages().map((page, idx) =>
 page === '...' ? (
 <span key={`dots-${idx}`} className="w-12 h-12 flex items-center justify-center text-gray-500 font-medium">…</span>
 ) : (
 <button
 key={page}
 onClick={() => goToPage(page)}
 className={`w-12 h-12 flex items-center justify-center font-bold transition-all text-sm ${
 currentPage === page
 ? 'bg-gradient-to-br from-[#ff2a5f] to-[#ff7e40] text-white border-none scale-105'
 : 'bg-[#16161a] border border-[#2a2a35] text-gray-400 hover:text-white hover:bg-[#1c1c24]'
 }`}
 >
 {page}
 </button>
 )
 )}

 <button
 onClick={() => goToPage(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="w-12 h-12 flex items-center justify-center bg-[#16161a] border border-[#2a2a35] text-gray-400 hover:text-white hover:bg-[#1c1c24] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
 >
 <ChevronRight className="w-5 h-5" />
 </button>

 <span className="text-xs text-gray-500 ml-2">
 Page {currentPage} of {totalPages.toLocaleString()}
 </span>
 </div>
 );
 };

 return (
 <div className="min-h-screen flex flex-col md:flex-row relative">
 {/* Mobile Overlay */}
 {isSidebarOpen && (
 <div 
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity" 
 onClick={() => setIsSidebarOpen(false)}
 />
 )}

 {/* Sidebar */}
 <aside className={`w-64 glass-panel flex flex-col h-[100dvh] md:h-[calc(100vh-32px)] fixed md:sticky top-0 md:top-4 left-0 z-40 transition-transform duration-300 ease-in-out md:m-4 overflow-hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
 <div className="p-6 border-b border-[#2a2a35]/50 flex justify-between items-center">
 <h1 
 className="text-2xl font-bold bg-gradient-to-r from-[#ff2a5f] to-[#ff7e40] bg-clip-text text-transparent cursor-pointer"
 onClick={clearSearch}
 title="Go to Home"
 >
 TenZora 18+
 </h1>
 <button className="md:hidden text-gray-400 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
 <button 
 onClick={() => window.location.href = '/home'}
 className="w-full flex items-center justify-center gap-2 py-2 mb-6 rounded-[4px] bg-[#2a2a35]/30 hover:bg-[#ff2a5f]/20 text-gray-400 hover:text-[#ff2a5f] border border-[#2a2a35] hover:border-[#ff2a5f]/50 transition-all font-medium text-sm"
 >
 <ArrowLeft className="w-4 h-4" /> Back to TenZora
 </button>
 <div className="mb-6">
 <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
 <Bookmark className="w-4 h-4" /> Library
 </h2>
 <div className="flex flex-col gap-1">
 <button 
 onClick={() => { setSearchQuery(''); loadLocalVideos('history'); }}
 className={`text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${activeGenre === 'history' ? 'bg-accent-b/20 text-[#ff7e40] font-medium' : 'hover:bg-[#1c1c24]'}`}
 >
 <History className="w-4 h-4" /> Watch History
 </button>
 <button 
 onClick={() => { setSearchQuery(''); loadLocalVideos('favorites'); }}
 className={`text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${activeGenre === 'favorites' ? 'bg-accent-b/20 text-[#ff7e40] font-medium' : 'hover:bg-[#1c1c24]'}`}
 >
 <BookmarkCheck className="w-4 h-4" /> Favorites
 </button>
 </div>
 </div>

 <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
 <Tags className="w-4 h-4" /> Genres
 </h2>
 <div className="flex flex-col gap-1">
 <button 
 onClick={() => { setSearchQuery(''); fetchRecent(); }}
 className={`text-left px-3 py-2 text-sm transition-colors ${!activeGenre ? 'bg-accent-b/20 text-[#ff7e40] font-medium' : 'hover:bg-[#1c1c24]'}`}
 >
 <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Home</span>
 </button>
 {genres.map(g => (
 <button 
 key={g.slug}
 onClick={() => { setSearchQuery(''); fetchByGenre(g.slug); }}
 className={`text-left px-3 py-2 text-sm transition-colors ${activeGenre === g.slug ? 'bg-accent-b/20 text-[#ff7e40] font-medium' : 'hover:bg-[#1c1c24]'}`}
 >
 {g.name}
 </button>
 ))}
 </div>
  <div className="mt-8 mb-4 w-full flex justify-center scale-90 origin-top">
    <AdBanner300x250 />
  </div>
  </div>
 </aside>

 {/* Main Content */}
 <main className="flex-1 p-2 md:p-4 flex flex-col gap-4 w-full min-w-0 overflow-y-auto">
 
 {/* Professional Top Search Bar */}
 <div className="glass-panel p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 sticky top-0 z-20">
 {/* Mobile Header Row */}
 <div className="flex items-center justify-between md:hidden w-full">
 <div className="flex items-center gap-3">
 <button 
 className="p-2 text-gray-400 hover:text-white bg-[#1c1c24] transition-colors border border-[#2a2a35] shrink-0"
 onClick={() => setIsSidebarOpen(true)}
 >
 <Menu className="w-5 h-5" />
 </button>
 <h1 
 className="text-xl font-bold bg-gradient-to-r from-[#ff2a5f] to-[#ff7e40] bg-clip-text text-transparent cursor-pointer"
 onClick={clearSearch}
 title="Go to Home"
 >
 TenZora 18+
 </h1>
 </div>
 </div>
 
 
 <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-2xl mx-auto w-full z-50">
 <div className="relative group">
 <div className="relative bg-[#16161a] flex items-center px-4 py-3 border border-[#2a2a35] focus-within:border-[#ff2a5f] transition-colors">
 <Search className={`w-5 h-5 transition-colors ${searchInput ? 'text-[#ff7e40]' : 'text-gray-400'}`} />
 <input 
 type="text" 
 placeholder="Search for amazing content..." 
 value={searchInput}
 onChange={(e) => {
 setSearchInput(e.target.value);
 if (e.target.value.trim().length > 0) setIsAutoCompleteOpen(true);
 }}
 onFocus={() => {
 if (searchInput.trim().length >= 2) setIsAutoCompleteOpen(true);
 }}
 onBlur={() => setIsAutoCompleteOpen(false)}
 className="w-full bg-transparent border-none px-4 text-base focus:outline-none focus:ring-0 text-white placeholder-gray-500"
 />
 {searchInput && (
 <button type="button" onClick={clearSearch} className="p-1 hover:bg-[#1c1c24] rounded-sm transition-colors text-gray-400 hover:text-white">
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 
 {/* Autocomplete Dropdown */}
 {isAutoCompleteOpen && (searchInput.trim().length >= 2) && (
 <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c24] border border-[#2a2a35] overflow-hidden z-50 flex flex-col backdrop-blur-xl">
 {isAutoCompleteLoading ? (
 <div className="p-4 flex items-center justify-center text-gray-400">
 <Loader2 className="w-5 h-5 animate-spin" />
 </div>
 ) : autoCompleteResults.length > 0 ? (
 <>
 {autoCompleteResults.map((video) => (
 <button
 key={video.id}
 type="button"
 onMouseDown={(e) => e.preventDefault()}
 onClick={() => {
 setIsAutoCompleteOpen(false);
 setSearchInput('');
 setSearchQuery('');
 openVideo(video);
 }}
 className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-[#2a2a35]/30 last:border-0"
 >
 <img 
 src={`https://hentai.tv${video.cover || video.thumb}`} 
 alt={video.title} 
 onError={(e) => { e.target.src = 'https://via.placeholder.com/200x300?text=No+Image' }}
 className="w-10 h-14 object-cover rounded bg-[#16161a]/50 flex-shrink-0" 
 />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-white truncate">{video.title}</h4>
 <p className="text-xs text-gray-400 truncate mt-0.5">
 {video.tags?.slice(0, 3).join(', ')}
 </p>
 </div>
 </button>
 ))}
 <button
 type="submit"
 onMouseDown={(e) => e.preventDefault()}
 className="p-3 text-center text-sm text-[#ff2a5f] font-medium hover:bg-white/5 transition-colors border-t border-[#2a2a35]/50"
 >
 See all results for "{searchInput}"
 </button>
 </>
 ) : (
 <div className="p-4 text-center text-sm text-gray-400">
 No results found
 </div>
 )}
 </div>
 )}
 </div>
 </form>
 </div>

  <div className="hidden md:flex justify-center w-full my-2">
    <AdBanner728x90 />
  </div>

  <div className="w-full flex justify-center py-4">
    <AdsterraSmartLinkBanner />
  </div>

 {!selectedVideo ? (
 <>
 {/* Horizontal Scrollable Categories (YouTube Style) */}
 <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar w-full snap-x">
 <button 
 onClick={() => { setSearchQuery(''); fetchRecent(); }}
 className={`whitespace-nowrap px-5 py-2 rounded-sm text-sm font-medium transition-all snap-start shrink-0 ${!activeGenre && !searchQuery && activeGenre !== 'history' && activeGenre !== 'favorites' ? 'bg-gradient-to-r from-[#ff2a5f] to-[#ff7e40] text-white border-transparent' : 'bg-[#16161a] hover:bg-[#1c1c24] text-gray-300 border border-[#2a2a35] hover:text-white'}`}
 >
 All
 </button>
 {genres.map(g => (
 <button 
 key={g.slug}
 onClick={() => { setSearchQuery(''); fetchByGenre(g.slug); }}
 className={`whitespace-nowrap px-5 py-2 rounded-sm text-sm font-medium transition-all snap-start shrink-0 ${activeGenre === g.slug ? 'bg-gradient-to-r from-[#ff2a5f] to-[#ff7e40] text-white border-transparent' : 'bg-[#16161a] hover:bg-[#1c1c24] text-gray-300 border border-[#2a2a35] hover:text-white'}`}
 >
 {g.name}
 </button>
 ))}
 </div>

 <div className="w-full my-2">
    <AdNativeBanner />
  </div>

 {isHomePage ? (
 /* ========== HOMEPAGE ========== */
 viewAllSection ? (
 /* ---- View All Mode ---- */
 <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-lg">{viewAllSection === 'recent' ? '' : ''}</span>
 <h2 className="text-xl font-bold text-white">
 {viewAllSection === 'recent' ? 'Recent Uploads' : 'Trending Now'}
 </h2>
 <span className="text-xs text-gray-500 bg-[#16161a] px-2 py-0.5 rounded-sm border border-[#2a2a35]">
 {(viewAllSection === 'recent' ? recentVideos : trendingVideos).length}
 </span>
 </div>
 <button
 onClick={() => setViewAllSection(null)}
 className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white font-medium transition-colors"
 >
 <X className="w-4 h-4" /> Back
 </button>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
  {(viewAllSection === 'recent' ? recentVideos : trendingVideos).map(video => (
  <VideoCard key={video.id} video={video} onClick={openVideo} />
  ))}
  </div>

  <div className="w-full flex justify-center py-4">
    <AdsterraSmartLinkBanner />
  </div>
  </div>
 ) : (
 /* ---- Two Sections ---- */
 <div className="flex flex-col gap-6">
 <VideoSection
 title="Recent Uploads"
 icon=""
 videos={recentVideos}
 loading={loading}
 onVideoClick={openVideo}
 skeletonCount={10}
 onViewAll={() => fetchBrowse(1)}
 />

  <div className="w-full flex justify-center py-4">
    <AdsterraSmartLinkBanner />
  </div>

  <div className="w-full my-2">
    <AdNativeBanner />
  </div>
 <VideoSection
 title="Trending Now"
 icon=""
 videos={trendingVideos}
 loading={trendingLoading}
 onVideoClick={openVideo}
 skeletonCount={10}
 onViewAll={() => fetchTrendingAll(1)}
 />

 <div className="w-full flex justify-center py-4">
    <AdsterraSmartLinkBanner />
  </div>
 </div>
 )

 ) : (
 /* ========== OTHER PAGES: Sort + Grid ========== */
 <div className="glass-panel flex-1 p-6 flex flex-col">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 {activeGenre === 'search' ? `Search Results for "${searchQuery}"` :
 activeGenre === 'history' ? 'Watch History' :
 activeGenre === 'favorites' ? 'Your Favorites' :
 activeGenre === 'browse' ? 'Recent Uploads (Browse)' :
 activeGenre === 'trending' ? 'Trending Now' :
 activeGenre ? `Genre: ${genres.find(g => g.slug.toLowerCase() === activeGenre.toLowerCase())?.name || activeGenre.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}` : 
 'Recent Uploads'}
 </h2>
 <div className="flex flex-wrap items-center gap-3">
 <div className="relative">
 <button 
 onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
 className="flex items-center gap-2 px-4 py-2 bg-[#1c1c24] hover:bg-[#16161a]-3 border border-[#2a2a35] text-sm font-medium transition-colors"
 >
 <ArrowDownAz className="w-4 h-4 text-gray-400" />
 {sortBy === 'relevance' ? 'Relevance' : sortBy === 'views' ? 'Most Viewed' : sortBy === 'rating' ? 'Top Rated' : sortBy === 'alpha' ? 'A → Z' : 'Most Recent'}
 <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
 </button>
 {isSortDropdownOpen && (
 <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-[#1a1b26] border border-[#2a2a35] py-2 z-50">
 {[['relevance','Relevance'],['views','Most Viewed'],['rating','Top Rated'],['alpha','A → Z'],['recent','Most Recent']].map(([val, label]) => (
 <button key={val} onClick={() => { setSortBy(val); setIsSortDropdownOpen(false); }}
 className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors ${sortBy === val ? 'text-pink-500' : 'text-gray-300'}`}>
 {label} {sortBy === val && <Check className="w-4 h-4" />}
 </button>
 ))}
 </div>
 )}
 </div>
 <span className="text-sm text-gray-400 bg-[#1c1c24] px-3 py-1 rounded-sm border border-[#2a2a35] whitespace-nowrap">
 {videos.length} {videos.length === 1 ? 'video' : 'videos'} found
 </span>
 </div>
 </div>

 {loading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 flex-1 content-start">
 {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 flex-1 content-start">
 {currentVideos.map(video => <VideoCard key={video.id} video={video} onClick={openVideo} />)}
 </div>

 <div className="w-full my-2">
    <AdNativeBanner />
  </div>

 <div className="w-full flex justify-center py-6">
    <AdsterraSmartLinkBanner />
  </div>

 {renderPagination()}
 </>
 )}
 </div>
 )}
 </>
 ) : (
 <div className="glass-panel w-full flex-1 flex flex-col animate-in fade-in zoom-in duration-200 md: mb-4">
 <div className="flex items-center justify-between p-4 border-b border-[#2a2a35] bg-[#16161a]/50">
 <h3 className="font-semibold text-lg line-clamp-1">{selectedVideo.title} - EP {selectedVideo.ep}</h3>
 <div className="flex items-center gap-3 shrink-0">
 <button 
 onClick={() => {
 setFavorites(prev => {
 const isFav = prev.some(v => v.id === selectedVideo.id);
 if (isFav) return prev.filter(v => v.id !== selectedVideo.id);
 return [selectedVideo, ...prev];
 });
 }}
 className={`p-2 rounded-sm transition-colors ${favorites.some(v => v.id === selectedVideo.id) ? 'bg-accent-b/20 text-[#ff7e40]' : 'hover:bg-[#1c1c24] text-gray-400'}`}
 title="Toggle Favorite"
 >
 <Bookmark className="w-5 h-5" />
 </button>
 <button onClick={() => {
 setSelectedVideo(null);
 updateUrl(previousUrl);
 }} className="p-2 hover:bg-[#1c1c24] rounded-sm transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>
 
 <div className="p-4 md:p-6 flex flex-col gap-6">
  <div className="hidden md:flex justify-center w-full">
    <AdBanner728x90 />
  </div>
 {/* TOP: Video Player */}
 <div className="w-full aspect-video bg-black overflow-hidden border border-[#2a2a35] shrink-0">
 <iframe 
 src={selectedVideo.embedUrl} 
 allowFullScreen 
 className="w-full h-full border-0"
 />
 </div>

  <div className="w-full flex justify-center py-6">
    <AdsterraSmartLinkBanner />
  </div>

 {/* BOTTOM: Info Section */}
 <div className="flex flex-col sm:flex-row gap-6">
 {/* Left Side: Cover & Badges */}
 <div className="w-1/3 sm:w-1/4 shrink-0 mx-auto sm:mx-0 flex flex-col gap-3 items-center sm:items-start">
 <img 
 src={`https://hentai.tv${selectedVideo.cover}`} 
 className="w-full max-w-[160px] border border-[#2a2a35]" 
 alt="Cover" 
 onError={(e) => { e.target.src = 'https://via.placeholder.com/300x400?text=No+Cover' }}
 />
 {videoDetails && videoDetails.is_uncensored && (
 <div className="flex items-center gap-2 px-3 py-1.5 bg-discord-500/20 text-discord-400 border border-discord-500/30 text-xs font-semibold w-full max-w-[160px] justify-center text-center ">
 <ShieldAlert className="w-4 h-4" /> Uncensored
 </div>
 )}
 </div>
 
 {/* Right Side: Details */}
 <div className="flex-1 flex flex-col gap-4">
 <div className="flex flex-wrap gap-4 text-sm text-gray-300 justify-center sm:justify-start">
 <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-[#ff7e40]"/> {selectedVideo.views?.toLocaleString()}</span>
 <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4 text-green-400"/> {selectedVideo.likes}</span>
 <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500"/> {selectedVideo.rating}/10</span>
 </div>
 
 {loadingDetails ? (
 <div className="flex items-center gap-2 text-sm text-gray-400 justify-center sm:justify-start">
 <Loader2 className="w-4 h-4 animate-spin" /> Fetching deep metadata...
 </div>
 ) : videoDetails ? (
 <div className="flex flex-col gap-4">
 {videoDetails.studio && (
 <div className="text-sm font-semibold text-[#ff7e40] text-center sm:text-left">
 Studio: <span className="text-gray-300 font-normal">{videoDetails.studio}</span>
 </div>
 )}
 {videoDetails.description && (
 <p className="text-sm text-gray-400 leading-relaxed text-center sm:text-left" dangerouslySetInnerHTML={{ __html: videoDetails.description }} />
 )}

 <div className="flex flex-col gap-4 mt-2">
 {(() => {
 const allTags = Array.from(new Set([
 ...(selectedVideo.tags || []),
 ...(videoDetails?.characters || [])
 ]));
 if (allTags.length === 0) return null;
 return (
 <div>
 <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block text-center sm:text-left">Tags</span>
 <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
 {allTags.map(tag => (
 <button
 key={tag}
 onClick={() => handleTagClick(tag)}
 className="text-xs px-2 py-1 bg-[#1c1c24] border border-[#2a2a35] text-gray-400 hover:bg-accent-b/15 hover:text-[#ff7e40] hover:border-[#ff7e40]/35 transition-all cursor-pointer"
 >
 {tag}
 </button>
 ))}
 </div>
 </div>
 );
 })()}
 </div>
 </div>
 ) : (
 <p className="text-sm text-gray-400 leading-relaxed text-center sm:text-left">
 {selectedVideo.description}
 </p>
 )}
 </div>
 </div>

 <div className="w-full my-2">
    <AdNativeBanner />
  </div>
 
  <div className="w-full flex justify-center py-4 border-t border-[#2a2a35]/50 mt-4">
    <AdBanner300x250 />
  </div>

 {/* Up Next & Related Section */}
 {videoDetails && videoDetails.related_videos && videoDetails.related_videos.length > 0 && (
 <div className="mt-8 border-t border-[#2a2a35] pt-6 flex flex-col gap-8">
 {/* Up Next */}
 <div>
 <h4 className="font-bold text-lg mb-4 text-white">Up Next</h4>
 <div 
 onClick={() => openVideo(videoDetails.related_videos[0])}
 className="bg-[#16161a]/50 p-2 sm:p-3 border border-[#2a2a35] flex gap-4 cursor-pointer hover:bg-[#1c1c24] transition-colors group relative overflow-hidden"
 >
 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff2a5f] to-[#ff7e40] opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="w-32 sm:w-48 aspect-video overflow-hidden relative shrink-0">
 <img 
 src={`https://hentai.tv${videoDetails.related_videos[0].cover || videoDetails.related_videos[0].thumb}`} 
 className="w-full h-full object-cover transition-transform group-hover:scale-105"
 onError={(e) => { e.target.src = 'https://via.placeholder.com/300x169?text=No+Cover' }}
 />
 <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
 <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 drop-" fill="currentColor" />
 </div>
 </div>
 <div className="flex flex-col justify-center gap-1 sm:gap-2 py-1 pr-2">
 <h5 className="font-semibold text-sm sm:text-base text-white group-hover:text-[#ff7e40] transition-colors line-clamp-2 leading-snug">
 {videoDetails.related_videos[0].title}
 </h5>
 <span className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
 <Eye className="w-3.5 h-3.5" /> {videoDetails.related_videos[0].views?.toLocaleString()} views
 </span>
 </div>
 </div>
 </div>

 <div className="w-full flex justify-center py-4">
    <AdsterraSmartLinkBanner />
  </div>

 {/* Related List */}
 {videoDetails.related_videos.length > 1 && (
 <div>
 <h4 className="font-bold text-lg mb-4 text-white">Related</h4>
 <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
 {videoDetails.related_videos.slice(1).map(video => (
 <div 
 key={video.id} 
 onClick={() => openVideo(video)}
 className="flex gap-3 cursor-pointer group p-2 hover:bg-[#16161a] transition-colors"
 >
 <div className="w-28 sm:w-36 aspect-video overflow-hidden relative shrink-0 border border-[#2a2a35]/50 group-hover:border-[#2a2a35]">
 <img 
 src={`https://hentai.tv${video.cover || video.thumb}`} 
 className="w-full h-full object-cover"
 onError={(e) => { e.target.src = 'https://via.placeholder.com/300x169?text=No+Cover' }}
 />
 </div>
 <div className="flex flex-col gap-1 py-1">
 <h5 className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-[#ff7e40] transition-colors line-clamp-2 leading-tight">
 {video.title} {video.ep ? `· EP ${video.ep}` : ''}
 </h5>
 <span className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
 {video.views?.toLocaleString()} views
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </main>
 </div>
 );
}

export default NSFW;
