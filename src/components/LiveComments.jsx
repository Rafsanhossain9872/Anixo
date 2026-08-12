import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { getAnimeDetails } from "../services/api";

const SOCKET_URL = import.meta.env.VITE_COMMENT_API_URL || "http://localhost:4000";

const LiveComments = () => {
  const [comments, setComments] = useState([]);
  const [animeTitles, setAnimeTitles] = useState({});

  useEffect(() => {
    const fetchedAnimeIds = new Set();

    const fetchAnimeTitles = (newComments) => {
      newComments.forEach(async (comment) => {
        if (!comment.animeId || fetchedAnimeIds.has(comment.animeId)) return;
        fetchedAnimeIds.add(comment.animeId);
        try {
          const details = await getAnimeDetails(comment.animeId);
          setAnimeTitles((prev) => ({
            ...prev,
            [comment.animeId]: details?.title?.english || details?.title?.romaji || details?.title?.native || `Anime ${comment.animeId}`
          }));
        } catch {
          fetchedAnimeIds.delete(comment.animeId);
        }
      });
    };

    const socket = io(SOCKET_URL);

    socket.on("global_new_comment", (comment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === comment._id)) return prev;
        const newComments = [comment, ...prev];
        fetchAnimeTitles([comment]);
        return newComments.slice(0, 30);
      });
    });

    const fetchRecentComments = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/recent-comments?limit=15`);
        const data = await res.json();
        setComments(data || []);
        fetchAnimeTitles(data || []);
      } catch {
        // Silent fail
      }
    };

    fetchRecentComments();

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diff = Math.floor((now - commentDate) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getAvatarUrl = (avatar, username) => {
    if (!avatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=random&color=fff`;
    }
    return avatar.replace(/[`"]/g, '').trim();
  };

  return (
    <section className="mt-2 md:mt-8 max-w-[1720px] mx-auto px-2 md:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 md:mb-6">
        {/* Vertical Accent Bar */}
        <div className="w-[3.5px] h-6 bg-discord-600 rounded-full" />
        <h2 className="text-xl md:text-2xl font-bold text-white uppercase leading-none tracking-tighter">
          Live Comments
        </h2>
      </div>

      {/* Scrollable Section with Image */}
      <div className="flex items-start gap-6">
        {/* Anime Girl Image - Left */}
        <div className="hidden md:block shrink-0">
          <img 
            src="/konosuba.png" 
            alt="Konosuba"
            className="w-40 h-auto"
          />
        </div>
        
        {/* Scrollable Comments Container - The key fix: min-w-0 */}
        <div className="flex-1 min-w-0">
          <div
            className="flex flex-nowrap overflow-x-auto scrollbar-hide pb-4 gap-4 min-h-[100px]"
          >
            {comments.length === 0 ? (
              <div className="w-full text-center py-16 text-white/10 text-sm font-medium uppercase tracking-widest">
                Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => (
                <Link
                  key={comment._id}
                  to={`/watch/${comment.animeId}?ep=${comment.episodeNumber}#comment-${comment._id}`}
                  className="shrink-0 w-[160px] md:w-[200px] bg-[#121212] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-yellow-500 bg-neutral-800 shrink-0">
                      <img 
                        src={getAvatarUrl(comment.user?.avatar, comment.user?.username)} 
                        alt={comment.user?.username} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">
                        {comment.user?.displayName || comment.user?.profileId || comment.user?.username}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                        <Clock size={10} />
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Anime Info */}
                  <p className="text-[11px] text-discord-400 mb-2 truncate font-medium">
                    {animeTitles[comment.animeId] ? `${animeTitles[comment.animeId]} • ` : ''}Ep {comment.episodeNumber}
                  </p>

                  {/* Comment Text */}
                  <p className="text-white/70 text-sm line-clamp-3 leading-snug">
                    {comment.content?.replace(/\|\|/g, '') || ''}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveComments;
