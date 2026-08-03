import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { User, Users, Crown, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const OnlineUsers = () => {
  const [onlineStats, setOnlineStats] = useState({ total: 0, registered: 0, guests: 0, users: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const socketRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const scrollY = window.scrollY;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.position = 'fixed';
      document.body.style.left = '0';
      document.body.style.right = '0';
    }
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      
      if (isModalOpen) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isModalOpen]);

  useEffect(() => {
    // Connect to online server
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const socketUrl = isLocal 
      ? "http://localhost:7861" 
      : (import.meta.env.VITE_ONLINE_SERVER_URL || window.location.origin);
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Identify user type on connect
      const isRegistered = !!user;
      const isAdmin = !!user && (user.role === 'admin');
      socket.emit('identify-user', {
        token: localStorage.getItem('token'),
        isRegistered,
        isAdmin,
        username: user?.username || '',
        displayName: user?.displayName || user?.username || '',
        avatar: user?.avatar || '',
        profileId: user?.profileId || ''
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('online-count', (stats) => {
      setOnlineStats(stats);
    });

    socket.on('user-updated', (updatedUser) => {
      setOnlineStats(prevStats => {
        const updatedUsers = prevStats.users.map(user => {
          if (user.username === updatedUser.username) {
            return {
              ...user,
              displayName: updatedUser.displayName || user.displayName,
              avatar: updatedUser.avatar || user.avatar,
              profileId: updatedUser.profileId || user.profileId
            };
          }
          return user;
        });
        return {
          ...prevStats,
          users: updatedUsers
        };
      });
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Update user type when auth status changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      const isRegistered = !!user;
      const isAdmin = !!user && (user.role === 'admin');
      socketRef.current.emit('identify-user', {
        token: localStorage.getItem('token'),
        isRegistered,
        isAdmin,
        username: user?.username || '',
        displayName: user?.displayName || user?.username || '',
        avatar: user?.avatar || '',
        profileId: user?.profileId || ''
      });
    }
  }, [user]);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        <Users size={14} className="text-white/70" />
        <span className="text-xs font-medium text-white/90">
          {onlineStats.total} Online
        </span>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <User size={9} className="text-discord-400" />
            <span className="text-white/70">{onlineStats.registered}</span>
          </div>
          <span className="text-white/30">|</span>
          <div className="flex items-center gap-1">
            <User size={9} className="text-white/50" />
            <span className="text-white/50">{onlineStats.guests}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative overscroll-behavior-contain">
            {/* Close button */}
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-3 right-3 text-white/50 hover:text-white transition"
            >
              <X size={18} />
            </button>
            
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-discord-500" />
              Online Users
            </h2>

            <div className="space-y-2">
              {/* Count cards - compact */}
              <div className="flex items-center justify-between p-2.5 bg-[#0a0a0a] rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-green-400" />
                  <span className="text-xs text-white/70">Total</span>
                </div>
                <span className="text-lg font-bold text-white">{onlineStats.total}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0a0a0a] rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-discord-400" />
                  <span className="text-xs text-white/70">Registered</span>
                </div>
                <span className="text-lg font-bold text-white">{onlineStats.registered}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0a0a0a] rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-white/50" />
                  <span className="text-xs text-white/70">Guests</span>
                </div>
                <span className="text-lg font-bold text-white">{onlineStats.guests}</span>
              </div>

              {/* Registered Users Online (visible to everyone) */}
              {onlineStats.users?.length > 0 ? (
                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-medium text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Registered Users Online ({onlineStats.users.length})
                  </h3>
                  {/* 1 column on mobile, 2 on desktop */}
                  <div className="max-h-[50vh] overflow-y-auto space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                    {onlineStats.users.map((onlineUser, index) => (
                      <Link
                        key={index}
                        to={`/user/${onlineUser.profileId || onlineUser.username}`}
                        onClick={() => setIsModalOpen(false)}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] transition-all hover:bg-[#151515] hover:border-white/20 cursor-pointer"
                      >
                        {/* Compact avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2a2a2a] flex-shrink-0">
                          {onlineUser.avatar ? (
                            <img
                              src={onlineUser.avatar}
                              alt={onlineUser.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/60 font-bold text-sm">
                              {(onlineUser.displayName || onlineUser.username)[0].toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-xs font-medium text-white truncate">
                              {onlineUser.displayName || onlineUser.username}
                            </h3>
                            {onlineUser.isAdmin && (
                              <div className="flex items-center gap-0.5 text-purple-500">
                                <Crown size={8} />
                                <span className="text-[8px] uppercase font-bold">Admin</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-white/40 truncate">
                            @{(onlineUser.displayName && onlineUser.displayName !== onlineUser.username) 
                              ? onlineUser.profileId 
                              : onlineUser.username}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] text-white/40 hidden sm:inline">Online</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center py-8">
                  <p className="text-white/40 text-xs">No registered users online right now</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OnlineUsers;
