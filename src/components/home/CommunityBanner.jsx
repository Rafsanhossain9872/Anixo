import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, HelpCircle, ArrowRight, Sparkles, PenLine, TrendingUp, Heart } from "lucide-react";
import { backendApi } from "../../services/api";

const CommunityBanner = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const res = await backendApi.get("/users/9b9046b5");
        if (res.data?.success) {
          setCreator(res.data.profile);
        }
      } catch {
        // Silently fail — banner still works without creator info
      }
    };
    fetchCreator();
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const getCreatorAvatar = () => {
    if (creator?.avatar) return creator.avatar.replace(/[`"]/g, '').trim();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(creator?.displayName || creator?.username || 'Admin')}&background=5865F2&color=fff&size=80`;
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 mb-6">
      <div
        className="community-banner group relative overflow-hidden rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500"
        onMouseMove={handleMouseMove}
      >
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0f1a] via-[#12162b] to-[#0c0f1a]" />
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 opacity-60" style={{
          background: `radial-gradient(ellipse 600px 300px at ${mousePos.x}% ${mousePos.y}%, rgba(88,101,242,0.12), transparent)`
        }} />

        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl border border-[#5865F2]/20 group-hover:border-[#5865F2]/40 transition-all duration-500" />
        
        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-[#5865F2]/60 to-transparent" />

        {/* Floating particles */}
        <div className="absolute top-3 right-[15%] w-1 h-1 rounded-full bg-[#5865F2]/30 animate-pulse" />
        <div className="absolute bottom-4 right-[25%] w-1.5 h-1.5 rounded-full bg-purple-400/20 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-5 right-[35%] w-1 h-1 rounded-full bg-blue-400/25 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-3 left-[40%] w-1 h-1 rounded-full bg-[#5865F2]/20 animate-pulse" style={{ animationDelay: "1.5s" }} />

        {/* Main card link for accessibility and SEO */}
        <Link to="/community" className="absolute inset-0 z-10" aria-label="Explore community" />

        {/* Content wrapper */}
        <div className="relative z-20 w-full p-4 md:p-5 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
          
          {/* Left section */}
          <div className="flex items-center gap-4">
            {/* Animated icon container */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-xl bg-gradient-to-br from-[#5865F2]/20 to-purple-600/10 border border-[#5865F2]/20 flex items-center justify-center group-hover:scale-105 group-hover:border-[#5865F2]/40 transition-all duration-300">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-[#7c8af8]" />
              </div>
              {/* Live dot */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
            </div>

            {/* Text content */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-[16px] md:text-[19px] leading-tight tracking-tight">
                  TenZora Community
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#5865F2]/20 to-purple-500/15 border border-[#5865F2]/25 text-[#8b9df8] text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                  New
                </span>
              </div>
              <p className="text-white/35 text-[11px] md:text-[12.5px] mt-0.5 font-medium leading-snug max-w-[400px]">
                Post, discuss, ask questions & connect with fellow anime fans
              </p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Creator credit */}
            {creator && (
              <Link
                to={`/profile/${creator.profileId}`}
                className="pointer-events-auto flex items-center gap-0 md:gap-2 p-1 md:px-3 md:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] group-hover:bg-white/[0.05] group-hover:border-white/[0.1] transition-all duration-300 no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img src={getCreatorAvatar()} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-[8px] text-white/25 font-semibold uppercase tracking-widest leading-none">Created by</span>
                  <span className="text-[11px] text-white/60 font-bold leading-tight group-hover:text-white/80 transition-colors">{creator.displayName || creator.username}</span>
                </div>
              </Link>
            )}

            {/* Feature chips - desktop only */}
            <div className="hidden lg:flex items-center gap-1.5">
              {[
                { icon: PenLine, label: "Post" },
                { icon: HelpCircle, label: "Ask" },
                { icon: TrendingUp, label: "Trending" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/35 text-[10px] font-semibold tracking-wide group-hover:bg-white/[0.05] group-hover:text-white/50 group-hover:border-white/[0.1] transition-all duration-300"
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </span>
              ))}
            </div>

            {/* CTA Button */}
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-[#5865F2]/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#8b9df8] text-[11px] font-bold uppercase tracking-widest group-hover:bg-[#5865F2]/25 group-hover:text-[#a3b1ff] group-hover:border-[#5865F2]/50 transition-all duration-300">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .community-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(88,101,242,0.03), transparent);
          animation: shimmer 8s ease-in-out infinite;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes shimmer {
          0%, 100% { left: -50%; }
          50% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default CommunityBanner;
