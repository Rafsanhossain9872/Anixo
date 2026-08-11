import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { MessageSquare, ThumbsUp, ThumbsDown, Trash2, Send, Reply, X, Edit2, MoreHorizontal, ChevronDown, ChevronUp, ChevronsUpDown, Flag, Link as LinkIcon, EyeOff, Smile, Image, Eye, Check, Shield, Crown, Pin, Ban, Bold, Italic, Strikethrough, Quote } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import EmojiPicker from "emoji-picker-react";
import { Link } from "react-router-dom";

const SOCKET_URL = import.meta.env.VITE_COMMENT_API_URL || "http://localhost:4000";

import { GifPicker } from "./comments/GifPicker";
import { CommentBody } from "./comments/CommentBody";
import { EditInputBox } from "./comments/EditInputBox";
import { ReplyInputBox } from "./comments/ReplyInputBox";

export default function CommentSection({ animeId, episode, onTimestampClick, onLoginRequired }) {
    const { user } = useAuth();
    
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const socketRef = useRef(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [editingComment, setEditingComment] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [expandedThreads, setExpandedThreads] = useState({});
    const [reportModalOpen, setReportModalOpen] = useState(null);
    const [banModalOpen, setBanModalOpen] = useState(null);
    const [banReasonText, setBanReasonText] = useState("");
    const [toastMessage, setToastMessage] = useState(null);
    const replyBoxRef = useRef(null);
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [replyIsSpoiler, setReplyIsSpoiler] = useState(false);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [showMainEmojiPicker, setShowMainEmojiPicker] = useState(false);
    const [showMainGifPicker, setShowMainGifPicker] = useState(false);
    const [sortBy, setSortBy] = useState('Newest');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [visibleCount, setVisibleCount] = useState(8);

    const onMainEmojiClick = (emojiObject) => {
        const textarea = document.getElementById('main-comment-input');
        if (!textarea) {
            setCommentText(prev => prev + emojiObject.emoji);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = commentText;
        const newText = text.substring(0, start) + emojiObject.emoji + text.substring(end);
        setCommentText(newText);
        setTimeout(() => {
            textarea.selectionStart = start + emojiObject.emoji.length;
            textarea.selectionEnd = start + emojiObject.emoji.length;
            textarea.focus();
        }, 0);
    };

    const onMainGifClick = (gif) => {
        const gifUrl = gif.images?.fixed_height?.webp || gif.images?.fixed_height?.url || gif.images?.original?.webp || gif.images?.original?.url;
        if (gifUrl) {
            setCommentText(prev => prev + (prev.length > 0 ? "\n" : "") + gifUrl + "\n");
        }
        setShowMainGifPicker(false);
    };

    const insertMarkdown = (prefix, suffix = '', defaultText = '') => {
        const textarea = document.getElementById('main-comment-input');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = commentText;
        const selected = text.substring(start, end);
        
        const insertion = selected || defaultText;
        const newText = text.substring(0, start) + prefix + insertion + suffix + text.substring(end);
        setCommentText(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + insertion.length);
        }, 0);
    };

    const insertMarkdownReply = (prefix, suffix = '', defaultText = '') => {
        const textarea = document.getElementById('reply-comment-input');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = replyText;
        const selected = text.substring(start, end);
        
        const insertion = selected || defaultText;
        const newText = text.substring(0, start) + prefix + insertion + suffix + text.substring(end);
        setReplyText(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + insertion.length);
        }, 0);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (replyingTo && replyBoxRef.current && !replyBoxRef.current.contains(e.target) && !e.target.closest('.reply-btn')) {
                setReplyingTo(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [replyingTo]);

    const toggleThread = (commentId) => {
        setExpandedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const handleCopyLink = (commentId) => {
        const url = `${window.location.origin}${window.location.pathname}?animeId=${animeId}&episode=${episode}#comment-${commentId}`;
        navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!");
    };

    useEffect(() => {
        if (window.location.hash && !isLoading && comments.length > 0) {
            const targetId = window.location.hash.replace('#comment-', '');
            
            comments.forEach(c => {
                if (c._id === targetId) return;
                const hasReply = c.replies?.some(r => r._id === targetId);
                if (hasReply) {
                    setExpandedThreads(prev => ({ ...prev, [c._id]: true }));
                }
            });

            setTimeout(() => {
                const el = document.getElementById(`comment-${targetId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-white/10');
                    setTimeout(() => el.classList.remove('bg-white/10'), 2000);
                }
            }, 500);
        }
    }, [isLoading, comments]);
    
    useEffect(() => {
        // Initial Fetch
        const fetchComments = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`${SOCKET_URL}/api/comments?animeId=${animeId}&episodeNumber=${episode}&page=${page}&limit=50`);
                const data = await res.json();
                
                if (!Array.isArray(data)) {
                    console.error("API Error:", data);
                    setHasMore(false);
                    return;
                }
                
                if (data.length < 50) setHasMore(false);
                
                if (page === 1) {
                    setComments(data);
                } else {
                    setComments(prev => [...prev, ...data]);
                }
            } catch (err) {
                console.error("Failed to fetch comments", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchComments();
    }, [animeId, episode, page]);

    useEffect(() => {
        // Socket.IO Setup
        const token = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("cached_user") || "{}");
        const newSocket = io(SOCKET_URL, {
            auth: { token, username: storedUser?.username || "", profileId: storedUser?.profileId || "" }
        });
        
        if (newSocket.connected) {
            newSocket.emit("join_episode", { animeId, episodeNumber: episode });
        }
        
        newSocket.on("connect", () => {
            newSocket.emit("join_episode", { animeId, episodeNumber: episode });
        });

        newSocket.on("new_comment", (comment) => {
            setComments(prev => {
                if (prev.some(c => c._id === comment._id)) return prev;
                return [comment, ...prev];
            });
        });

        newSocket.on("update_comment", (updatedComment) => {
            setComments(prev => prev.map(c => c._id === updatedComment._id ? { ...c, ...updatedComment } : c));
        });

        newSocket.on("delete_comment", ({ commentId }) => {
            setComments(prev => prev.filter(c => c._id !== commentId));
        });

        socketRef.current = newSocket;

        return () => {
            newSocket.emit("leave_episode", { animeId, episodeNumber: episode });
            newSocket.disconnect();
        };
    }, [animeId, episode, user]);

    const handlePost = () => {
        if (!commentText.trim() || !user || !socketRef.current) return;
        
        let finalText = commentText;
        if (isSpoiler) {
            finalText = `||${finalText}||`;
        }
        
        setCommentText(""); // clear immediately for better UX
        setIsSpoiler(false);
        setIsInputExpanded(false);
        
        socketRef.current.emit("post_comment", {
            animeId,
            episodeNumber: episode,
            content: finalText,
            avatar: user.avatar,
            username: user.username,
            profileId: user.profileId,
            displayName: user.displayName
        }, (response) => {
            if (response.error) {
                showToast(response.error);
                setCommentText(finalText); // restore text if failed
            } else if (response.success && response.comment) {
                setComments(prev => {
                    if (prev.some(c => c._id === response.comment._id)) return prev;
                    return [response.comment, ...prev];
                });
            }
        });
    };

    const handleReplyPost = (commentId) => {
        if (!replyText.trim() || !user || !socketRef.current) return;
        
        let finalText = replyText;
        if (replyIsSpoiler) {
            finalText = `||${finalText}||`;
        }
        
        const tempText = replyText;
        const tempSpoiler = replyIsSpoiler;
        setReplyText("");
        setReplyIsSpoiler(false);
        
        socketRef.current.emit("post_reply", {
            commentId,
            animeId,
            episodeNumber: episode,
            content: finalText,
            avatar: user.avatar,
            username: user.username,
            profileId: user.profileId,
            displayName: user.displayName,
            replyToId: replyingTo?.replyId || null
        }, (response) => {
            if (response.error) {
                showToast(response.error);
                setReplyText(tempText);
                setReplyIsSpoiler(tempSpoiler);
            } else {
                setReplyingTo(null);
            }
        });
    };

    const handleVote = (commentId, action) => {
        if (!user || !socketRef.current) return showToast("Sign in to vote");
        socketRef.current.emit("vote_comment", { commentId, action, animeId, episodeNumber: episode });
    };

    const handleVoteReply = (commentId, replyId, action) => {
        if (!user || !socketRef.current) return showToast("Sign in to vote");
        socketRef.current.emit("vote_reply", { commentId, replyId, action, animeId, episodeNumber: episode });
    };

    const handleDelete = (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        socketRef.current.emit("delete_comment", { commentId, animeId, episodeNumber: episode });
    };

    const handleDeleteReply = (commentId, replyId) => {
        if (!window.confirm("Delete this reply?")) return;
        socketRef.current.emit("delete_reply", { commentId, replyId, animeId, episodeNumber: episode });
    };

    const handlePinComment = (commentId) => {
        if (!socketRef.current || (user?.role !== 'admin' && user?.role !== 'moderator')) return;
        socketRef.current.emit("pin_comment", { commentId, animeId, episodeNumber: episode }, (response) => {
            if (response?.error) {
                showToast(response.error);
            } else if (response?.success) {
                showToast(response.isPinned ? "Comment Pinned" : "Comment Unpinned");
            }
        });
    };

    const handleEditSubmit = () => {
        if (!editingComment?.text.trim() || !socketRef.current) return;
        
        if (editingComment.isReply) {
            socketRef.current.emit("edit_reply", {
                commentId: editingComment.id,
                replyId: editingComment.replyId,
                animeId,
                episodeNumber: episode,
                content: editingComment.text
            }, (response) => {
                if (response.error) showToast(response.error);
                else setEditingComment(null);
            });
        } else {
            socketRef.current.emit("edit_comment", {
                commentId: editingComment.id,
                animeId,
                episodeNumber: episode,
                content: editingComment.text
            }, (response) => {
                if (response.error) showToast(response.error);
                else setEditingComment(null);
            });
        }
    };

    const handleReport = (reason) => {
        if (!user) return showToast("You must be logged in to report.");
        if (!reportModalOpen) return;

        let targetId = reportModalOpen.id || reportModalOpen;
        let targetType = reportModalOpen.type === 'comment' ? 'Comment' : 'Reply';
        let commentId = targetType === 'Reply' ? reportModalOpen.commentId : undefined;

        socketRef.current.emit('report_comment', {
            targetId,
            targetType,
            reason,
            animeId,
            episodeNumber: episode,
            commentId
        }, (response) => {
            if (response.error) {
                showToast(response.error);
            } else {
                showToast(`Reported for: ${reason}`);
            }
            setReportModalOpen(null);
        });
    };

    const handleAdminBan = (durationHours) => {
        if (!banModalOpen) return;
        socketRef.current.emit('admin_ban_user', {
            targetUsername: banModalOpen.username,
            durationHours,
            commentId: banModalOpen.commentId,
            replyId: banModalOpen.replyId,
            animeId,
            episodeNumber: episode,
            reason: banReasonText
        }, (response) => {
            if (response.error) {
                showToast(response.error);
            } else {
                showToast(response.message);
            }
            setBanModalOpen(null);
            setBanReasonText('');
        });
    };

    const getRelativeTime = (dateStr) => {
        const diff = new Date() - new Date(dateStr);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
        
        const hours = Math.floor(mins / 60);
        if (hours < 24) {
            const remainingMins = mins % 60;
            if (remainingMins === 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            return `${hours} hour${hours !== 1 ? 's' : ''}, ${remainingMins} minute${remainingMins !== 1 ? 's' : ''} ago`;
        }
        
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    };

    const getFlatReplies = (replies) => {
        if (!replies) return [];
        const replyMap = {};
        replies.forEach(reply => {
            replyMap[reply._id] = reply.user.displayName || reply.user.profileId || reply.user.username;
        });
        
        return replies.map(reply => ({
            ...reply,
            replyingToUsername: reply.replyToId ? replyMap[reply.replyToId] : null
        }));
    };

    const renderReplies = (repliesList, commentId, mainComment) => {
        if (!repliesList || repliesList.length === 0) return null;
        
        return (
            <div className="mt-4 space-y-4 ml-0 sm:ml-4">
                {repliesList.map((reply, index) => {
                    const isLast = index === repliesList.length - 1;
                    return (
                        <div id={`comment-${reply._id}`} key={reply._id || reply.createdAt} className="relative transition-colors duration-500 rounded-sm">
                            {/* L-shaped connection line */}
                            <div 
                                className={`absolute border-l-2 border-b-2 border-indigo-500/20 group-hover:border-indigo-500/60 transition-colors duration-300 rounded-bl-2xl -left-[28px] sm:-left-[52px] w-[28px] sm:w-[52px] ${index === 0 ? '-top-4 h-8' : 'top-0 h-4'}`}
                            ></div>
                            
                            {/* Continuing vertical line if not last */}
                            {!isLast && (
                                <div 
                                    className="absolute border-l-2 border-indigo-500/20 top-4 -bottom-4 -left-[28px] sm:-left-[52px]"
                                ></div>
                            )}
                            
                            <div className="flex gap-3 group/reply animate-in fade-in duration-300 relative z-10">
                            <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 relative z-10 border ${reply.isDeleted || reply.bannedByRole ? 'border-white/10 bg-white/5' : reply.user?.role === 'admin' ? 'border-purple-500' : reply.user?.role === 'moderator' ? 'border-discord-500' : 'border-yellow-500'}`}>
                                {reply.isDeleted || reply.bannedByRole ? (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-xs">?</div>
                                ) : (
                                    <img src={reply.user.avatar} alt={reply.user.username} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                     <span className={`block font-bold text-[13px] ${reply.isDeleted || reply.bannedByRole ? 'text-white/30' : reply.user?.role === 'admin' ? 'text-purple-500 hover:text-purple-400' : reply.user?.role === 'moderator' ? 'text-discord-500 hover:text-discord-400' : 'text-orange-400 hover:text-orange-300'} cursor-pointer transition-colors`}>
                                        {reply.isDeleted ? '[deleted]' : reply.bannedByRole ? '[restricted]' : (
                                            <Link to={`/user/${reply.user.profileId || reply.user.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-wrap">
                                                {reply.user.displayName || reply.user.profileId || reply.user.username}
                                                {reply.user.role === 'admin' && <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Crown size={10} fill="currentColor" /> ADMIN</span>}
                                                {reply.user.role === 'moderator' && <span className="bg-discord-500 text-white text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Shield size={10} fill="currentColor" /> MOD</span>}
                                            </Link>
                                        )}
                                    </span>
                                    <span className="block text-white/40 text-[10px] mt-0.5">{getRelativeTime(reply.createdAt)}</span>
                                </div>
                                
                                {editingComment?.replyId === reply._id && editingComment?.isReply ? (
                                    <EditInputBox
                                        editText={editingComment.text}
                                        setEditText={(val) => setEditingComment(prev => ({ ...prev, text: typeof val === 'function' ? val(prev.text) : val }))}
                                        onCancel={() => setEditingComment(null)}
                                        onSubmit={handleEditSubmit}
                                    />
                                ) : (
                                    <div className={`text-xs leading-relaxed mb-2 ${reply.isDeleted || reply.bannedByRole ? 'text-white/40 italic' : 'text-white/80'}`}>
                                        {!(reply.isDeleted || reply.bannedByRole) && (
                                            <span className="inline-block text-[#00B4D8] font-bold mr-1.5 hover:underline cursor-pointer">
                                                @{reply.replyingToUsername || mainComment?.user?.displayName || mainComment?.user?.profileId || mainComment?.user?.username}
                                            </span>
                                        )}
                                        <span>
                                            {reply.isDeleted 
                                                ? 'This reply has been deleted.' 
                                                : reply.bannedByRole 
                                                    ? `This comment is restricted by ${reply.bannedByRole}. Reason: ${reply.bannedReason || 'Violation of rules'}`
                                                    : <CommentBody content={reply.content} isSpoiler={reply.isSpoiler} />}
                                        </span>
                                    </div>
                                )}
                                
                                {!(reply.isDeleted || reply.bannedByRole) && (!editingComment || editingComment.replyId !== reply._id) && (
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1.5 sm:mt-1 text-white/40 text-[10px] sm:text-[11px] font-bold">
                                        <button 
                                            onClick={() => handleVoteReply(commentId, reply._id, 'like')}
                                            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${reply.likedBy?.includes(user?.username) ? 'text-indigo-400' : ''}`}
                                        >
                                            <ThumbsUp size={12} className={reply.likedBy?.includes(user?.username) ? 'fill-current' : ''} />
                                            {reply.likes || 0}
                                        </button>
                                        <button 
                                            onClick={() => handleVoteReply(commentId, reply._id, 'dislike')}
                                            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${reply.dislikedBy?.includes(user?.username) ? 'text-discord-400' : ''}`}
                                        >
                                            <ThumbsDown size={12} className={reply.dislikedBy?.includes(user?.username) ? 'fill-current' : ''} />
                                            {reply.dislikes > 0 ? reply.dislikes : ''}
                                        </button>
                                        
                                        {user && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplyingTo(prev => prev?.replyId === reply._id ? null : { commentId: commentId, username: reply.user.username, replyId: reply._id });
                                                }}
                                                className="reply-btn flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                                            >
                                                <Reply size={12} className="rotate-180" /> Reply
                                            </button>
                                        )}
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => setOpenDropdownId(openDropdownId === reply._id ? null : reply._id)}
                                                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                                            >
                                                <MoreHorizontal size={12} /> More
                                            </button>
                                            {openDropdownId === reply._id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)}></div>
                                                    <div className="absolute bottom-full left-0 mb-2 w-36 bg-[#1A1D24] border border-white/10 rounded-md shadow-xl py-1 z-50">
                                                        {user?.username === reply.user.username && (
                                                            <button 
                                                                onClick={() => { setEditingComment({ id: commentId, isReply: true, replyId: reply._id, text: reply.content }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                        )}
                                                        {(user?.username === reply.user.username || user?.role === 'admin' || user?.role === 'moderator') && (
                                                            <button 
                                                                onClick={() => { handleDeleteReply(commentId, reply._id); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-discord-400 hover:text-discord-300 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        )}
                                                        {user?.username !== reply.user.username && (
                                                            <button 
                                                                onClick={() => { setReportModalOpen({ type: 'reply', id: reply._id, commentId: commentId }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-discord-400 hover:text-discord-300 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                            >
                                                                <Flag size={12} /> Report
                                                            </button>
                                                        )}
                                                        {(user?.role === 'admin' || user?.role === 'moderator') && reply.user.username !== user.username && reply.user.role !== 'admin' && reply.user.role !== 'moderator' && (
                                                            <button 
                                                                onClick={() => { setBanModalOpen({ username: reply.user.username, commentId: commentId, replyId: reply._id }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-discord-500 hover:text-discord-400 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                            >
                                                                <Ban size={12} /> Ban User
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { handleCopyLink(reply._id); setOpenDropdownId(null); }}
                                                            className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                        >
                                                            <LinkIcon size={12} /> Copy Link
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* No nested replies block needed anymore because the list is flat */}

                                {/* Inline Reply Input for nested reply */}
                                {replyingTo?.replyId === reply._id && (
                                    <div ref={replyBoxRef}>
                                        <ReplyInputBox
                                            user={user}
                                            replyText={replyText}
                                            setReplyText={setReplyText}
                                            onSubmit={() => handleReplyPost(commentId)}
                                            onCancel={() => { setReplyingTo(null); setReplyText(''); setReplyIsSpoiler(false); }}
                                            placeholder={`Replying to @${reply.user.profileId || reply.user.username}...`}
                                            replyIsSpoiler={replyIsSpoiler}
                                            setReplyIsSpoiler={setReplyIsSpoiler}
                                            insertMarkdownReply={insertMarkdownReply}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
    };

    // Sort comments based on the selected `sortBy` option
    const sortedComments = [...comments].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === 'Oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        } else if (sortBy === 'Top') {
            return (b.likes || 0) - (a.likes || 0);
        } else {
            // Newest
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return (
        <div 
            className="mt-6 sm:mt-10 lg:mt-16 bg-[#0B0E14] rounded-xl sm:rounded-sm p-3 sm:p-6 lg:p-8 border border-white/[0.05] shadow-2xl"
            onClick={(e) => {
                const timestampEl = e.target.closest('.timestamp-link');
                if (timestampEl && onTimestampClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    const timeStr = timestampEl.dataset.time;
                    if (timeStr) {
                        const parts = timeStr.split(':').map(Number);
                        let seconds = 0;
                        if (parts.length === 3) {
                            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        } else if (parts.length === 2) {
                            seconds = parts[0] * 60 + parts[1];
                        }
                        onTimestampClick(seconds);
                    }
                }
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/15 pb-4">
                <div className="flex items-center gap-4 sm:gap-6">
                    <button className="bg-[#1A1D24] border border-white/10 text-white font-medium px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 text-sm hover:bg-white/5 transition-colors">
                        Episode {episode} <ChevronDown size={14} className="text-white/50" />
                    </button>
                    <div className="flex items-center gap-2 text-white/70 font-medium text-sm">
                        <MessageSquare size={18} className="text-white/50" /> {comments.length} Comments
                    </div>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm font-medium border border-white/10 px-3 py-1.5 rounded-md bg-[#1A1D24] hover:bg-white/5"
                    >
                        Sort by 
                        <ChevronsUpDown size={14} className="opacity-70" />
                    </button>

                    {showSortDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)}></div>
                            <div className="absolute right-0 mt-2 w-40 bg-[#161923] border border-white/15 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                                {['Top', 'Newest', 'Oldest'].map(option => (
                                    <button
                                        key={option}
                                        onClick={() => { setSortBy(option); setShowSortDropdown(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center justify-between ${sortBy === option ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {option}
                                        {sortBy === option && <Check size={14} className="text-indigo-400" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Input Box */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-10">
                <div className="flex items-center gap-2 sm:block">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 border border-yellow-500 relative group">
                        <img 
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=random`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                    </div>
                    {/* Show username next to avatar on mobile */}
                    <span className="sm:hidden text-sm font-bold text-white/80">{user?.displayName || user?.profileId || user?.username || 'Guest'}</span>
                </div>
                <div className="flex-1 w-full">
                    {!user && (
                        <p className="text-xs sm:text-sm text-white/50 mb-2">
                            <button
                                type="button"
                                onClick={onLoginRequired}
                                className="text-[#00B4D8] font-semibold hover:underline"
                            >
                                Sign in
                            </button>{" "}
                            to join the discussion.
                        </p>
                    )}
                    <div className="bg-[#1A1D24] border border-white/10 rounded-lg flex flex-col focus-within:border-[#00B4D8]/50 transition-colors relative">
                        {/* Toolbar */}
                        {isInputExpanded && (
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/15 bg-[#12151C] rounded-t-lg animate-in slide-in-from-top-2 duration-200">
                                <button type="button" onClick={() => insertMarkdown('**', '**', 'bold text')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Bold" aria-label="Bold"><Bold size={14} /></button>
                                <button type="button" onClick={() => insertMarkdown('*', '*', 'italic text')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Italic" aria-label="Italic"><Italic size={14} /></button>
                                <button type="button" onClick={() => insertMarkdown('~~', '~~', 'strikethrough text')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={14} /></button>
                                <button type="button" onClick={() => insertMarkdown('> ', '', 'quote text')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Quote" aria-label="Quote"><Quote size={14} /></button>
                                <button type="button" onClick={() => insertMarkdown('||', '||', 'spoiler text')} className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Spoiler" aria-label="Spoiler">
                                    <EyeOff size={14} />
                                </button>
                            </div>
                        )}
                        
                        {/* Textarea */}
                        <div className="relative">
                            <textarea
                                id="main-comment-input"
                                value={commentText}
                                onFocus={() => setIsInputExpanded(true)}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Leave a comment"
                                disabled={!user}
                                className={`w-full bg-transparent px-4 pt-4 pb-12 ${isInputExpanded ? 'min-h-[100px]' : 'min-h-[50px]'} text-sm text-white/90 placeholder:text-white/30 focus:outline-none resize-none transition-all duration-300`}
                            />
                            {/* Smiley & Media icons */}
                            {isInputExpanded && (
                                <div className="absolute bottom-2 right-2 flex items-center gap-3 text-white/40 animate-in fade-in duration-300 bg-[#12151C] border border-white/10 px-3 py-1.5 rounded-lg shadow-lg">
                                    <div className="relative hidden sm:block">
                                        <Smile size={18} onClick={() => setShowMainEmojiPicker(prev => !prev)} className="hover:text-white cursor-pointer transition-colors" />
                                        {showMainEmojiPicker && (
                                            <div className="absolute bottom-full right-0 mb-2 z-50">
                                                <div className="fixed inset-0" onClick={(e) => { e.stopPropagation(); setShowMainEmojiPicker(false); }}></div>
                                                <div className="relative z-50 shadow-2xl">
                                                    <EmojiPicker 
                                                        theme="dark" 
                                                        reactionsDefaultOpen={true}
                                                        allowExpandReactions={false}
                                                        onReactionClick={onMainEmojiClick}
                                                        onEmojiClick={onMainEmojiClick} 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div onClick={() => setShowMainGifPicker(prev => !prev)} className="hover:text-white cursor-pointer transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-xs font-bold tracking-wider flex items-center justify-center">
                                            GIF
                                        </div>
                                        {showMainGifPicker && (
                                            <GifPicker 
                                                onGifClick={onMainGifClick} 
                                                onClose={() => setShowMainGifPicker(false)} 
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer Actions */}
                    {isInputExpanded && (
                        <div className="flex items-center justify-between mt-3 animate-in slide-in-from-top-2 fade-in duration-300">
                            <label className="flex items-center gap-2 text-white/50 text-xs sm:text-sm cursor-pointer hover:text-white/80 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={isSpoiler}
                                    onChange={(e) => setIsSpoiler(e.target.checked)}
                                    className="accent-[#00B4D8] w-3 h-3 sm:w-4 sm:h-4 cursor-pointer" 
                                />
                                <EyeOff size={14} className="text-white/45" />
                                Mark as spoiler
                            </label>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => { setIsInputExpanded(false); setCommentText(''); setIsSpoiler(false); }}
                                    className="text-white/50 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={handlePost}
                                    disabled={!commentText.trim() || !user}
                                    className="bg-[#00B4D8] hover:bg-[#0096B4] disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg transition-colors cursor-pointer"
                                >
                                    Comment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {isLoading && page === 1 ? (
                    <div className="text-center py-10">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-white/40 text-sm font-medium tracking-wide">Connecting to chat...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-16 bg-white/[0.01] rounded-sm border border-white/[0.02] border-dashed">
                        <MessageSquare size={40} className="mx-auto text-white/10 mb-4" />
                        <p className="text-white/40 font-medium">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    sortedComments.slice(0, visibleCount).map(comment => (
                        <div id={`comment-${comment._id}`} key={comment._id} className="flex gap-3 sm:gap-4 group animate-in slide-in-from-bottom-2 duration-300 transition-colors duration-500 rounded-sm">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 border ${comment.isDeleted || comment.bannedByRole ? 'border-white/10 bg-white/5' : comment.user?.role === 'admin' ? 'border-purple-500' : comment.user?.role === 'moderator' ? 'border-discord-500' : 'border-yellow-500'}`}>
                                {comment.isDeleted || comment.bannedByRole ? (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-sm">?</div>
                                ) : (
                                    <img src={comment.user.avatar} alt={comment.user.username} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {comment.isPinned && (
                                    <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                                        <Pin size={12} className="fill-purple-400" /> Pinned
                                    </div>
                                )}
                                <div className="mb-1 sm:mb-2 flex flex-wrap items-baseline gap-2 sm:block sm:gap-0">
                                     <span className={`block font-bold text-sm sm:text-[15px] ${comment.isDeleted || comment.bannedByRole ? 'text-white/30' : comment.user?.role === 'admin' ? 'text-purple-500 hover:text-purple-400' : comment.user?.role === 'moderator' ? 'text-discord-500 hover:text-discord-400' : 'text-orange-400 hover:text-orange-300'} cursor-pointer transition-colors`}>
                                        {comment.isDeleted ? '[deleted]' : comment.bannedByRole ? '[restricted]' : (
                                            <Link to={`/user/${comment.user.profileId || comment.user.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-wrap">
                                                {comment.user.displayName || comment.user.profileId || comment.user.username}
                                                {comment.user.role === 'admin' && <span className="bg-purple-600 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Crown size={10} fill="currentColor" /> ADMIN</span>}
                                                {comment.user.role === 'moderator' && <span className="bg-discord-500 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Shield size={10} fill="currentColor" /> MOD</span>}
                                            </Link>
                                        )}
                                    </span>
                                    <span className="block text-white/40 text-xs mt-0.5">{getRelativeTime(comment.createdAt)}</span>
                                </div>
                                {editingComment?.id === comment._id && !editingComment?.isReply ? (
                                    <EditInputBox
                                        editText={editingComment.text}
                                        setEditText={(val) => setEditingComment(prev => ({ ...prev, text: typeof val === 'function' ? val(prev.text) : val }))}
                                        onCancel={() => setEditingComment(null)}
                                        onSubmit={handleEditSubmit}
                                    />
                                ) : (
                                    <div className={`text-sm leading-relaxed mb-3 ${comment.isDeleted || comment.bannedByRole ? 'text-white/40 italic' : 'text-white/80'}`}>
                                        {comment.isDeleted 
                                            ? 'This comment has been deleted.' 
                                            : comment.bannedByRole 
                                                ? `This comment is restricted by ${comment.bannedByRole}. Reason: ${comment.bannedReason || 'Violation of rules'}`
                                                : <CommentBody content={comment.content} isSpoiler={comment.isSpoiler} />}
                                    </div>
                                )}
                                
                                {!(comment.isDeleted || comment.bannedByRole) && (!editingComment || editingComment.id !== comment._id || editingComment.isReply) && (
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-1.5 sm:mt-1 text-white/40 text-xs sm:text-[13px] font-bold">
                                        <button 
                                            onClick={() => handleVote(comment._id, 'like')}
                                            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${comment.likedBy?.includes(user?.username) ? 'text-indigo-400' : ''}`}
                                        >
                                            <ThumbsUp size={14} className={comment.likedBy?.includes(user?.username) ? 'fill-current' : ''} />
                                            {comment.likes || 0}
                                        </button>
                                        <button 
                                            onClick={() => handleVote(comment._id, 'dislike')}
                                            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${comment.dislikedBy?.includes(user?.username) ? 'text-discord-400' : ''}`}
                                        >
                                            <ThumbsDown size={14} className={comment.dislikedBy?.includes(user?.username) ? 'fill-current' : ''} />
                                            {comment.dislikes > 0 ? comment.dislikes : ''}
                                        </button>
                                        
                                        {user && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplyingTo(prev => prev?.commentId === comment._id && !prev.replyId ? null : { commentId: comment._id, username: comment.user.username });
                                                }}
                                                className="reply-btn flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                                            >
                                                <Reply size={14} className="rotate-180" /> Reply
                                            </button>
                                        )}
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => setOpenDropdownId(openDropdownId === comment._id ? null : comment._id)}
                                                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                                            >
                                                <MoreHorizontal size={14} /> More
                                            </button>
                                            {openDropdownId === comment._id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)}></div>
                                                    <div className="absolute bottom-full left-0 mb-2 w-36 bg-[#1A1D24] border border-white/10 rounded-md shadow-xl py-1 z-50">
                                                        {user?.username === comment.user.username && (
                                                            <button 
                                                                onClick={() => { setEditingComment({ id: comment._id, isReply: false, text: comment.content }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2.5 sm:py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                        )}
                                                        {(user?.username === comment.user.username || user?.role === 'admin' || user?.role === 'moderator') && (
                                                            <button 
                                                                onClick={() => { handleDelete(comment._id); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2.5 sm:py-2 text-xs text-discord-400 hover:text-discord-300 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        )}
                                                        {user?.username !== comment.user.username && (
                                                            <button 
                                                                onClick={() => { setReportModalOpen({ type: 'comment', id: comment._id }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-discord-400 hover:text-discord-300 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                            >
                                                                <Flag size={12} /> Report
                                                            </button>
                                                        )}
                                                        {(user?.role === 'admin' || user?.role === 'moderator') && (
                                                            <>
                                                                <button 
                                                                    onClick={() => { handlePinComment(comment._id); setOpenDropdownId(null); }}
                                                                    className={`w-full text-left px-3 py-2 text-xs ${user?.role === 'admin' ? 'text-purple-400 hover:text-purple-300' : 'text-discord-400 hover:text-discord-300'} hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2`}
                                                                >
                                                                    <Pin size={12} /> {comment.isPinned ? 'Unpin Comment' : 'Pin Comment'}
                                                                </button>
                                                                {comment.user.username !== user.username && comment.user.role !== 'admin' && comment.user.role !== 'moderator' && (
                                                                    <button 
                                                                        onClick={() => { setBanModalOpen({ username: comment.user.username, commentId: comment._id }); setOpenDropdownId(null); }}
                                                                        className="w-full text-left px-3 py-2 text-xs text-discord-500 hover:text-discord-400 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                                    >
                                                                        <Ban size={12} /> Ban User
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        <button 
                                                            onClick={() => { handleCopyLink(comment._id); setOpenDropdownId(null); }}
                                                            className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer border-t border-white/15 mt-1 pt-2"
                                                        >
                                                            <LinkIcon size={12} /> Copy Link
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Nested Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => toggleThread(comment._id)} 
                                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-[13px] font-bold transition-colors cursor-pointer px-2 py-1 -ml-2 rounded-full hover:bg-indigo-500/10"
                                        >
                                            {expandedThreads[comment._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            {expandedThreads[comment._id] ? 'Hide replies' : `View ${comment.replies.length} repl${comment.replies.length > 1 ? 'ies' : 'y'}`}
                                        </button>
                                        
                                        {expandedThreads[comment._id] && renderReplies(getFlatReplies(comment.replies), comment._id, comment)}
                                    </div>
                                )}

                                {/* Inline Reply Input */}
                                {replyingTo?.commentId === comment._id && !replyingTo.replyId && (
                                    <div ref={replyBoxRef}>
                                        <ReplyInputBox
                                            user={user}
                                            replyText={replyText}
                                            setReplyText={setReplyText}
                                            onSubmit={() => handleReplyPost(comment._id)}
                                            onCancel={() => { setReplyingTo(null); setReplyText(''); setReplyIsSpoiler(false); }}
                                            placeholder={`Replying to @${comment.user.profileId || comment.user.username}...`}
                                            replyIsSpoiler={replyIsSpoiler}
                                            setReplyIsSpoiler={setReplyIsSpoiler}
                                            insertMarkdownReply={insertMarkdownReply}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                
                {(visibleCount < sortedComments.length || (hasMore && comments.length > 0)) && (
                    <button 
                        onClick={() => {
                            if (visibleCount < sortedComments.length) {
                                setVisibleCount(prev => prev + 8);
                            } else {
                                setPage(p => p + 1);
                                setVisibleCount(prev => prev + 8);
                            }
                        }}
                        disabled={isLoading}
                        className="w-full py-3 mt-4 rounded-sm border border-white/10 bg-white/[0.02] text-white/60 text-sm font-semibold hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
                    >
                        {isLoading ? "Loading..." : "See more comments"}
                    </button>
                )}
            </div>

            {/* Report Modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-[100] flex sm:items-center items-end justify-center bg-black/60 backdrop-blur-sm sm:p-4 p-0" onClick={() => setReportModalOpen(null)}>
                    <div className="bg-[#0B0E14] border-t sm:border border-white/10 sm:rounded-lg rounded-t-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in sm:zoom-in-95 slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-white font-bold flex items-center gap-2 text-base sm:text-sm"><Flag size={16} className="text-discord-400" /> Report Comment</h3>
                            <button onClick={() => setReportModalOpen(null)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"><X size={20} /></button>
                        </div>
                        <div className="p-5 pb-8 sm:pb-5 space-y-3 sm:space-y-2">
                            <p className="text-white/60 text-sm mb-2">Why are you reporting this comment?</p>
                            {['Abuse or Harassment', 'Spam or Misleading', 'Contains Spoilers'].map(reason => (
                                <button 
                                    key={reason}
                                    onClick={() => handleReport(reason)}
                                    className="w-full text-left px-4 py-4 sm:py-3 bg-white/5 hover:bg-white/10 text-white/90 text-[15px] sm:text-sm rounded-xl sm:rounded-md transition-colors flex items-center gap-3 cursor-pointer"
                                >
                                    <div className="w-2 h-2 rounded-full bg-discord-500/50"></div>
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ban User Modal */}
            {banModalOpen && (
                <div className="fixed inset-0 z-[100] flex sm:items-center items-end justify-center bg-black/60 backdrop-blur-sm sm:p-4 p-0" onClick={() => setBanModalOpen(null)}>
                    <div className="bg-[#0B0E14] border-t sm:border border-discord-500/20 sm:rounded-lg rounded-t-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in sm:zoom-in-95 slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-discord-500/5">
                            <h3 className="text-discord-400 font-bold flex items-center gap-2 text-base sm:text-sm"><Ban size={16} /> Ban User: {banModalOpen.username}</h3>
                            <button onClick={() => setBanModalOpen(null)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"><X size={20} /></button>
                        </div>
                        <div className="p-5 pb-8 sm:pb-5 space-y-3 sm:space-y-2">
                            <p className="text-white/60 text-sm mb-2">Provide a reason (optional):</p>
                            <input 
                                type="text"
                                placeholder="E.g. Violation of rules, Spam, etc."
                                value={banReasonText}
                                onChange={(e) => setBanReasonText(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-500/50 mb-2"
                            />
                            <p className="text-white/60 text-sm mb-2 mt-3">Select the ban duration for this user:</p>
                            {[
                                { label: '3 Hours', hours: 3 },
                                { label: '24 Hours', hours: 24 },
                                { label: '3 Days', hours: 72 },
                                { label: '7 Days', hours: 168 }
                            ].map(option => (
                                <button 
                                    key={option.hours}
                                    onClick={() => handleAdminBan(option.hours)}
                                    className="w-full text-left px-4 py-4 sm:py-3 bg-discord-500/10 hover:bg-discord-500/20 text-discord-200 text-[15px] sm:text-sm rounded-xl sm:rounded-md transition-colors flex items-center gap-3 cursor-pointer"
                                >
                                    <div className="w-2 h-2 rounded-full bg-discord-500"></div>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Toast */}
            {toastMessage && (
                <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="bg-[#1A1D24] border border-white/10 shadow-2xl px-5 py-3 rounded-sm flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-white text-sm font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
