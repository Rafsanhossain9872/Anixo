import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { markAsRead } from "../../services/notificationService";
import { Bell, Calendar, Info, AlertCircle, ExternalLink } from "lucide-react";

export default function NotificationDropdown({ isOpen, onClose }) {
  const { globalNotifications, setGlobalNotifications } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  if (!isOpen) return null;


  return (
    <div 
      ref={dropdownRef}
      className="absolute top-[48px] right-0 bg-[#141414]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[320px] z-[200] animate-in fade-in slide-in-from-top-2 duration-200 border-t-[3px] border-red-600 rounded-b-xl overflow-hidden"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-tight">Notifications</h3>
        <Link to="/notifications" onClick={onClose} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">View All</Link>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {globalNotifications.length > 0 ? (
          <div className="flex flex-col">
            {globalNotifications.slice(0, 5).map((notif) => (
              <div 
                key={notif._id}
                className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all flex gap-3 relative ${!notif.isRead ? 'bg-white/[0.02]' : 'opacity-60'}`}
              >
                {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}
                
                <div className="shrink-0 mt-1">
                  {notif.type === 'NEW_EPISODE' ? (
                    <Calendar size={14} className="text-red-500" />
                  ) : notif.type === 'WATCHLIST_UPDATE' ? (
                    <Info size={14} className="text-blue-500" />
                  ) : (
                    <AlertCircle size={14} className="text-yellow-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[12px] leading-snug mb-1 line-clamp-2 ${!notif.isRead ? 'font-bold text-white' : 'text-white/60'}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <button onClick={() => handleMarkRead(notif._id)} className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 line-clamp-1 mb-2">{notif.message}</p>
                  
                  {notif.animeId && (
                    <Link 
                      to={`/watch/${notif.animeId}`} 
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                    >
                      Watch Now <ExternalLink size={10} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <Bell size={24} className="text-white/10 mb-3" />
            <p className="text-xs text-white/20 font-medium">All caught up!</p>
          </div>
        )}
      </div>

      {globalNotifications.length > 5 && (
        <Link 
          to="/notifications" 
          onClick={onClose}
          className="block p-3 text-center text-[11px] font-bold text-white/40 hover:text-white bg-white/5 transition-all"
        >
          Show more
        </Link>
      )}
    </div>
  );
}
