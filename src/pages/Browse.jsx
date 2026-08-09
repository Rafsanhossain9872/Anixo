import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getBrowseAnime } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Search, ChevronDown, Check, X, RefreshCw, Trash2, ArrowRight, AlertTriangle } from "lucide-react";
import { ALL_GENRES, OFFICIAL_GENRES, GENRE_MAP } from "../constants/genres";
import Pagination from "../components/common/Pagination";
import { AdsterraSmartLinkBanner } from "../components/common/AdsterraSmartLink";

export default function Browse() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const displayGenres = ALL_GENRES;

  // 1. Filter derivation from URL
  const filters = useMemo(() => {
    const genreStr = searchParams.get("genre") || "";
    const excludeStr = searchParams.get("exclude") || "";
    const formatParams = searchParams.getAll("format");

    const include = genreStr ? genreStr.split(",").filter(Boolean) : [];
    const exclude = excludeStr ? excludeStr.split(",").filter(Boolean) : [];

    return {
      search: searchParams.get("search") || "",
      include,
      exclude,
      genres: include,
      formats: formatParams,
      status: searchParams.get("status") || "",
      sort: searchParams.get("sort") || "START_DATE_DESC",
      year: searchParams.get("year") || "",
      season: searchParams.get("season") || "",
      country: searchParams.getAll("country"),
      rating: searchParams.get("rating") || "",
      language: searchParams.getAll("language"),
      excludeMyList: searchParams.get("onList") === "false",
      isAdult: searchParams.get("isAdult") === "true",
      page: parseInt(searchParams.get("page") || "1"),
    };
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [prevFiltersSearch, setPrevFiltersSearch] = useState(filters.search);

  // Sync search input if URL changes (e.g. back button), doing it during render to avoid cascading effects
  if (filters.search !== prevFiltersSearch) {
    setPrevFiltersSearch(filters.search);
    setSearchInput(filters.search);
  }
  const consecutiveEmptyPages = useRef(0);
  const isAutoPaging = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (!searchInput) next.delete("search");
        else next.set("search", searchInput);
        next.set("page", "1");
        return next;
      }, { replace: true });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setSearchParams]);

  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("page", newPage.toString());
      return next;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams]);
  const queryData = useMemo(() => {
    const vars = {
      page: filters.page,
      perPage: filters.search ? 50 : 30,
      sort: filters.search ? undefined : [filters.sort],
    };

    if (filters.search) vars.search = filters.search;
    if (filters.formats.length > 0) vars.format_in = filters.formats;

    if (filters.include.length > 0) {
      const gen_in = [];
      const t_in = [];
      filters.include.forEach(g => {
        const mapped = Object.prototype.hasOwnProperty.call(GENRE_MAP, g) ? GENRE_MAP[g] : g;
        if (OFFICIAL_GENRES.includes(mapped)) gen_in.push(mapped);
        else t_in.push(mapped);
      });
      if (gen_in.length > 0) vars.genre_in = gen_in;
      if (t_in.length > 0) vars.tag_in = t_in;
      vars.genres = filters.include; // Raw genres for MAL fetch
    }

    if (filters.status) vars.status = filters.status;
    if (filters.year) vars.seasonYear = parseInt(filters.year);
    if (filters.season) vars.season = filters.season;
    if (filters.country.length > 0) vars.country = filters.country[0];
    if (filters.rating) vars.averageScore_greater = parseInt(filters.rating);
    if (filters.language.length > 0) vars.language = filters.language;
    if (filters.isAdult) vars.isAdult = true;

    return { vars, lang: filters.language };
  }, [filters]);

  const { data: result = { media: [], pageInfo: { total: 0 } }, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["browse", queryData],
    queryFn: async ({ signal }) => {
      const { vars } = queryData;
      const res = await getBrowseAnime(vars, signal);
      return res;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const animeList = useMemo(() => {
    const rawList = result.media || [];

    return rawList.filter(anime => {
      const allLabels = [...(anime.genres || []), ...(anime.tags || []).map(t => t.name)];

      if (filters.exclude.some(ex => allLabels.includes(Object.prototype.hasOwnProperty.call(GENRE_MAP, ex) ? GENRE_MAP[ex] : ex) || allLabels.includes(ex))) return false;
      if (filters.include.length > 0) {
        if (!filters.include.some(inc => allLabels.includes(Object.prototype.hasOwnProperty.call(GENRE_MAP, inc) ? GENRE_MAP[inc] : inc) || allLabels.includes(inc))) return false;
      }
      if (filters.country.length > 0) {
        const origin = anime.countryOfOrigin || "";
        if (!filters.country.includes(origin)) return false;
      }
      return true;
    });
  }, [result.media, filters.include, filters.exclude, filters.country, filters.language]);

  const hasNextPage = result.pageInfo?.hasNextPage || false;

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (animeList.length > 0) {
      consecutiveEmptyPages.current = 0;
      isAutoPaging.current = false;
    } else if (hasNextPage) {
      if (consecutiveEmptyPages.current >= 3) {
        isAutoPaging.current = false;
        return;
      }
      consecutiveEmptyPages.current += 1;
      isAutoPaging.current = true;
      const jumpId = setTimeout(() => handlePageChange(filters.page + 1), 200);
      return () => clearTimeout(jumpId);
    }
  }, [animeList.length, isLoading, isFetching, hasNextPage, filters.page, handlePageChange]);

  const toggleGenre = (genre) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const include = next.get("genre")?.split(",").filter(Boolean) || [];
      const exclude = next.get("exclude")?.split(",").filter(Boolean) || [];
      if (include.includes(genre)) {
        const nextInclude = include.filter(g => g !== genre);
        if (nextInclude.length > 0) next.set("genre", nextInclude.join(",")); else next.delete("genre");
        next.set("exclude", [...exclude, genre].join(","));
      } else if (exclude.includes(genre)) {
        const nextExclude = exclude.filter(g => g !== genre);
        if (nextExclude.length > 0) next.set("exclude", nextExclude.join(",")); else next.delete("exclude");
      } else {
        next.set("genre", [...include, genre].join(","));
      }
      next.set("page", "1");
      return next;
    });
  };

  const toggleFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const urlKey = (key === "formats") ? "format" : key;
      const current = next.getAll(urlKey);
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      next.delete(urlKey);
      updated.forEach(v => next.append(urlKey, v));
      next.set("page", "1");
      return next;
    });
  };

  const setSingleFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key); else next.set(key, value);
      next.set("page", "1");
      return next;
    });
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    setIsResetting(true);
    setSearchParams(new URLSearchParams());
    setSearchInput("");
    setOpenDropdown(null);
    setTimeout(() => setIsResetting(false), 600);
  };

  const handleShuffleSort = () => {
    const sorts = ["TRENDING_DESC", "POPULARITY_DESC", "SCORE_DESC", "START_DATE_DESC"];
    const currentIdx = sorts.indexOf(filters.sort);
    const nextSort = sorts[(currentIdx + 1) % sorts.length];
    setSingleFilter("sort", nextSort);
  };

  return (
    <div className="min-h-screen text-white selection:bg-discord-500/30 font-sans bg-transparent">
      <Navbar />

      <main className="container max-w-[1720px] mx-auto px-2 md:px-4 pt-16 md:pt-20">

        {/* Page Head - Ultra Compact */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 font-senpai">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black tracking-tighter uppercase">{t('browse.title')}</h2>
          </div>
          <button 
            onClick={handleReset}
            className="text-[11px] uppercase tracking-widest font-bold text-textMuted hover:text-white transition-all flex items-center gap-2 group border border-border px-4 py-2 rounded"
          >
            <RefreshCw size={12} className={`transition-transform duration-500 ${isResetting ? 'rotate-[360deg]' : ''}`} />
            {t('browse.reset')}
          </button>
        </div>

        {/* Filters Interface */}
        <div className="mb-6">
          <div className="hidden md:flex flex-col gap-6 font-senpai">
            <div className="flex h-12 bg-surface border border-border rounded overflow-visible shadow-xl relative">
              <div className="flex-[2.5] relative flex items-center border-r border-border">
                <Search className="absolute left-4 w-4 h-4 text-textMuted" />
                <input
                  type="text"
                  placeholder={t('browse.placeholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-12 pr-12 text-[13px] text-white font-bold placeholder-textMuted outline-none uppercase tracking-wider"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput("")} className="absolute right-4 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded transition-colors">
                    <X size={12} className="text-textMuted" />
                  </button>
                )}
              </div>

              {[
                { label: t('browse.types'), key: "types", options: [{ label: t('browse.typesOptions.tv'), value: "TV" }, { label: t('browse.typesOptions.movie'), value: "MOVIE" }, { label: t('browse.typesOptions.ova'), value: "OVA" }, { label: t('browse.typesOptions.ona'), value: "ONA" }, { label: t('browse.typesOptions.special'), value: "SPECIAL" }] },
                { label: t('browse.genres'), key: "genre", options: displayGenres },
                { label: t('browse.status'), key: "status", options: [{ label: t('browse.statusOptions.any'), value: "" }, { label: t('browse.statusOptions.releasing'), value: "RELEASING" }, { label: t('browse.statusOptions.finished'), value: "FINISHED" }, { label: t('browse.statusOptions.upcoming'), value: "NOT_YET_RELEASED" }] },
                { label: t('browse.advanced'), key: "advanced", active: filters.year || filters.season || filters.rating }
              ].map(dd => (
                <div key={dd.key} className="flex-1 relative flex items-center border-r border-border group">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                    className={`w-full h-full flex items-center justify-between px-6 transition-all hover:bg-white/5 ${openDropdown === dd.key ? 'bg-white/10' : ''}`}
                  >
                    <span className={`text-[11px] uppercase tracking-widest font-bold transition-colors ${dd.active ? 'text-primary' : 'text-textMuted'}`}>
                      {dd.label}
                    </span>
                    <ChevronDown size={12} className={`text-textMuted transition-transform duration-300 ${openDropdown === dd.key ? 'rotate-180 text-primary' : ''}`} />
                  </button>

                  {openDropdown === dd.key && (
                    <>
                      <div className="fixed inset-0 z-90" onClick={() => setOpenDropdown(null)} />
                      <div className={`absolute top-[calc(100%+8px)] bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-100 ${dd.key === 'genre' ? 'w-[540px] max-w-[calc(100vw-32px)] left-1/2 -translate-x-1/2' :
                          dd.key === 'advanced' ? 'right-0' : 'w-40 left-0'
                        }`}>

                        {(dd.key === 'types' || dd.key === 'status') && (
                          <div className="flex flex-col gap-0.5">
                            {dd.options.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  if (dd.key === 'types') {
                                    toggleFilter('format', opt.value);
                                  } else {
                                    setSingleFilter('status', filters.status === opt.value ? '' : opt.value);
                                  }
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3 py-1.5 rounded text-left text-[11px] font-bold tracking-wider transition-all flex items-center justify-between group ${(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value)
                                  ? 'bg-primary/20 text-primary border border-primary/30'
                                  : 'text-textMuted hover:bg-white/5 hover:text-white border border-transparent'
                                  }`}
                              >
                                <span>{opt.label}</span>
                                {(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                              </button>
                            ))}
                          </div>
                        )}

                        {dd.key === 'genre' && (
                          <div className="space-y-3 p-1">
                            <div className="grid grid-cols-5 gap-1">
                              {dd.options.map(opt => {
                                const isIncluded = filters.include.includes(opt);
                                const isExcluded = filters.exclude.includes(opt);
                                return (
                                <button
                                  key={opt}
                                  onClick={() => toggleGenre(opt)}
                                  className={`px-2 py-1.5 rounded text-left text-[10px] transition-all flex items-center justify-between group ${
                                    isIncluded
                                      ? 'bg-discord-600/10 text-discord-500 font-medium border border-discord-500/20'
                                      : isExcluded
                                        ? 'bg-white/[0.02] text-white/25 font-medium border border-white/10'
                                        : 'text-white/30 border border-transparent hover:bg-white/3 hover:text-white/60'
                                    }`}
                                >
                                  <span className={`truncate ${isExcluded ? 'line-through decoration-discord-500/60' : ''}`}>{opt}</span>
                                  {isIncluded && <Check size={9} className="text-discord-500 shrink-0" />}
                                  {isExcluded && <X size={9} className="text-discord-500/60 shrink-0" />}
                                </button>
                                );
                              })}
                            </div>
                            <div className="pt-2 border-t border-white/15 flex items-center justify-end gap-2 text-[9px]">
                              <button onClick={handleReset} className="px-4 py-1.5 uppercase tracking-widest text-white/20 hover:text-white transition-colors">{t('browse.reset')}</button>
                              <button onClick={() => setOpenDropdown(null)} className="px-5 py-1.5 bg-white/5 border border-white/10 text-white uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all">{t('browse.close')}</button>
                            </div>
                          </div>
                        )}

                        {dd.key === 'advanced' && (
                          <div className="w-[320px] p-2 space-y-3">
                            <div className="flex gap-2">
                              {['season', 'year'].map(key => (
                                <div key={key} className="flex-1">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">{key}</label>
                                  <div className="relative">
                                    <select
                                      value={filters[key]}
                                      onChange={(e) => setSingleFilter(key, e.target.value)}
                                      className="w-full h-7 bg-white/3 border border-white/15 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/6 transition-all cursor-pointer appearance-none"
                                    >
                                      <option value="" className="bg-[#0d0d0d]">{key === 'season' ? t('browse.advancedOptions.season') : t('browse.advancedOptions.year')}</option>
                                      {key === 'season'
                                        ? ["WINTER", "SPRING", "SUMMER", "FALL"].map(s => <option key={s} value={s} className="bg-[#0d0d0d]">{s}</option>)
                                        : Array.from({ length: 45 }, (_, i) => 2026 - i).map(y => <option key={y} value={y} className="bg-[#0d0d0d]">{y}</option>)
                                      }
                                    </select>
                                    <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-1">
                              <div className="space-y-1.5">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">{t('browse.country')}</label>
                                <div className="space-y-1 px-0.5">
                                  {[{ label: t('browse.countryOptions.china'), v: "CN" }, { label: t('browse.countryOptions.japan'), v: "JP" }].map(c => (
                                    <button key={c.v} onClick={() => toggleFilter('country', c.v)} className="flex items-center gap-1.5 group w-full py-0.5">
                                      <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.country.includes(c.v) ? 'bg-discord-600 border-discord-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                        {filters.country.includes(c.v) && <Check size={7} strokeWidth={4} className="text-white" />}
                                      </div>
                                      <span className={`text-[10px] transition-colors ${filters.country.includes(c.v) ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>{c.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">{t('browse.language')}</label>
                                <div className="space-y-1 px-0.5">
                                  {[
                                    { label: t('browse.languageOptions.sub'), v: "SUB" },
                                    { label: t('browse.languageOptions.dub'), v: "DUB" }
                                  ].map(l => (
                                    <label key={l.v} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group transition-colors">
                                      <div
                                        onClick={() => toggleFilter('language', l.v)}
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${filters.language.includes(l.v) ? 'bg-discord-600 border-discord-600' : 'border-white/20 group-hover:border-white/40'
                                          }`}
                                      >
                                        {filters.language.includes(l.v) && <Check size={10} strokeWidth={3} />}
                                      </div>
                                      <span className={`text-[10px] font-medium transition-colors ${filters.language.includes(l.v) ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                                        }`}>
                                        {l.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                              <div className="flex gap-4">
                                <button
                                  onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")}
                                  className="flex items-center gap-1.5 group py-1"
                                >
                                  <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.excludeMyList ? 'bg-discord-600 border-discord-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                    {filters.excludeMyList && <Check size={7} strokeWidth={4} className="text-white" />}
                                  </div>
                                  <span className={`text-[10px] transition-colors ${filters.excludeMyList ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>{t('browse.excludeList')}</span>
                                </button>
                                <button
                                  onClick={() => setSingleFilter("isAdult", filters.isAdult ? "" : "true")}
                                  className="flex items-center gap-1.5 group py-1"
                                >
                                  <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.isAdult ? 'bg-[#ff3b3b] border-[#ff3b3b]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                    {filters.isAdult && <Check size={7} strokeWidth={4} className="text-white" />}
                                  </div>
                                  <span className={`text-[10px] font-bold tracking-widest transition-colors ${filters.isAdult ? 'text-[#ff3b3b]' : 'text-white/30 group-hover:text-white/50'}`}>18+</span>
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={handleReset} className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">{t('browse.reset')}</button>
                                <button onClick={() => setOpenDropdown(null)} className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all">{t('browse.close')}</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <button
                onClick={handleShuffleSort}
                className="w-14 h-full flex items-center justify-center transition-all hover:bg-white/5 text-textMuted hover:text-white border-r border-border"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={() => refetch()}
                className="px-8 bg-primary text-black flex items-center gap-3 rounded-r hover:bg-yellow-400 font-bold active:scale-95 transition-all overflow-hidden relative"
              >
                <span className="text-xs uppercase tracking-widest relative z-10">{t('browse.sync')}</span>
                <ArrowRight size={14} className="relative z-10" />
              </button>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            <div className="bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl p-3 space-y-3">
              <div className="relative h-10 flex items-center border border-white/15 rounded-lg">
                <Search className="absolute left-3 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder={t('browse.placeholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-10 pr-9 text-[12px] text-white font-medium placeholder-white/20 outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={12} className="text-white/40" />
                  </button>
                )}
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                {[
                  { label: t('browse.types'), key: "types", options: [{ label: t('browse.typesOptions.tv'), value: "TV" }, { label: t('browse.typesOptions.movie'), value: "MOVIE" }, { label: t('browse.typesOptions.ova'), value: "OVA" }, { label: t('browse.typesOptions.ona'), value: "ONA" }, { label: t('browse.typesOptions.special'), value: "SPECIAL" }] },
                  { label: t('browse.genres'), key: "genre", options: displayGenres },
                  { label: t('browse.status'), key: "status", options: [{ label: t('browse.statusOptions.any'), value: "" }, { label: t('browse.statusOptions.releasing'), value: "RELEASING" }, { label: t('browse.statusOptions.finished'), value: "FINISHED" }, { label: t('browse.statusOptions.upcoming'), value: "NOT_YET_RELEASED" }] },
                  { label: t('browse.advanced'), key: "advanced", active: filters.year || filters.season || filters.rating }
                ].map(dd => (
                  <div key={dd.key} className={`${dd.key === "genre" ? "static group" : "relative group"}`}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                      className={`w-full h-10 flex items-center justify-between px-4 rounded-lg border border-white/10 bg-black/20 transition-all hover:bg-white/3 ${openDropdown === dd.key ? "bg-white/6" : ""}`}
                    >
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-medium transition-colors ${dd.active ? "text-discord-500" : "text-white/50"}`}>
                        {dd.label}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-white/30 transition-transform duration-300 ${openDropdown === dd.key ? "rotate-180 text-discord-500" : ""}`}
                      />
                    </button>

                    {openDropdown === dd.key && (
                      <>
                        <div className="fixed inset-0 z-90" onClick={() => setOpenDropdown(null)} />
                        <div
                          className={`absolute top-full mt-2 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-100 ${dd.key === "genre"
                              ? "left-0 right-0 w-auto max-h-[70vh] overflow-y-auto"
                              : dd.key === "advanced"
                                ? "right-0 w-80"
                                : "left-0 w-40"
                            }`}
                        >
                          {(dd.key === "types" || dd.key === "status") && (
                            <div className="flex flex-col gap-0.5">
                              {dd.options.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    if (dd.key === "types") {
                                      toggleFilter("format", opt.value);
                                    } else {
                                      setSingleFilter("status", filters.status === opt.value ? "" : opt.value);
                                    }
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] transition-all flex items-center justify-between group ${dd.key === "types" ? (filters.formats.includes(opt.value) ? "bg-discord-600/10 text-discord-500 font-medium" : "text-white/40 hover:bg-white/3 hover:text-white")
                                      : filters.status === opt.value
                                        ? "bg-discord-600/10 text-discord-500 font-medium"
                                        : "text-white/40 hover:bg-white/3 hover:text-white"
                                    }`}
                                >
                                  <span>{opt.label}</span>
                                  {(dd.key === "types" ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                                </button>
                              ))}
                            </div>
                          )}

                          {dd.key === "genre" && (
                            <div className="space-y-3 p-1">
                              <div className="grid grid-cols-3 gap-1">
                                {dd.options.map(opt => {
                                  const isIncluded = filters.include.includes(opt);
                                  const isExcluded = filters.exclude.includes(opt);
                                  return (
                                  <button
                                    key={opt}
                                    onClick={() => toggleGenre(opt)}
                                    className={`px-2 py-1.5 rounded text-left text-[10px] uppercase font-bold tracking-wider transition-all flex items-center justify-between group ${
                                      isIncluded
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : isExcluded
                                          ? 'bg-white/5 text-white/30 border border-white/10'
                                          : 'text-textMuted border border-transparent hover:bg-white/5 hover:text-white'
                                      }`}
                                  >
                                    <span className={`truncate ${isExcluded ? 'line-through decoration-red-500/60' : ''}`}>{opt}</span>
                                    {isIncluded && <Check size={9} className="text-primary shrink-0" />}
                                    {isExcluded && <X size={9} className="text-red-500/60 shrink-0" />}
                                  </button>
                                  );
                                })}
                              </div>
                              <div className="pt-2 border-t border-border flex items-center justify-end gap-2 text-[9px] mt-2">
                                <button
                                  onClick={handleReset}
                                  className="px-4 py-1.5 uppercase tracking-widest text-textMuted hover:text-white transition-colors font-bold"
                                >
                                  {t('browse.reset')}
                                </button>
                                <button
                                  onClick={() => setOpenDropdown(null)}
                                  className="px-5 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 uppercase tracking-widest rounded transition-all font-bold"
                                >
                                  {t('browse.close')}
                                </button>
                              </div>
                            </div>
                          )}

                          {dd.key === "advanced" && (
                            <div className="w-[320px] max-w-[calc(100vw-32px)] p-2 space-y-3">
                              <div className="flex gap-2">
                                {["season", "year"].map(key => (
                                  <div key={key} className="flex-1">
                                    <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">
                                      {key}
                                    </label>
                                    <div className="relative">
                                      <select
                                        value={filters[key]}
                                        onChange={e => setSingleFilter(key, e.target.value)}
                                        className="w-full h-7 bg-white/3 border border-white/15 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/6 transition-all cursor-pointer appearance-none"
                                      >
                                        <option value="" className="bg-[#0d0d0d]">
                                          {key === "season" ? t('browse.advancedOptions.season') : t('browse.advancedOptions.year')}
                                        </option>
                                        {key === "season"
                                          ? ["WINTER", "SPRING", "SUMMER", "FALL"].map(s => (
                                            <option key={s} value={s} className="bg-[#0d0d0d]">
                                              {s}
                                            </option>
                                          ))
                                          : Array.from({ length: 45 }, (_, i) => 2026 - i).map(y => (
                                            <option key={y} value={y} className="bg-[#0d0d0d]">
                                              {y}
                                            </option>
                                          ))}
                                      </select>
                                      <ChevronDown
                                        size={8}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-2 gap-3 pb-1">
                                <div className="space-y-1.5">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">
                                    {t('browse.country')}
                                  </label>
                                  <div className="space-y-1 px-0.5">
                                    {[{ label: t('browse.countryOptions.china'), v: "CN" }, { label: t('browse.countryOptions.japan'), v: "JP" }].map(c => (
                                      <button
                                        key={c.v}
                                        onClick={() => toggleFilter("country", c.v)}
                                        className="flex items-center gap-1.5 group w-full py-0.5"
                                      >
                                        <div
                                          className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.country.includes(c.v)
                                              ? "bg-discord-600 border-discord-600"
                                              : "bg-white/5 border-white/10 group-hover:border-white/20"
                                            }`}
                                        >
                                          {filters.country.includes(c.v) && (
                                            <Check size={7} strokeWidth={4} className="text-white" />
                                          )}
                                        </div>
                                        <span
                                          className={`text-[10px] transition-colors ${filters.country.includes(c.v)
                                              ? "text-white/90"
                                              : "text-white/30 group-hover:text-white/50"
                                            }`}
                                        >
                                          {c.label}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">
                                    {t('browse.language')}
                                  </label>
                                  <div className="space-y-1 px-0.5">
                                    {[{ label: t('browse.languageOptions.sub'), v: "SUB" }, { label: t('browse.languageOptions.dub'), v: "DUB" }].map(l => (
                                      <label
                                        key={l.v}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group transition-colors"
                                      >
                                        <div
                                          onClick={() => toggleFilter("language", l.v)}
                                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${filters.language.includes(l.v)
                                              ? "bg-discord-600 border-discord-600"
                                              : "border-white/20 group-hover:border-white/40"
                                            }`}
                                        >
                                          {filters.language.includes(l.v) && <Check size={10} strokeWidth={3} />}
                                        </div>
                                        <span
                                          className={`text-[10px] font-medium transition-colors ${filters.language.includes(l.v)
                                              ? "text-white"
                                              : "text-white/40 group-hover:text-white/60"
                                            }`}
                                        >
                                          {l.label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                                <button
                                  onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")}
                                  className="flex items-center gap-1.5 group py-1"
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.excludeMyList ? "bg-discord-600 border-discord-600" : "bg-white/5 border-white/10 group-hover:border-white/20"
                                      }`}
                                  >
                                    {filters.excludeMyList && (
                                      <Check size={7} strokeWidth={4} className="text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] transition-colors ${filters.excludeMyList
                                        ? "text-white/90"
                                        : "text-white/30 group-hover:text-white/50"
                                      }`}
                                  >
                                    {t('browse.excludeList')}
                                  </span>
                                </button>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleReset}
                                    className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                                  >
                                    {t('browse.reset')}
                                  </button>
                                  <button
                                    onClick={() => setOpenDropdown(null)}
                                    className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all"
                                  >
                                    {t('browse.close')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShuffleSort}
                  className="flex-1 h-10 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => refetch()}
                  className="flex-2 h-10 bg-primary text-black flex items-center justify-center gap-3 rounded font-bold active:scale-95 transition-all overflow-hidden relative"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] relative z-10">{t('browse.sync')}</span>
                  <ArrowRight size={14} className="relative z-10" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(filters.include.length + filters.exclude.length + filters.formats.length + (filters.status ? 1 : 0) + (filters.year ? 1 : 0)) > 0 && (
              <>
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 text-white/40 hover:text-primary rounded-full text-[9px] font-bold uppercase tracking-widest transition-all mr-2">
                  <Trash2 size={10} /> {t('browse.reset')}
                </button>
                {filters.include.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full text-[9px] text-primary font-bold uppercase tracking-widest transition-all">
                    {g}
                    <X size={10} className="cursor-pointer text-primary/50 group-hover:text-primary" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.exclude.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-white/30 font-bold uppercase tracking-widest">
                    <span className="line-through">{g}</span>
                    <X size={10} className="cursor-pointer text-white/20 group-hover:text-white" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.formats.map(f => (
                  <div key={f} className="group flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 rounded-full text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                    {f}
                    <X size={10} className="cursor-pointer text-blue-500/50 group-hover:text-blue-500" onClick={() => toggleFilter('formats', f)} />
                  </div>
                ))}
                {filters.status && (
                  <div className="group flex items-center gap-2 px-3 py-1.5 bg-green-600/10 border border-green-600/30 rounded-full text-[9px] text-green-500 font-bold uppercase tracking-widest">
                    {filters.status.replace('_', ' ')}
                    <X size={10} className="cursor-pointer text-green-500/50 group-hover:text-green-500" onClick={() => setSingleFilter('status', '')} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="relative min-h-[500px]">
          {result.isJikanFallback && (
            <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                <AlertTriangle className="text-orange-500" size={20} />
              </div>
              <div>
                <h4 className="text-orange-500 font-bold text-[13px] uppercase tracking-wider mb-1">{t('browse.degraded')}</h4>
                <p className="text-orange-500/80 text-xs font-medium leading-relaxed">
                  {t('browse.degradedDesc')}
                </p>
              </div>
            </div>
          )}

          {(isLoading || (isFetching && animeList.length === 0)) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-8 opacity-40">
              {Array.from({ length: 32 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : animeList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-8">
              {animeList.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-48 text-center">
              <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mb-10 shadow-inner group">
                <Search size={32} className="text-white/10 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight mb-4">{t('browse.noResults')}</h3>
              <p className="text-white/40 max-w-sm text-sm mb-12 leading-relaxed font-medium">{t('browse.noResultsDesc')}</p>
              <button
                onClick={handleReset}
                className="px-12 py-4 bg-primary hover:bg-yellow-400 text-black text-[12px] font-bold uppercase tracking-[0.3em] rounded transition-all shadow-2xl active:scale-95"
              >
                {t('browse.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Persistent Pagination */}
        {(result.pageInfo?.lastPage > 1 || result.pageInfo?.hasNextPage) && (
          <div className={`mt-24 mb-10 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Pagination 
              currentPage={filters.page} 
              totalPages={result.pageInfo?.lastPage || (result.pageInfo?.hasNextPage ? filters.page + 1 : filters.page)} 
              onPageChange={handlePageChange} 
            />
          </div>
        )}
        </main>
      <AdsterraSmartLinkBanner />
      <Footer />
    </div>
  );
}
