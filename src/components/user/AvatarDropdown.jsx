import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { User, Clock, Heart, Settings as SettingsIcon, LogOut, Eye, Shield, Crown, MessageSquare, Users, Flame, Globe } from "lucide-react";

export default function AvatarDropdown() {
  const { user, logoutAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#1a1a1a] text-white font-bold tracking-wider text-sm overflow-hidden border-[1.5px] border-white/20 hover:border-white/60 transition-all ml-1 cursor-pointer"
      >
        <img 
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username || 'U'}&background=random&color=fff`} 
          alt="Avatar" 
          className="w-full h-full object-cover" 
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-[48px] right-0 bg-[#1A1A1E] shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[240px] z-[200] animate-in fade-in slide-in-from-top-2 duration-200 border border-white/[0.05] rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-white/15">
            <p className="text-sm font-medium text-white truncate">{user.displayName || user.username}</p>
            {user.role === 'admin' ? (
              <p className="text-[10px] text-purple-500 font-bold flex items-center gap-1 uppercase tracking-widest mt-1">
                <Crown size={12} /> Admin
              </p>
            ) : user.role === 'moderator' ? (
              <p className="text-[10px] text-discord-500 font-bold flex items-center gap-1 uppercase tracking-widest mt-1">
                <Shield size={12} /> Moderator
              </p>
            ) : (
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Verified User</p>
            )}
          </div>

          <div className="p-2">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-[13px] font-medium"
            >
              <User size={16} />
              <span>Profile</span>
            </Link>
            <Link
              to="/watching"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-[13px] font-medium"
            >
              <Clock size={16} />
              <span>Continue Watching</span>
            </Link>
            <Link
              to="/watchlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 text-[13px] font-medium"
            >
              <Heart size={16} />
              <span>Bookmarks</span>
            </Link>
            
            <div className="h-[1px] bg-white/[0.05] my-1 mx-1" />
            
            <Link
              to="/community"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 text-[13px] font-medium"
            >
              <MessageSquare size={16} />
              <span>Community</span>
            </Link>
            <Link
              to="/watch2gether"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 text-[13px] font-medium"
            >
              <Users size={16} />
              <span>Watch Together</span>
            </Link>
            <Link
              to="/nsfw"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-[#ff2a5f] hover:bg-[#ff2a5f]/10 transition-colors duration-150 text-[13px] font-medium"
            >
              <Flame size={16} />
              <span>Hentai (18+)</span>
            </Link>
            
            <div className="h-[1px] bg-white/[0.05] my-1 mx-1" />
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors duration-150 text-[13px] font-medium"
            >
              <SettingsIcon size={16} />
              <div className="flex items-center gap-2">
                <span>Settings</span>
                <img
                  src="https://anilist.co/img/icons/icon.svg"
                  alt="AL"
                  className="w-3.5 h-3.5 opacity-90"
                />
              </div>
            </Link>
          </div>

          <div className="p-2 border-t border-white/[0.05]">
            <button
              onClick={() => {
                logoutAuth();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-discord-400 hover:text-white hover:bg-discord-600 transition-colors duration-150 text-[13px] font-bold"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
