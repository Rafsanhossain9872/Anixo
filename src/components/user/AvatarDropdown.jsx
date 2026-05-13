import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { User, Clock, Heart, Settings as SettingsIcon, LogOut } from "lucide-react";

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
        className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-red-600 text-white font-bold tracking-wider text-sm overflow-hidden hover:ring-2 hover:ring-white/20 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] ml-1 cursor-pointer"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          user.username ? user.username.charAt(0).toUpperCase() : "U"
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-[48px] right-0 bg-[#141414]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[240px] z-[200] animate-in fade-in slide-in-from-top-2 duration-200 border-t-[3px] border-red-600 rounded-b-xl"
        >
          <div className="p-4 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate">{user.displayName || user.username}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Verified User</p>
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-[13px] font-medium"
            >
              <Heart size={16} />
              <span>Bookmarks</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-[13px] font-medium"
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

          <div className="p-2 border-t border-white/5">
            <button
              onClick={() => {
                logoutAuth();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all text-[13px] font-bold"
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
