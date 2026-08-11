import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ChevronRight, LayoutGrid, List, Download, Shuffle, MessageSquare } from "lucide-react";
import { ALL_GENRES } from "../../constants/genres";



export default function NavSidebar({ open, onClose, initialTab = "menu" }) {
 const [activeTab, setActiveTab] = useState(initialTab);
 const navigate = useNavigate();

 const [prevOpen, setPrevOpen] = useState(open);
 const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
 const panelRef = useRef(null);

 // Sync activeTab with initialTab when sidebar opens or external initialTab changes
 if (open !== prevOpen || initialTab !== prevInitialTab) {
 setPrevOpen(open);
 setPrevInitialTab(initialTab);
 if (open) {
 setActiveTab(initialTab);
 }
 }

 const displayGenres = ALL_GENRES;

 // Body Scroll Lock
 useEffect(() => {
 if (open) {
 document.body.style.overflow = "hidden";
 } else {
 document.body.style.overflow = "auto";
 }
 return () => {
 document.body.style.overflow = "auto";
 };
 }, [open]);

 // Close on outside click
 useEffect(() => {
 function handleClick(e) {
 if (panelRef.current && !panelRef.current.contains(e.target)) {
 onClose();
 }
 }
 if (open) {
 document.addEventListener("mousedown", handleClick);
 }
 return () => document.removeEventListener("mousedown", handleClick);
 }, [open, onClose]);

 const types = [
 { label: "Movies", value: "MOVIE" },
 { label: "TV Series", value: "TV" },
 { label: "OVAs", value: "OVA" },
 { label: "ONAs", value: "ONA" },
 { label: "Specials", value: "SPECIAL" },
 ];

 if (!open) return null;

 return (
 <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm">
 <div
 ref={panelRef}
 className="fixed left-0 top-0 h-full w-[280px] bg-[#0B0B0E] border-r border-white/[0.05] shadow-[20px_0_60px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-left duration-300"
 >
 {/* Header with Close */}
 <div className="px-4 py-3 flex items-center justify-between">
 <div className="flex items-center gap-0">
 <img src="/logo.png" alt="TenZora" className="h-[98px] object-contain -ml-2" />
 </div>
 <button onClick={onClose} className="text-white/15 hover:text-white/70 transition-colors p-1.5"><X size={18} /></button>
 </div>

 {/* Triple Tab Controls */}
 <div className="flex border-b border-white/[0.06] mx-4 mt-1">
 {[
 { id: "menu", label: "Menu", icon: List },
 { id: "genre", label: "Genre", icon: LayoutGrid }
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? "text-discord-400" : "text-white/30 hover:text-white/60"
 }`}
 >
 <tab.icon size={14} strokeWidth={activeTab === tab.id ? 3 : 2} />
 <span className={`text-[9px] font-medium uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>
 {tab.label}
 </span>
 {activeTab === tab.id && (
 <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-discord-500 " />
 )}
 </button>
 ))}
 </div>

 {/* Tab Content Area */}
 <div className="flex-1 overflow-y-auto overscroll-none mt-1 scrollbar-hide">

 {/* MENU TAB */}
 {activeTab === "menu" && (
 <div className="p-5 pb-20 space-y-8 animate-in fade-in duration-300">
 <section className="space-y-4">
 <h3 className="text-[8px] font-medium uppercase tracking-[0.3em] text-white/15 ml-0.5">Discovery</h3>
 <div className="flex flex-col gap-3">
 {types.map((type) => (
 <Link
 key={type.value}
 to={`/browse?format=${type.value}`}
 onClick={onClose}
 className="text-[16px] font-medium text-white/60 hover:text-discord-400 transition-all flex items-center justify-between group px-1"
 >
 <span>{type.label}</span>
 <ChevronRight size={14} className="text-white/[0.06] group-hover:text-discord-400 transition-colors" />
 </Link>
 ))}
 </div>
 </section>



 <section className="pt-5 border-t border-white/[0.06] space-y-4">
 <h3 className="text-[8px] font-medium uppercase tracking-[0.3em] text-white/15 ml-0.5">Quick Navigation</h3>
 <div className="flex flex-col gap-2.5">
 {[
 { label: "Home", path: "/home" },
 { label: "HENTAI (18+)", path: "/nsfw" },
 { label: "Live Chat", path: "/chat" },
 { label: "Watch Together", path: "/watch2gether" },
 { label: "Community", path: "/community" },
 ].map((link) => (
 <Link
 key={link.path}
 to={link.path}
 onClick={onClose}
 className="text-[13px] font-medium text-white/30 hover:text-white/80 transition-colors px-1"
 >
 {link.label}
 </Link>
 ))}

 {/* Random Anime */}
 <button
   onClick={async () => {
     try {
       const { getTrendingAnime } = await import('../../services/api');
       const { getWatchUrl } = await import('../../utils/url');
       const res = await getTrendingAnime(1);
       if (res?.media?.length) {
         const randomAnime = res.media[Math.floor(Math.random() * res.media.length)];
         navigate(getWatchUrl(randomAnime.id, randomAnime.title) + '?autoplay=1');
       }
     } catch (e) {
       console.error("Failed to fetch random anime", e);
     }
     onClose();
   }}
   className="text-[13px] font-medium text-white/30 hover:text-white/80 transition-colors px-1 flex items-center gap-2 text-left"
 >
   <Shuffle size={14} className="shrink-0" /> Random Anime
 </button>
 {/* AI Recommendation */}
 <button
   onClick={() => {
     window.dispatchEvent(new CustomEvent('open-ai-chat'));
     onClose();
   }}
   className="text-[13px] font-medium text-white/30 hover:text-white/80 transition-colors px-1 flex items-center gap-2 text-left"
 >
   <MessageSquare size={14} className="shrink-0" /> AI Recommendation
 </button>
 </div>
 </section>
 </div>
 )}

 {/* GENRE TAB */}
 {activeTab === "genre" && (
 <div className="p-5 pb-20 animate-in fade-in duration-300">
 <div className="grid grid-cols-2 gap-y-3 gap-x-2">
 {displayGenres.map((genre) => (
 <Link
 key={genre}
 to={`/browse?genre=${genre}`}
 onClick={onClose}
 className="flex items-center gap-2 text-white/35 hover:text-white/80 transition-all group py-0.5"
 >
 <div className="w-[3px] h-[3px] bg-discord-500 rounded-full shrink-0 transition-all" />
 <span className="text-[12px] font-medium leading-tight truncate">{genre}</span>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>


 </div>
 </div>
 );
}
