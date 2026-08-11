import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, HelpCircle, ArrowRight, PenLine, TrendingUp } from "lucide-react";
import { backendApi } from "../../services/api";

const CommunityBanner = () => {
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const res = await backendApi.get("/users/9b9046b5");
        if (res.data?.success) {
          setCreator(res.data.profile);
        }
      } catch {
        // Banner still works without creator info.
      }
    };
    fetchCreator();
  }, []);

  const getCreatorAvatar = () => {
    if (creator?.avatar) return creator.avatar.replace(/[`"]/g, "").trim();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(creator?.displayName || creator?.username || "Admin")}&background=5865F2&color=fff&size=80`;
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 mb-6">
      <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#101114] flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300 hover:border-white/20">
        <Link to="/community" className="absolute inset-0 z-10" aria-label="Explore community" />

        <div className="relative z-20 w-full p-4 md:p-5 lg:px-6 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 md:w-[52px] md:h-[52px] rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:bg-white/[0.06] transition-colors duration-300">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-[#7c8af8]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-[16px] md:text-[19px] leading-tight tracking-tight">
                  AniXo Community
                </h3>
                <span className="px-2 py-0.5 rounded-[4px] bg-white/[0.04] border border-white/10 text-white/45 text-[10px] font-semibold">
                  Forum
                </span>
              </div>
              <p className="text-white/45 text-[12px] md:text-[13px] mt-1 font-medium leading-snug max-w-[460px]">
                Discuss episodes, ask questions, and share posts with other anime fans.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {creator && (
              <Link
                to={`/profile/${creator.profileId}`}
                className="pointer-events-auto flex items-center gap-0 md:gap-2 p-1 md:px-3 md:py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors duration-200 no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img src={getCreatorAvatar()} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-[9px] text-white/35 font-semibold leading-none">Built by</span>
                  <span className="text-[11px] text-white/65 font-bold leading-tight">{creator.displayName || creator.username}</span>
                </div>
              </Link>
            )}

            <div className="hidden lg:flex items-center gap-1.5">
              {[
                { icon: PenLine, label: "Post" },
                { icon: HelpCircle, label: "Ask" },
                { icon: TrendingUp, label: "Trending" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-white/45 text-[11px] font-semibold"
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </span>
              ))}
            </div>

            <div className="relative flex items-center gap-2 px-4 py-2 rounded-md bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#a3b1ff] text-[12px] font-semibold group-hover:bg-[#5865F2]/20 transition-colors duration-200">
              <span>Open community</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityBanner;
