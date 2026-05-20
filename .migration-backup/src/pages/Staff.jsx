import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStaffDetails } from "../services/api";
import { 
  ChevronLeft, 
  Heart, 
  Calendar, 
  MapPin, 
  User, 
  MessageSquare,
  Activity,
  Award
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";


export default function Staff() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffDetails(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Loading Profile</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-4xl font-black text-white/10 uppercase tracking-tighter">Voice Actor Not Found</h1>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          GO BACK
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white selection:bg-red-600/30">
      <Navbar />

      {/* Hero Section — Mobile-first responsive (Matching Character.jsx) */}
      <div className="relative min-h-[320px] sm:min-h-[400px] md:min-h-[450px] overflow-hidden">
        {/* Blurred Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-20"
          style={{ backgroundImage: `url(${staff.image?.large})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 h-full flex flex-col justify-end pt-20 pb-8 sm:pb-12">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group mb-6"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/5">
              <ChevronLeft size={18} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Return</span>
          </button>

          {/* Mobile: Stacked center layout | Desktop: Side-by-side */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-5 sm:gap-8">
            {/* Staff Image */}
            <div className="w-[140px] sm:w-[180px] md:w-[220px] shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl relative">
              <img 
                src={staff.image?.large} 
                alt={staff.name?.full} 
                className="w-full aspect-[2/3] object-cover"
              />
              <div className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg">
                <Heart size={14} fill="white" />
              </div>
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                <span className="px-2 py-0.5 bg-white/10 text-white/50 text-[9px] font-bold uppercase rounded tracking-widest">
                  Voice Actor Profile
                </span>
                {staff.languageV2 && (
                  <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-[9px] font-bold uppercase rounded tracking-widest">
                    {staff.languageV2}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase mb-1">
                {staff.name?.full}
              </h1>
              {staff.name?.native && (
                <p className="text-sm sm:text-lg font-bold text-white/30 mb-4 uppercase tracking-tighter">
                  {staff.name?.native}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-white/40">
                {staff.primaryOccupations?.[0] && <div><span className="text-white">{staff.primaryOccupations[0]}</span></div>}
                <div>Favourites: <span className="text-white">{staff.favourites?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 lg:gap-12">
          {/* Main Content Column */}
          <div className="space-y-10 lg:space-y-20">
            {/* Biography */}
            <section>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight">Biography</h2>
              </div>
              <div 
                className="prose prose-invert max-w-none text-white/60 leading-relaxed text-[13px] sm:text-[15px]"
                dangerouslySetInnerHTML={{ __html: staff.description || "No biography available for this voice actor." }}
              />
            </section>

            {/* Characters Voiced Section */}
            <section>
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                  <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight">Characters Voiced</h2>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/20 uppercase tracking-widest">{staff.characterMedia?.edges?.filter(e => e.node.type === "ANIME").length || 0} ROLES</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {staff.characterMedia?.edges?.map((edge, i) => {
                  if (edge.node.type !== "ANIME") return null;
                  const character = edge.characters?.[0];
                  if (!character) return null;

                  return (
                    <div 
                      key={i}
                      className="group flex bg-[#0d0d0d] border border-white/5 rounded-[4px] overflow-hidden hover:border-red-600/30 transition-all duration-300"
                    >
                      {/* Character Side */}
                      <Link to={`/character/${character.id}`} className="flex-1 flex items-center p-3 gap-4 hover:bg-white/[0.02]">
                        <img 
                          src={character.image?.large} 
                          className="w-16 h-20 object-cover rounded-[2px]"
                          alt={character.name?.full}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-white truncate group-hover:text-red-500 transition-colors uppercase leading-tight">
                            {character.name?.userPreferred}
                          </p>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                            {edge.characterRole}
                          </p>
                        </div>
                      </Link>

                      {/* Anime Side (Small Info) */}
                      <Link to={`/watch/${edge.node.id}`} className="w-[140px] border-l border-white/5 p-3 flex flex-col justify-center gap-1 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[10px] font-black text-white/40 truncate uppercase">
                          {edge.node.title?.romaji || edge.node.title?.english}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-red-500/80 uppercase">
                            {edge.node.format}
                          </span>
                          <span className="text-[9px] font-bold text-white/20 uppercase">
                            {edge.node.averageScore}%
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Details</h2>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: "Gender", value: staff.gender, icon: User },
                  { 
                    label: "Birthday", 
                    value: staff.dateOfBirth?.year ? `${staff.dateOfBirth.day}/${staff.dateOfBirth.month}/${staff.dateOfBirth.year}` : null, 
                    icon: Calendar 
                  },
                  { label: "Home Town", value: staff.homeTown, icon: MapPin },
                  { label: "Language", value: staff.languageV2, icon: MessageSquare },
                  { label: "Age", value: staff.age, icon: Activity },
                ].map((item, i) => item.value && (
                  <div key={i} className="flex flex-col gap-1.5 p-4 bg-white/[0.03] border border-white/5 rounded-[4px]">
                    <div className="flex items-center gap-2 text-white/20">
                      <item.icon size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    <p className="text-[14px] font-bold text-white/80">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Premium Stats or Something Extra */}
            <div className="p-8 bg-gradient-to-br from-red-600/20 to-transparent border border-red-600/10 rounded-[4px] relative overflow-hidden group">
              <div className="relative z-10">
                < Award className="text-red-500 mb-4" size={32} />
                <h3 className="text-[14px] font-black text-white uppercase tracking-widest mb-2">Professional Seiyuu</h3>
                <p className="text-[12px] text-white/40 font-medium leading-relaxed">
                  Highly acclaimed voice talent contributing to the anime industry's greatest masterpieces.
                </p>
              </div>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-all duration-1000" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
