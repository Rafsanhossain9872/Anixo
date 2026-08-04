import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import GenreNav from "../components/home/GenreNav";
import AnimeRow from "../components/home/AnimeRow";
import { useAuth } from "../hooks/useAuth";
import ShareBanner from "../components/common/ShareBanner";
import W2GNoticeBanner from "../components/common/W2GNoticeBanner";
import { AdNativeBanner } from "../components/common/AdBanner";
import { AdsterraSmartLinkBanner } from "../components/common/AdsterraSmartLink";
import EstimatedSchedule from "../components/home/EstimatedSchedule";
import TopMovies from "../components/home/TopMovies";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import HorizontalProgressCard from "../components/home/HorizontalProgressCard";
import SidebarListCard from "../components/home/SidebarListCard";
import { removeProgress } from "../services/progressService";
import Pagination from "../components/common/Pagination";
import LiveComments from "../components/LiveComments";

function SidebarList({ title, data, isLoading, tabs, activeTab, onTabChange }) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4">
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
      </div>
      <div className="flex flex-col gap-2">
        {isLoading 
          ? Array.from({length: 5}).map((_,i) => <div key={i} className="h-[104px] bg-white/5 rounded-xl animate-pulse" />)
          : data?.slice(0, 6).map(anime => <SidebarListCard key={anime.id} anime={anime} />)
        }
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { globalProgress, setGlobalProgress, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Main Grid Tabs (NEWEST, POPULAR, TOP RATED)
  const [activeMainTab, setActiveMainTab] = useState("NEWEST");
  const [mainGridPage, setMainGridPage] = useState(1);
  const cardsPerPage = 24;

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

  useEffect(() => {
    // Background Prefetching for the next page to ensure ZERO LATENCY
    if (activeMainTab === "NEWEST") {
      queryClient.prefetchQuery({
        queryKey: ["newReleases", mainGridPage + 1],
        queryFn: ({ signal }) => getNewReleases(mainGridPage + 1, signal),
      });
    } else if (activeMainTab === "POPULAR") {
      queryClient.prefetchQuery({
        queryKey: ["trending", mainGridPage + 1],
        queryFn: ({ signal }) => getTrendingAnime(mainGridPage + 1, signal),
      });
    } else if (activeMainTab === "TOP RATED") {
      queryClient.prefetchQuery({
        queryKey: ["popular", mainGridPage + 1],
        queryFn: ({ signal }) => getPopularAnime(mainGridPage + 1, signal),
      });
    }
  }, [mainGridPage, activeMainTab, queryClient]);

  const { data: trendingData, isLoading: loadingTrending, isFetching: fetchingTrending } = useQuery({
    queryKey: ["trending", mainGridPage],
    queryFn: async ({ signal }) => {
      const res = await getTrendingAnime(mainGridPage, signal);
      if (res?.media && mainGridPage === 1) setCache("trending", res);
      return res;
    },
    placeholderData: (prev) => prev !== undefined ? keepPreviousData(prev) : getCached("trending"),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 2, // 2 minutes (prevents RAM bloat if user hits page 800)
  });

  const { data: popularData, isLoading: loadingPopular, isFetching: fetchingPopular } = useQuery({
    queryKey: ["popular", mainGridPage],
    queryFn: async ({ signal }) => {
      const res = await getPopularAnime(mainGridPage, signal);
      if (res?.media && mainGridPage === 1) setCache("popular", res);
      return res;
    },
    placeholderData: (prev) => prev !== undefined ? keepPreviousData(prev) : getCached("popular"),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 2,
  });

  const { data: newReleasesData, isLoading: loadingNew, isFetching: fetchingNew } = useQuery({
    queryKey: ["newReleases", mainGridPage],
    queryFn: async ({ signal }) => {
      const res = await getNewReleases(mainGridPage, signal);
      if (res?.media && mainGridPage === 1) setCache("new", res);
      return res;
    },
    placeholderData: (prev) => prev !== undefined ? keepPreviousData(prev) : getCached("new"),
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
    try {
      await removeProgress(animeId);
    } catch (error) {
      console.error("Failed to remove progress:", error);
    }
  };

  // Determine which data to show in the main grid based on the active tab
  let mainGridData = [];
  let mainGridLoading = false;
  let mainGridFetching = false;
  let mainGridInfo = {};
  if (activeMainTab === "NEWEST") {
    mainGridData = newReleasesData?.media || [];
    mainGridInfo = newReleasesData?.pageInfo || {};
    mainGridLoading = loadingNew;
    mainGridFetching = fetchingNew;
  } else if (activeMainTab === "POPULAR") {
    mainGridData = trendingData?.media || [];
    mainGridInfo = trendingData?.pageInfo || {};
    mainGridLoading = loadingTrending;
    mainGridFetching = fetchingTrending;
  } else if (activeMainTab === "TOP RATED") {
    mainGridData = popularData?.media || [];
    mainGridInfo = popularData?.pageInfo || {};
    mainGridLoading = loadingPopular;
    mainGridFetching = fetchingPopular;
  }
  
  const mainGridTotalPages = mainGridInfo.lastPage || (mainGridInfo.total ? Math.ceil(mainGridInfo.total / cardsPerPage) : 1);

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative bg-[#0B0B0E]">
      <div className="relative z-10">
        <Navbar />
        <Hero data={trendingData?.media} isLoading={loadingTrending} />
        <GenreNav />

        <div className="max-w-[1720px] mx-auto px-4 mt-8 flex flex-col xl:flex-row gap-8 items-start">
          
          {/* ─── LEFT COLUMN (MAIN CONTENT) ─── */}
          <div className="w-full xl:w-[70%] flex flex-col gap-8 min-w-0">
            
            {/* Watch History */}
            {globalProgress && globalProgress.length > 0 && (
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
                    onRemove={user ? handleRemoveProgress : undefined}
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
            )}
            
            {/* Live Comments */}
            <div className="w-full mt-4">
              <LiveComments />
            </div>

            <ShareBanner />
            <W2GNoticeBanner />

            {/* Main Anime Grid */}
            <div id="main-grid" className="w-full mt-4">
              <AnimeRow
                title=""
                data={mainGridData}
                isLoading={mainGridLoading}
                isFetching={mainGridFetching}
                limit={cardsPerPage}
                tabs={["NEWEST", "POPULAR", "TOP RATED"]}
                activeTab={activeMainTab}
                onTabChange={(tab) => {
                  setActiveMainTab(tab);
                  setMainGridPage(1);
                }}
              />
              <div className="mt-8">
                <Pagination
                  currentPage={mainGridPage}
                  totalPages={mainGridTotalPages}
                  hasNextPage={!!mainGridInfo?.hasNextPage}
                  onPageChange={(p) => {
                    setMainGridPage(p);
                    const el = document.getElementById("main-grid");
                    if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
                  }}
                />
              </div>
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
            mostViewed={popularData?.media || []}
            justCompleted={justCompletedData?.media || []}
            isLoading={loadingNew || loadingPopular || loadingJustCompleted}
          />
        </div>

        <div className="max-w-[1720px] mx-auto px-4 mt-10 mb-20 w-full">
          <EstimatedSchedule />
        </div>

        <AdsterraSmartLinkBanner />
        <AdNativeBanner />
        <Footer />
      </div>
    </div>
  );
}
