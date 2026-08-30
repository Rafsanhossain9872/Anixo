import { useState, useEffect } from "react";
import { Eye, EyeOff, ChevronRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  getTrendingAnime,
  getPopularAnime,
  getNewReleases,
  getJustCompletedAnime,
  getUpcomingAnime,
} from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/home/Hero";
import EstimatedSchedule from "../components/home/EstimatedSchedule";
import GenreNav from "../components/home/GenreNav";
import AnimeRow from "../components/home/AnimeRow";
import { useAuth } from "../hooks/useAuth";
import ShareBanner from "../components/common/ShareBanner";
import W2GNoticeBanner from "../components/common/W2GNoticeBanner";
import { AdNativeBanner } from "../components/common/AdBanner";

import TopMovies from "../components/home/TopMovies";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AnimeCard from "../components/common/AnimeCard";
import HorizontalProgressCard from "../components/home/HorizontalProgressCard";
import SidebarListCard from "../components/home/SidebarListCard";
import { removeProgress } from "../services/progressService";
import LiveComments from "../components/LiveComments";

function SidebarList({ title, data, isLoading, tabs, activeTab, onTabChange }) {
  const getViewAllLink = () => {
    if (activeTab === "TOP AIRING") return "/browse?sort=TRENDING_DESC";
    if (activeTab === "UPCOMING") return "/browse?status=NOT_YET_RELEASED";
    return "/browse";
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        {tabs ? (
          <div className="flex gap-4">
            {tabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => onTabChange(tab)}
                className={`text-[16px] md:text-[18px] font-bold uppercase transition-colors ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="text-[18px] font-bold text-white uppercase">{title}</h2>
        )}
        <Link 
          to={getViewAllLink()} 
          className="bg-white/5 hover:bg-discord-600 border border-white/5 hover:border-discord-500 rounded p-1 text-white/50 hover:text-white transition-all group"
          title={`View all ${activeTab ? activeTab.toLowerCase() : title.toLowerCase()}`}
        >
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      {/* MOBILE: Horizontal Scroll */}
      <div className="md:hidden flex flex-nowrap overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3 pb-4 min-h-[100px]">
        {isLoading 
          ? Array.from({length: 5}).map((_,i) => <div key={i} className="w-[140px] shrink-0 snap-start bg-white/5 rounded-xl animate-pulse h-[200px]" />)
          : data?.slice(0, 10).map(anime => (
              <div key={anime.id} className="w-[140px] shrink-0 snap-start">
                <AnimeCard anime={anime} />
              </div>
            ))
        }
      </div>

      {/* DESKTOP: Vertical List */}
      <div className="hidden md:flex flex-col gap-2">
        {isLoading 
          ? Array.from({length: 5}).map((_,i) => <div key={i} className="h-[104px] bg-white/5 rounded-xl animate-pulse" />)
          : data?.slice(0, 10).map(anime => <SidebarListCard key={anime.id} anime={anime} />)
        }
      </div>
    </div>
  );
}

export default function Home() {
  const { globalProgress, setGlobalProgress, user } = useAuth();
  
  const [activeSidebarTab, setActiveSidebarTab] = useState("TOP AIRING");

  const [showContinueWatching, setShowContinueWatching] = useState(() => {
    const saved = localStorage.getItem('showContinueWatching');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('showContinueWatching', JSON.stringify(showContinueWatching));
  }, [showContinueWatching]);

  const toggleContinueWatching = () => {
    setShowContinueWatching(!showContinueWatching);
  };

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

  const { data: trendingData, isLoading: loadingTrending, isFetching: fetchingTrending } = useQuery({
    queryKey: ["trending", 1],
    queryFn: async ({ signal }) => {
      const res = await getTrendingAnime(1, signal);
      if (res?.media) setCache("trending", res);
      return res;
    },
    placeholderData: getCached("trending"),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: popularData, isLoading: loadingPopular, isFetching: fetchingPopular } = useQuery({
    queryKey: ["popular", 1],
    queryFn: async ({ signal }) => {
      const res = await getPopularAnime(1, signal);
      if (res?.media) setCache("popular", res);
      return res;
    },
    placeholderData: getCached("popular"),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 2,
  });

  const { data: newReleasesData, isLoading: loadingNew, isFetching: fetchingNew } = useQuery({
    queryKey: ["newReleases", 1],
    queryFn: async ({ signal }) => {
      const res = await getNewReleases(1, signal);
      if (res?.media) setCache("new", res);
      return res;
    },
    placeholderData: getCached("new"),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 2,
  });

  const { data: justCompletedData, isLoading: loadingJustCompleted } = useQuery({
    queryKey: ["justCompleted"],
    queryFn: async ({ signal }) => {
      const res = await getJustCompletedAnime(1, signal);
      if (res?.media) setCache("completed", res);
      return res;
    },
    placeholderData: getCached("completed"),
    staleTime: 1000 * 60 * 60,
  });

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["upcoming"],
    queryFn: async ({ signal }) => {
      const res = await getUpcomingAnime(1, signal);
      if (res?.media) setCache("upcoming", res);
      return res;
    },
    placeholderData: getCached("upcoming"),
    staleTime: 1000 * 60 * 30,
  });

  const handleRemoveProgress = async (animeId) => {
    setGlobalProgress(prev => prev.filter(p => p.animeId !== animeId));
    if (user) {
      try {
        await removeProgress(animeId);
      } catch (error) {
        console.error("Failed to remove progress:", error);
      }
    }
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative bg-[#0B0B0E]">
      <div className="relative z-10">
        <Navbar />
        <Hero data={trendingData?.media} isLoading={loadingTrending} />
        <GenreNav />

        <div className="max-w-[1720px] mx-auto px-4 mt-4 md:mt-8 flex flex-col xl:flex-row gap-4 md:gap-8 items-start">
          
          {/* ─── LEFT COLUMN (MAIN CONTENT) ─── */}
          <div className="w-full xl:w-[70%] flex flex-col gap-4 md:gap-8 min-w-0">
            
            {/* Announcement Banner */}
            {new Date() < new Date('2026-10-25') && (
              <div className="w-fit mx-auto flex items-center justify-center gap-2 py-2 px-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.15)] mb-2">
                <Info size={16} className="text-indigo-400 flex-shrink-0" />
                <span className="whitespace-normal md:whitespace-nowrap text-sm md:text-base font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent tracking-wide">
                  ⚠️ Missing new episodes? Please clear your Browser History & Cache (Site Data) to apply our latest fixes! We are currently working on a major upcoming update.
                </span>
              </div>
            )}

            {/* Watch History */}
            <div id="continue-watching" className="w-full">
                {showContinueWatching ? (
                  <AnimeRow
                    subtitle="Your Watchlist"
                    title="Watch History"
                    data={globalProgress?.map(p => ({
                      id: p.animeId,
                      animeId: p.animeId,
                      anilistId: p.anilistId,
                      title: { english: p.title },
                      coverImage: { large: p.coverImage },
                      bannerImage: p.bannerImage,
                      episode: p.episode,
                      currentTime: p.currentTime,
                      duration: p.duration,
                      isProgress: true
                    }))}
                    isLoading={false}
                    isScrollable={true}
                    onRemove={handleRemoveProgress}
                    CardComponent={HorizontalProgressCard}
                    headerAction={
                      <button
                        onClick={toggleContinueWatching}
                        className="p-1 hover:bg-white/10 rounded transition-all text-white/40 hover:text-white cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ml-4"
                        title="Hide Section"
                      >
                        <Eye size={15} />
                      </button>
                    }
                    emptyMessage="You haven't watched anything yet. Start exploring!"
                  />
                ) : (
                  <div className="flex items-center gap-3 py-4">
                    <p className="text-[13px] font-medium text-white/40">Your Watchlist</p>
                    <h2 className="text-xl md:text-[22px] font-bold text-white/30 leading-none tracking-tight text-center md:text-left">
                      Watch History
                    </h2>
                    <button
                      onClick={toggleContinueWatching}
                      className="p-1 hover:bg-white/10 rounded transition-all text-white/35 hover:text-white cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ml-4"
                      title="Show Section"
                    >
                      <EyeOff size={15} />
                    </button>
                  </div>
                )}
              </div>
            
            {/* Live Comments */}
            <div className="w-full mt-0 md:mt-4">
              <LiveComments />
            </div>

            <ShareBanner />
            <W2GNoticeBanner />

            {/* Main Anime Grids */}
            <div id="main-grid" className="w-full mt-4 flex flex-col gap-6 md:gap-12">
              <AnimeRow
                title="Newest"
                data={newReleasesData?.media || []}
                isLoading={loadingNew}
                isFetching={fetchingNew}
                limit={16}
                viewAllLink="/browse"
              />
              <AnimeRow
                title="Popular"
                data={trendingData?.media || []}
                isLoading={loadingTrending}
                isFetching={fetchingTrending}
                limit={16}
                viewAllLink="/browse?sort=TRENDING_DESC"
              />
              <AnimeRow
                title="Top Rated"
                data={popularData?.media || []}
                isLoading={loadingPopular}
                isFetching={fetchingPopular}
                limit={16}
                viewAllLink="/browse?sort=SCORE_DESC"
              />
            </div>

          </div>

          {/* ─── RIGHT COLUMN (SIDEBAR) ─── */}
          <div className="w-full xl:w-[30%] flex flex-col gap-10 shrink-0 min-w-0 overflow-hidden">
            <SidebarList 
              tabs={["TOP AIRING", "UPCOMING"]}
              activeTab={activeSidebarTab}
              onTabChange={setActiveSidebarTab}
              data={activeSidebarTab === "TOP AIRING" ? trendingData?.media : upcomingData?.media} 
              isLoading={activeSidebarTab === "TOP AIRING" ? loadingTrending : loadingUpcoming} 
            />

            <TopMovies />
          </div>

        </div>

        {/* ─── FULL-WIDTH SECTIONS (Outside the split layout) ─── */}
        <div className="max-w-[1720px] mx-auto px-4 mt-10 w-full">
          <ThreeColumnSection
            newReleases={newReleasesData?.media || []}
            justCompleted={justCompletedData?.media || []}
            isLoading={loadingNew || loadingJustCompleted}
          />
        </div>


        <AdNativeBanner />
        <div className="max-w-[1720px] mx-auto px-4 mt-10 w-full mb-10">
          <EstimatedSchedule />
        </div>
        <Footer />
      </div>
    </div>
  );
}
