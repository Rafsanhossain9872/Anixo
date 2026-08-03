import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, PlayCircle, Filter } from "lucide-react";
import Footer from "../components/layout/Footer";
import AlphabetNav from "../components/home/AlphabetNav";
import PortalSEO from "../components/home/PortalSEO";

export default function Portal() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Professional UX: Page Title and Scroll Reset
  useEffect(() => {
    document.title = t('portal.seoTitle');
    window.scrollTo(0, 0);
  }, [t]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const suggestions = [
    "One Piece",
    "Solo Leveling",
    "Bleach",
    "Naruto",
    "Jujutsu Kaisen",
    "Attack on Titan",
    "Demon Slayer"
  ];

  return (
    <div className="min-h-screen text-white font-sans selection:bg-discord-600/30">
      <main className="pt-6 md:pt-10 pb-6 md:pb-10 px-3 md:px-6 max-w-[1300px] mx-auto min-h-screen flex flex-col justify-start lg:justify-center">

        {/* Main Portal Container - Professional Chamfered Design */}
        <div
          className="relative p-[1px] bg-white/10 shadow-2xl transition-transform duration-500 ease-out"
          style={{
            clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
          }}
        >
          <div
            className="flex flex-col lg:flex-row gap-0 overflow-hidden bg-[#121212]"
            style={{
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
            }}
          >
            {/* Section: Interactive (First on Mobile) */}
            <div className="flex-1 p-5 md:p-10 md:pl-16 bg-black/40 backdrop-blur-md flex flex-col justify-center items-center lg:items-start border-b lg:border-b-0 lg:border-r border-white/15 relative overflow-hidden group">
              {/* Subtle top cut indicator */}
              <div className="absolute top-0 left-[20px] md:left-[40px] right-0 h-[2px] bg-gradient-to-r from-discord-600/30 to-transparent" />

              {/* Logo area */}
              <div className="mb-4 md:mb-8 flex items-center justify-center lg:justify-start gap-0">
                <img src="/logo.png" alt="TenZora" className="h-[144px] md:h-[168px] object-contain" />
              </div>

              <h1 className="text-xl md:text-[36px] font-bold text-white mb-4 md:mb-6 leading-[1.1] tracking-tight text-center lg:text-left">
                {t('portal.watchFree')} <br className="hidden md:block" />
                <span className="text-discord-600">{t('portal.anime')}</span> {t('portal.online')}
              </h1>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative w-full max-w-[480px] mb-4 md:mb-5 mx-auto lg:mx-0">
                <div className="flex items-center bg-[#1a1a1a] border border-white/10 rounded-[4px] p-1 md:p-1 focus-within:border-discord-600/5 transition-all shadow-inner">
                  <Search className="w-4 h-4 md:w-5 md:h-5 ml-2 md:ml-3 text-white/50" />
                  <input
                    type="text"
                    placeholder={t('portal.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none px-2 md:px-3 py-2 text-[14px] md:text-[15px] placeholder:text-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => navigate("/browse")}
                    className="bg-discord-600 hover:bg-discord-700 text-white px-3 md:px-5 py-1.5 md:py-1.5 rounded-[3px] text-[12px] md:text-[13px] font-bold flex items-center gap-2 transition-all active:scale-95"
                  >
                    <span className="hidden md:inline">{t('portal.filter')}</span>
                    <Filter size={14} className="stroke-[3]" />
                  </button>
                </div>
              </form>

              {/* Suggestions */}
              <div className="flex items-center gap-1.5 md:gap-3 mb-4 md:mb-8 w-full overflow-hidden">
                <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {suggestions.map(s => (
                    <Link
                      key={s}
                      to={`/browse?search=${s}`}
                      className="text-[9px] md:text-[11px] font-medium text-white/70 hover:text-discord-500 whitespace-nowrap bg-white/5 border border-white/15 px-2 md:px-2.5 py-0.5 md:py-1 rounded-[4px] transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Primary CTA - Professional Redesign */}
              <Link
                to="/home"
                className="group relative flex items-center justify-center gap-3 bg-discord-600 hover:bg-discord-700 text-white w-full lg:w-fit px-10 md:px-12 py-3 md:py-4 shadow-xl transition-all duration-300 active:scale-95 rounded-[4px] md:rounded-none"
                style={{
                  clipPath: window.innerWidth >= 768 ? 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' : 'none'
                }}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full">
                    <svg className="w-3 h-3 text-discord-600 fill-current translate-x-[1px]" viewBox="0 0 24 24">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                  </div>
                  <span className="text-[13px] md:text-[14px] font-bold uppercase tracking-[0.15em]">{t('portal.watchNow')}</span>
                </div>

                {/* Subtle Hover Overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>

            {/* Section: Content */}
            <div className="flex-1 p-5 md:p-10 md:pr-10 bg-[#141414] relative overflow-y-auto overflow-x-hidden mini-scrollbar max-h-[500px] lg:max-h-[600px]">
              {/* Subtle bottom cut indicator */}
              <div className="absolute bottom-0 left-0 right-[20px] md:right-[40px] h-[2px] bg-gradient-to-l from-discord-600/30 to-transparent" />

              <div className="relative z-10">
                <PortalSEO />
              </div>

              {/* Subtle background decoration */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-discord-600/[0.03] rounded-full blur-[80px]" />
            </div>
          </div>
        </div>

        {/* Alphabet navigation */}
        <div className="mt-6 md:mt-12 backdrop-blur-sm bg-white/[0.01] rounded-xl md:rounded-2xl border border-white/15 overflow-hidden py-3 md:py-4">
          <AlphabetNav />
        </div>
      </main>

      <Footer />
    </div>
  );
}
