import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { PYTHON_API } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
  MessageSquare, Star, Quote, Eye, EyeOff,
  ThumbsUp, ThumbsDown, Reply, MoreHorizontal, ChevronDown
} from "lucide-react";

// --- CUSTOM ANIWATCH-STYLE COMMENT COMPONENT ---
export default function CustomCommentSection({ animeId, episode, animeTitle, relations = [], recommendations = [] }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState("newest"); // "best" | "newest" | "oldest"
    const [commentText, setCommentText] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const textareaRef = useRef(null);
    const API_BASE = `${PYTHON_API}/api`;

    // Sorting Logic
    const sortedComments = [...comments].sort((a, b) => {
        if (sortBy === "best") {
            return (b.likes || 0) - (a.likes || 0);
        } else if (sortBy === "oldest") {
            return new Date(a.time) - new Date(b.time);
        } else {
            return new Date(b.time) - new Date(a.time); // newest
        }
    });

    const SidebarCard = ({ anime }) => (
        <Link to={`/watch/${anime.id}`} className="flex gap-3 p-2 rounded-[4px] hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5 mb-3">
            <div className="w-16 h-20 shrink-0 rounded-[2px] overflow-hidden border border-white/10 bg-white/5">
                <img
                    src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt=""
                />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-[13px] font-medium text-white/90 line-clamp-1 mb-1 group-hover:text-red-500 transition-colors">
                    {anime.title?.userPreferred || anime.title?.english || anime.title?.romaji}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-white/30 font-normal uppercase tracking-wider">
                    <span>{anime.format || "TV"}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1">
                        <Star size={10} className="text-yellow-500" fill="currentColor" />
                        {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "?"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{anime.seasonYear || anime.startDate?.year || "?"}</span>
                </div>
            </div>
        </Link>
    );

    const insertFormatting = (type) => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = commentText;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        let cursorOffset = 0;

        if (type === 'bold') {
            newText = `${before}**${selection}**${after}`;
            cursorOffset = 2;
        } else if (type === 'quote') {
            newText = `${before}> ${selection}${after}`;
            cursorOffset = 2;
        } else if (type === 'spoiler') {
            newText = `${before}||${selection}||${after}`;
            cursorOffset = 2;
        }

        setCommentText(newText);

        setTimeout(() => {
            el.focus();
            const newPos = selection ? start + selection.length + (cursorOffset * 2) : start + cursorOffset;
            el.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Interactive Spoiler Component
    const CommentBody = ({ content }) => {
        if (!content) return null;

        // Split text into parts (Bold, Spoiler, Quote)
        const parts = content.split(/(\*\*.*?\*\*|\|\|.*?\|\||^> .*?$)/gm);

        return (
            <div className="text-[14px] text-white/80 leading-relaxed mb-4 font-medium">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('||') && part.endsWith('||')) {
                        return (
                            <span
                                key={i}
                                onClick={(e) => e.currentTarget.classList.toggle('reveal-spoiler')}
                                className="bg-white/10 text-transparent hover:bg-white/20 transition-all px-1.5 py-0.5 rounded cursor-pointer select-none reveal-on-click mx-0.5 inline-block"
                            >
                                {part.slice(2, -2)}
                            </span>
                        );
                    }
                    if (part.startsWith('> ')) {
                        return (
                            <div key={i} className="text-[13px] text-white/40 italic font-medium py-1 flex gap-1">
                                <span className="text-white/10">“</span>
                                <span>{part.slice(2)}</span>
                                <span className="text-white/10">”</span>
                            </div>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    };

    // Helper to format text for Preview ONLY (Raw HTML)
    const formatPreview = (text) => {
        if (!text) return "";
        return text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/^> (.*?)$/gm, "<blockquote class='border-l-2 border-red-600/50 pl-3 my-2 text-white/40 italic'>$1</blockquote>")
            .replace(/\|\|(.*?)\|\|/g, "<span class='bg-white/10 text-white/40 px-1 rounded'>$1</span>");
    };

    // Helper to calculate relative time (Real Time)
    const getRelativeTime = (timestamp) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const past = new Date(timestamp);

        // Check if date is valid
        if (isNaN(past.getTime())) return "Just now";

        const diffInMs = now - past;
        const diffInSecs = Math.floor(diffInMs / 1000);
        const diffInMins = Math.floor(diffInSecs / 60);
        const diffInHours = Math.floor(diffInMins / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSecs < 60) return "Just now";
        if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
        if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;

        // For older than a week, show the date
        return past.toLocaleDateString();
    };

    // 1. Fetch comments on load or episode change
    useEffect(() => {
        const fetchComments = async () => {
            try {
                setIsLoading(true);
                const resp = await axios.get(`${API_BASE}/comments?animeId=${animeId}&episode=${episode}`);
                setComments(resp.data);
            } catch (err) {
                console.error("Failed to fetch comments", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchComments();
    }, [animeId, episode, API_BASE]);

    const hasScrolledRef = useRef(false);

    // 2. Scroll to specific comment if ID is in URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('commentId');

        if (targetId && comments.length > 0 && !hasScrolledRef.current) {
            // Check if target comment exists in the current list
            const commentExists = comments.some(c => String(c.id) === String(targetId));
            if (!commentExists) return;

            setTimeout(() => {
                const element = document.getElementById(`comment-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-comment');
                    hasScrolledRef.current = true; // Mark as done

                    setTimeout(() => {
                        element.classList.remove('highlight-comment');
                    }, 10000);
                }
            }, 1500);
        }
    }, [comments]);

    // Sub-component for individual Comment Item
    const CommentItem = ({ comment }) => {
        const [showMore, setShowMore] = useState(false);
        const [localLikes, setLocalLikes] = useState(comment.likes || 0);
        const [localDislikes, setLocalDislikes] = useState(comment.dislikes || 0);
        const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(user?.username) || false);
        const [isDisliked, setIsDisliked] = useState(comment.dislikedBy?.includes(user?.username) || false);

        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(comment.content);
        const [isUpdating, setIsUpdating] = useState(false);
        const [isDeleted, setIsDeleted] = useState(comment.isDeleted || false);

        const handleInteraction = async (action) => {
            if (!user) {
                alert("Please login to interact with comments");
                return;
            }
            try {
                const resp = await axios.post(`${API_BASE}/comments/vote`, {
                    animeId, episode, commentId: comment.id, action, username: user.username
                });
                if (resp.data.success) {
                    setLocalLikes(resp.data.likes);
                    setLocalDislikes(resp.data.dislikes);
                    if (action === 'like') { setIsLiked(!isLiked); setIsDisliked(false); }
                    else if (action === 'dislike') { setIsDisliked(!isDisliked); setIsLiked(false); }
                }
            } catch (err) { console.error("Voting failed", err); }
        };

        const handleMoreAction = async (type) => {
            setShowMore(false);
            if (type === 'report') {
                alert("Comment reported.");
            } else if (type === 'copy') {
                const baseUrl = window.location.href.split('?')[0];
                navigator.clipboard.writeText(`${baseUrl}?commentId=${comment.id}`);
                alert("Link copied!");
            } else if (type === 'delete') {
                if (window.confirm("Are you sure?")) {
                    try {
                        await axios.post(`${API_BASE}/comments/delete`, {
                            animeId, episode, commentId: comment.id, username: user.username
                        });
                        setIsDeleted(true);
                    } catch { alert("Failed to delete."); }
                }
            } else if (type === 'edit') {
                setIsEditing(true);
            }
        };

        const handleUpdate = async () => {
            if (!editValue.trim() || isUpdating) return;
            try {
                setIsUpdating(true);
                await axios.post(`${API_BASE}/comments/edit`, {
                    animeId, episode, commentId: comment.id, username: user.username, content: editValue
                });
                comment.content = editValue;
                setIsEditing(false);
            } catch { alert("Failed to update."); }
            finally { setIsUpdating(false); }
        };

        const isOwner = user?.username === comment.user;

        return (
            <div id={`comment-${comment.id}`} className="flex gap-3 group p-2 sm:p-3 rounded-lg transition-all duration-500 hover:bg-white/[0.01]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex-shrink-0 border border-white/10 overflow-hidden">
                    <img
                        src={comment.avatar || `https://ui-avatars.com/api/?name=${comment.user}&background=random&color=fff`}
                        className="w-full h-full object-cover"
                        alt={comment.user}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="mb-1.5">
                        <div className="text-[12px] sm:text-[13px] font-medium text-white/90 hover:text-red-600 cursor-pointer transition-colors leading-none">{comment.user}</div>
                        <div className="text-[10px] sm:text-[11px] text-white/30 font-normal mt-1">{getRelativeTime(comment.time)}</div>
                    </div>

                    {isDeleted ? (
                        <div className="text-[12px] sm:text-[13px] text-white/30 italic font-normal py-1">
                            This comment has been deleted.
                        </div>
                    ) : isEditing ? (
                        <div className="bg-[#141519] border border-white/10 rounded p-3">
                            <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-[14px] text-white/80 resize-none min-h-[60px]"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-2">
                                <button onClick={() => setIsEditing(false)} className="text-[11px] text-white/30 hover:text-white uppercase font-normal">Cancel</button>
                                <button onClick={handleUpdate} className="text-[11px] text-red-600 hover:text-red-500 uppercase font-medium">{isUpdating ? '...' : 'Save'}</button>
                            </div>
                        </div>
                    ) : (
                        <CommentBody content={comment.content} />
                    )}

                    {!isDeleted && (
                        <div className="flex items-center gap-6 text-white/20 mt-3 relative">
                            <button onClick={() => handleInteraction('like')} className={`flex items-center gap-1.5 transition-colors group/btn ${isLiked ? 'text-red-600' : 'hover:text-white'}`}>
                                <ThumbsUp size={14} className={isLiked ? 'fill-red-600' : ''} /><span className="text-[12px] font-medium">{localLikes}</span>
                            </button>
                            <button onClick={() => handleInteraction('dislike')} className={`flex items-center gap-1.5 transition-colors group/btn ${isDisliked ? 'text-red-600' : 'hover:text-white'}`}>
                                <ThumbsDown size={14} className={isDisliked ? 'fill-red-600' : ''} /><span className="text-[12px] font-medium">{localDislikes}</span>
                            </button>
                            <button onClick={() => handleInteraction('reply')} className="flex items-center gap-1.5 hover:text-white transition-colors group/btn">
                                <Reply size={14} className="rotate-180" /><span className="text-[11px] font-medium">Reply</span>
                            </button>

                            <div className="relative">
                                <button onClick={() => setShowMore(!showMore)} className={`flex items-center gap-1 hover:text-white transition-colors ${showMore ? 'text-white' : ''}`}>
                                    <MoreHorizontal size={14} /><span className="text-[11px] font-medium">More</span>
                                </button>

                                {showMore && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}></div>
                                        <div className="absolute left-0 bottom-full mb-2 w-36 bg-[#1a1c21] border border-white/10 rounded shadow-2xl z-50 overflow-hidden">
                                            {isOwner ? (
                                                <>
                                                    <button onClick={() => handleMoreAction('edit')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">Edit</button>
                                                    <button onClick={() => handleMoreAction('delete')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-red-600/70 hover:text-red-600 hover:bg-white/5 transition-colors uppercase tracking-wider border-t border-white/5">Delete</button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleMoreAction('report')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">Report</button>
                                            )}
                                            <button onClick={() => handleMoreAction('copy')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider border-t border-white/5">Copy Link</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 2. Post a new comment
    const handlePostComment = async () => {
        if (!commentText.trim() || isSending || !user) return;

        try {
            setIsSending(true);
            const payload = {
                animeId,
                episode,
                user: user?.username || "Anonymous",
                avatar: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'A'}&background=random&color=fff`,
                content: commentText
            };

            const resp = await axios.post(`${API_BASE}/comments`, payload);
            setComments([resp.data, ...comments]);
            setCommentText("");
            setIsFocused(false);
            setShowPreview(false);
        } catch {
            alert("Backend error. Check if index.py is running.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="mt-6 md:mt-16 select-none max-w-full overflow-hidden px-1 sm:px-0">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

                {/* LEFT COLUMN: COMMENTS */}
                <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3">
                        <div>
                            <h2 className="text-[16px] sm:text-[18px] font-medium text-white tracking-tight uppercase leading-none">Comments {animeTitle && <span className="text-white/20 ml-1 text-[13px] sm:text-[15px]">— {animeTitle}</span>}</h2>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <MessageSquare size={12} className="text-white/20" />
                                <span className="text-[11px] text-white/20 font-normal uppercase tracking-widest">{comments.length} comments</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] sm:text-[12px] font-normal text-white/40 uppercase tracking-tight">
                            <button
                                onClick={() => setSortBy("best")}
                                className={`transition-colors ${sortBy === 'best' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
                            >
                                Best
                            </button>
                            <button
                                onClick={() => setSortBy("newest")}
                                className={`transition-colors ${sortBy === 'newest' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
                            >
                                Newest
                            </button>
                            <button
                                onClick={() => setSortBy("oldest")}
                                className={`transition-colors ${sortBy === 'oldest' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
                            >
                                Oldest
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-6 sm:mb-10">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'G'}&background=random&color=fff`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 bg-[#1a1c21] rounded-[4px] overflow-hidden border border-white/5 focus-within:border-white/10 transition-all duration-200 ease-out">
                            <div className="py-1.5 px-3">
                                {showPreview ? (
                                    <div
                                        className="w-full text-[14px] text-white/80 min-h-[26px] overflow-auto prose prose-invert"
                                        dangerouslySetInnerHTML={{ __html: formatPreview(commentText) || "<span class='text-white/10 italic'>Nothing to preview..</span>" }}
                                    />
                                ) : (
                                    <textarea
                                        ref={textareaRef}
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        placeholder="Write your comment.."
                                        disabled={!user}
                                        className={`w-full bg-transparent border-none outline-none text-[13px] sm:text-[14px] text-white/80 placeholder:text-white/10 font-normal transition-all duration-200 ease-out resize-none ${isFocused ? 'min-h-[60px] sm:min-h-[75px] mt-1' : 'min-h-[26px]'}`}
                                    />
                                )}
                            </div>

                            {/* Snappy Expandable Footer */}
                            <div className={`bg-white/[0.02] flex items-center justify-between px-4 border-t border-white/5 transition-all duration-200 ease-in-out overflow-hidden ${isFocused || commentText ? 'max-h-20 py-2 opacity-100 visible' : 'max-h-0 py-0 opacity-0 invisible border-none'}`}>
                                <div className="flex items-center gap-6 text-white/30">
                                    <button onClick={() => insertFormatting('bold')} className="hover:text-white transition-colors font-medium text-[14px]">B</button>
                                    <button onClick={() => insertFormatting('quote')} className="hover:text-white transition-colors"><Quote size={15} /></button>
                                    <button onClick={() => insertFormatting('spoiler')} className="hover:text-white transition-colors"><EyeOff size={15} /></button>
                                    <button onClick={() => setShowPreview(!showPreview)} className={`transition-colors ${showPreview ? 'text-red-500' : 'hover:text-white'}`}><Eye size={15} /></button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => { setCommentText(""); setIsFocused(false); setShowPreview(false); }} className="text-[11px] sm:text-[12px] font-normal text-white/30 hover:text-white uppercase px-2">Cancel</button>
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!commentText.trim() || isSending}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[11px] sm:text-[12px] font-medium px-4 sm:px-6 py-2 rounded transition-all uppercase disabled:opacity-40 active:scale-95"
                                    >
                                        {isSending ? "..." : "Send"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {isLoading ? (
                            <div className="py-10 text-center text-white/10 animate-pulse text-[11px] font-normal uppercase tracking-widest">Loading...</div>
                        ) : sortedComments.length > 0 ? (
                            sortedComments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
                        ) : (
                            <div className="py-14 sm:py-20 text-center">
                                <MessageSquare size={32} className="mx-auto text-white/5 mb-3" />
                                <p className="text-white/10 text-[11px] font-normal uppercase tracking-widest">No comments yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MOBILE: Recommendations Section (Below Comments) */}
                {recommendations.length > 0 && (
                    <div className="mt-10 lg:hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[15px] font-medium text-white uppercase tracking-wider">Recommended</h3>
                        </div>
                        <div className="space-y-1">
                            {recommendations.slice(0, 6).map((anime) => (
                                <SidebarCard key={anime.id} anime={anime} />
                            ))}
                        </div>
                    </div>
                )}

                {/* MOBILE: Related Anime / You May Also Like */}
                {relations.length > 0 && (
                    <div className="mt-10 lg:hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[15px] font-medium text-white uppercase tracking-wider">Related</h3>
                        </div>
                        <div className="bg-[#0f0f0f] border border-white/5 p-1 rounded-[2px]">
                            {relations.slice(0, 3).map((anime) => (
                                <SidebarCard key={anime.id} anime={anime} />
                            ))}
                        </div>
                    </div>
                )}

                {/* RIGHT COLUMN: SIDEBAR (25%) */}
                <div className="hidden lg:block w-full lg:w-[320px] shrink-0 space-y-10">

                    {/* RELATED SECTION */}
                    {relations.length > 0 && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[15px] font-medium text-white uppercase tracking-wider">Related</h3>
                                <button className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-[10px] font-medium rounded-[2px] uppercase">
                                    All <ChevronDown size={12} />
                                </button>
                            </div>
                            <div className="bg-[#0f0f0f] border border-white/5 p-1 rounded-[2px]">
                                {relations.slice(0, 3).map((anime) => (
                                    <SidebarCard key={anime.id} anime={anime} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RECOMMENDED SECTION */}
                    {recommendations.length > 0 && (
                        <div className="animate-in slide-in-from-right-6 duration-700">
                            <h3 className="text-[15px] font-medium text-white uppercase tracking-wider mb-6">Recommended</h3>
                            <div className="space-y-1">
                                {recommendations.slice(0, 6).map((anime) => (
                                    <SidebarCard key={anime.id} anime={anime} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
