import { useState, useEffect } from "react";
import { Zap, X, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getTrendingAnime,
  getPopularAnime,
  getNewReleases,
  getPopularThisSeason,
  getBrowseAnime,
} from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/home/Hero";
import AnimeRow from "../components/home/AnimeRow";
import { useAuth } from "../hooks/useAuth";
import ShareBanner from "../components/common/ShareBanner";
import Pagination from "../components/common/Pagination";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AlphabetNav from "../components/home/AlphabetNav";
import EstimatedSchedule from "../components/home/EstimatedSchedule";
import { removeProgress } from "../services/progressService";

export default function Home() {
  const { globalProgress, setGlobalProgress, user } = useAuth();
  const [activeSeasonTab, setActiveSeasonTab] = useState("All");
  const cardsPerPage = 36;

  // Pagination States
  const [seasonPage, setSeasonPage] = useState(1);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('announcement_sync_v1');
    if (!hasSeen) {
      const timer = setTimeout(() => setShowAnnouncement(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeAnnouncement = () => {
    localStorage.setItem('announcement_sync_v1', 'true');
    setShowAnnouncement(false);
  };

  // Helper to scroll to top of section when page changes
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: "smooth"
      });
    }
  };

  // --- FAST LOAD CACHING LOGIC ---
  const getCached = (key) => {
    try {
      const data = localStorage.getItem(`cache_home_${key}`);
      return data ? JSON.parse(data) : undefined;
    } catch { return undefined; }
  };
  const setCache = (key, data) => {
    try {
      localStorage.setItem(`cache_home_${key}`, JSON.stringify(data));
    } catch (e) { console.warn("Cache write failed:", e); }
  };


  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await getTrendingAnime(1);
      if (res?.media) setCache("trending", res);
      return res;
    },
    placeholderData: getCached("trending"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });
  const trending = trendingData?.media || [];

  const { data: popularData, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular"],
    queryFn: async () => {
      const res = await getPopularAnime(1);
      if (res?.media) setCache("popular", res);
      return res;
    },
    placeholderData: getCached("popular"),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  const popular = popularData?.media || [];

  const { data: popularThisSeasonData, isLoading: loadingSeason } = useQuery({
    queryKey: ["popularThisSeason", activeSeasonTab, seasonPage],
    queryFn: async () => {
      let res;
      if (activeSeasonTab === "China") {
        const chinaRes = await getBrowseAnime({
          page: seasonPage,
          perPage: cardsPerPage,
          country: "CN",
          sort: ["POPULARITY_DESC"],
        });
        res = {
          ...chinaRes,
          media: (chinaRes.media || []).filter((anime) => anime.countryOfOrigin === "CN"),
        };
      } else {
        res = await getPopularThisSeason(seasonPage);
      }

      if (seasonPage === 1 && activeSeasonTab === "All" && res?.media) {
        setCache("season", res);
      }
      return res;
    },
    placeholderData: (seasonPage === 1 && activeSeasonTab === "All") ? getCached("season") : undefined,
    staleTime: 1000 * 60 * 60,
  });
  const popularThisSeason = popularThisSeasonData?.media || [];
  const seasonInfo = popularThisSeasonData?.pageInfo || { lastPage: 1 };

  const { data: newReleasesData = [], isLoading: loadingNew } = useQuery({
    queryKey: ["newReleases"],
    queryFn: async () => {
      const res = await getNewReleases(1);
      if (res?.media) setCache("new", res);
      return res;
    },
    placeholderData: getCached("new"),
    staleTime: 1000 * 60 * 15, // 15 mins
  });
  const newReleases = newReleasesData?.media || [];


  const handleRemoveProgress = async (animeId) => {
    // Optimistic update
    setGlobalProgress(prev => prev.filter(p => p.animeId !== animeId));
    try {
      await removeProgress(animeId);
    } catch (error) {
      console.error("Failed to remove progress:", error);
    }
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative bg-[#050505]">
      {/* Optimized Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ willChange: 'transform' }}>
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-red-600/[0.08] blur-[100px] rounded-full animate-pulse" />
        <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] bg-red-600/[0.06] blur-[90px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] bg-red-600/[0.05] blur-[100px] rounded-full animate-pulse" />
        <div className="absolute top-[60%] left-[40%] w-[40%] h-[40%] bg-red-600/[0.04] blur-[80px] rounded-full" />
      </div>

      <div className="relative z-10">
        <Navbar />
      <Hero data={trendingData?.media} isLoading={loadingTrending} />

      <ShareBanner />

      {/* Continue Watching */}
      {user && globalProgress && globalProgress.length > 0 && (
        <div id="continue-watching" className="pt-8 md:pt-6">
          <AnimeRow
            title="CONTINUE WATCHING"
            data={globalProgress.map(p => ({
              id: p.animeId,
              title: { english: p.title },
              coverImage: { large: p.coverImage },
              episode: p.episode,
              currentTime: p.currentTime,
              duration: p.duration,
              isProgress: true
            }))}
            isLoading={false}
            isScrollable={true}
            onRemove={handleRemoveProgress}
            viewAllLink="/watching"
          />
        </div>
      )}

      {/* Popular This Season */}
      <div id="popular-season" className="pt-8 md:pt-6">
        <AnimeRow
          title="POPULAR THIS SEASON"
          data={popularThisSeason}
          isLoading={loadingSeason}
          limit={cardsPerPage}
          tabs={["All", "Sub", "China"]}
          activeTab={activeSeasonTab}
          onTabChange={(tab) => {
            setActiveSeasonTab(tab);
            setSeasonPage(1);
          }}
        />
        <Pagination
          currentPage={seasonPage}
          totalPages={seasonInfo.lastPage > 4 ? 4 : seasonInfo.lastPage}
          onPageChange={(p) => {
            setSeasonPage(p);
            scrollToSection("popular-season");
          }}
        />
      </div>



      {/* Three-column section */}
      <div className="py-12 lg:py-20">
        <ThreeColumnSection
          newReleases={newReleases}
          mostViewed={popular}
          justCompleted={trending}
          isLoading={loadingTrending || loadingPopular || loadingNew}
        />
      </div>

      {/* Airing Schedule Section */}
      <div className="py-12 lg:py-20 bg-white/[0.02]">
        <EstimatedSchedule />
      </div>

      {/* Alphabet navigation */}
      <div className="py-12 lg:py-20">
        <AlphabetNav />
      </div>
      <Footer />
      </div>

      {/* Feature Announcement Modal */}
      {showAnnouncement && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500"
            onClick={closeAnnouncement}
          />
          <div className="relative bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 max-w-[360px] w-full shadow-2xl text-center">
            {/* AniList Logo Icon */}
            <div className="w-16 h-16 bg-[#02A9FF]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#02A9FF]/20">
              <img 
                src="https://anilist.co/img/icons/icon.svg" 
                alt="AniList" 
                className="w-10 h-10" 
              />
            </div>

            <h2 className="text-xl font-bold text-white mb-3">Sync AniList Library</h2>
            <p className="text-white/40 text-[13px] mb-8 leading-relaxed">
              Import your watching progress and bookmarks directly from your AniList profile.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Link 
                to={!user ? "/home?login=true" : (user?.anilist?.username ? "/watching" : "/settings")} 
                onClick={closeAnnouncement}
                className="w-full bg-[#02A9FF] hover:bg-[#0095e0] text-white font-bold py-3.5 rounded-xl text-[12px] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {!user ? "Sign in to Sync" : (user?.anilist?.username ? "Go to Sync" : "Connect AniList")} <ArrowRight size={14} />
              </Link>
              <button 
                onClick={closeAnnouncement}
                className="w-full text-white/30 hover:text-white font-bold py-2 text-[11px] transition-all"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
