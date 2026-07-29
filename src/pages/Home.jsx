import { useState, useEffect } from "react";
import { Zap, X, ArrowRight, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getTrendingAnime,
  getPopularAnime,
  getNewReleases,
  getBrowseAnime,
  getJustCompletedAnime,
} from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/home/Hero";
import AnimeRow from "../components/home/AnimeRow";
import { useAuth } from "../hooks/useAuth";
import ShareBanner from "../components/common/ShareBanner";
import { AdNativeBanner } from "../components/common/AdBanner";
import { AdsterraSmartLinkBanner } from "../components/common/AdsterraSmartLink";
import Pagination from "../components/common/Pagination";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AlphabetNav from "../components/home/AlphabetNav";
import EstimatedSchedule from "../components/home/EstimatedSchedule";
import { removeProgress } from "../services/progressService";
import ProgressAnimeCard from "../components/common/ProgressAnimeCard";
import LiveComments from "../components/LiveComments";

export default function Home() {
  const { t } = useTranslation();
  const { globalProgress, setGlobalProgress, user } = useAuth();
  const [activeSeasonTab, setActiveSeasonTab] = useState("All");
  const cardsPerPage = 24; // Changed from 18 to 24 so it perfectly divides by 2, 3, 4, and 6 columns

  // Pagination States
  const [seasonPage, setSeasonPage] = useState(1);

  // Toggle Continue Watching with localStorage
  const [showContinueWatching, setShowContinueWatching] = useState(() => {
    const saved = localStorage.getItem('showContinueWatching');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Update localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('showContinueWatching', JSON.stringify(showContinueWatching));
  }, [showContinueWatching]);

  const toggleContinueWatching = () => {
    setShowContinueWatching(!showContinueWatching);
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
        // Use Trending Animes from AniList instead of seasonal data
        res = await getTrendingAnime(seasonPage);
      }

      if (seasonPage === 1 && activeSeasonTab === "All" && res?.media) {
        setCache("season", res);
      }
      return res;
    },
    staleTime: 1000 * 60 * 60,
  });
  const popularThisSeason = popularThisSeasonData?.media || [];
  const seasonInfo = popularThisSeasonData?.pageInfo || {};
  const seasonTotalPages = seasonInfo.lastPage || (seasonInfo.total ? Math.ceil(seasonInfo.total / cardsPerPage) : (seasonInfo.hasNextPage ? Math.max(seasonPage + 1, 5) : 1));

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

  const { data: justCompletedData = [], isLoading: loadingJustCompleted } = useQuery({
    queryKey: ["justCompleted"],
    queryFn: async () => {
      const res = await getJustCompletedAnime(1);
      if (res?.media) setCache("completed", res);
      return res;
    },
    placeholderData: getCached("completed"),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  const justCompleted = justCompletedData?.media || [];

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
    <div className="min-h-screen text-white overflow-x-hidden relative bg-transparent">
      <div className="relative z-10">
        <Navbar />
        <h1 className="sr-only">Watch Free Anime Online with Sub & Dub in HD - AniXo</h1>
      <Hero data={trendingData?.media} isLoading={loadingTrending} />

      <ShareBanner />

      {/* Continue Watching */}
      {globalProgress && globalProgress.length > 0 && (
        <div id="continue-watching" className="pt-8 md:pt-6">
          {showContinueWatching ? (
            <AnimeRow
              title={t('continueWatching.title').toUpperCase()}
              data={globalProgress.map(p => ({
                id: p.animeId,
                animeId: p.animeId,
                anilistId: p.anilistId,
                title: { english: p.title },
                coverImage: { large: p.coverImage },
                episode: p.episode,
                currentTime: p.currentTime,
                duration: p.duration,
                isProgress: true
              }))}
              isLoading={false}
              isScrollable={true}
              onRemove={user ? handleRemoveProgress : undefined}
              viewAllLink="/watching"
              CardComponent={ProgressAnimeCard}
              headerAction={
                <button
                  onClick={toggleContinueWatching}
                  className="p-1 hover:bg-white/10 rounded transition-all text-white/40 hover:text-white cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  title="Hide Section"
                >
                  <Eye size={15} />
                  <span className="hidden sm:inline">On</span>
                </button>
              }
            />
          ) : (
            <section className="mt-8 max-w-[1720px] mx-auto px-2 md:px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[3.5px] h-6 bg-white/20 rounded-full" />
                  <h2 className="text-xl md:text-2xl font-bold text-white/30 uppercase leading-none tracking-tighter">
                    {t('continueWatching.title').toUpperCase()}
                  </h2>
                  <button
                    onClick={toggleContinueWatching}
                    className="p-1 hover:bg-white/10 rounded transition-all text-white/35 hover:text-white cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                    title="Show Section"
                  >
                    <EyeOff size={15} />
                    <span className="hidden sm:inline">Off</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Live Comments */}
      <LiveComments />

      {/* Popular This Season */}
      <div id="popular-season" className="pt-8 md:pt-6">
        <AnimeRow
          title={t('home.popularThisSeason')}
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
          totalPages={seasonTotalPages}
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
          justCompleted={justCompleted}
          isLoading={loadingTrending || loadingPopular || loadingNew || loadingJustCompleted}
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
      <AdsterraSmartLinkBanner />
      <AdNativeBanner />
      <Footer />
      </div>


    </div>
  );
}
