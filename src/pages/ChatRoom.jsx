import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { CHAT_SERVER } from '../services/api';
import Navbar from '../components/layout/Navbar';
import { Send, UserCircle, LogIn, AlertCircle, Reply, X, MessageCircle, Users, Shield, Crown, Trash2, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY);

const GifPicker = ({ onGifClick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchGifs = async (offset) => {
        const cacheKey = `giphy_cache_chat_${debouncedSearch || 'trending'}_${offset}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try { 
                return JSON.parse(cached); 
            } catch (e) { 
                console.error("Failed to parse cached gifs:", e);
                sessionStorage.removeItem(cacheKey);
            }
        }

        const res = debouncedSearch 
            ? await gf.search(debouncedSearch, { offset, limit: 10 }) 
            : await gf.trending({ offset, limit: 10 });
        
        sessionStorage.setItem(cacheKey, JSON.stringify(res));
        return res;
    };

    return (
        <div className="absolute bottom-full left-0 mb-4 z-50 bg-[#161923] border border-white/10 rounded-xl shadow-2xl p-3 w-[260px] sm:w-[300px]">
            <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); onClose(); }}></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
                <input 
                    type="text" 
                    placeholder="Search GIFs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#12151C] text-white/90 text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-discord-500/50"
                />
            </div>
            <div className="h-[250px] overflow-y-auto rounded-lg custom-scrollbar relative z-10">
                <Grid 
                    key={debouncedSearch}
                    width={230} 
                    columns={2} 
                    fetchGifs={fetchGifs} 
                    onGifClick={(gif, e) => { e.preventDefault(); onGifClick(gif); }} 
                    hideAttribution 
                    noLink
                />
            </div>
        </div>
    );
};

const isOnlyGif = (text) => {
    if (!text) return false;
    const trimmed = text.trim();
    return /^(https:\/\/(?:[a-zA-Z0-9-]+\.)*(?:giphy\.com|tenor\.com)\/[^\s"'<>]+)$/i.test(trimmed);
};

const parseChatText = (text, isOnlyGifMatch) => {
    if (!text) return "";
    const imgClasses = isOnlyGifMatch 
        ? "rounded-xl max-w-[280px] sm:max-w-[320px] md:max-w-[380px] w-auto max-h-[300px] object-contain border border-white/5 shadow-sm"
        : "rounded-lg max-w-[200px] mt-2 mb-1 block border border-white/5";
        
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/(https:\/\/(?:[a-zA-Z0-9-]+\.)*(?:giphy\.com|tenor\.com)\/[^\s"'<>]+)/ig, `<img src="$1" class="${imgClasses}" alt="GIF" />`)
        .replace(/\n/g, '<br/>');
};


export default function ChatRoom() {
 const { user } = useAuth();
 const [messages, setMessages] = useState([]);
 const [inputText, setInputText] = useState('');
 const [isConnected, setIsConnected] = useState(false);
 const [error, setError] = useState(null);
 const [replyingTo, setReplyingTo] = useState(null);
 const [activeUsers, setActiveUsers] = useState(0);
 const [showGifPicker, setShowGifPicker] = useState(false);
 
 const socketRef = useRef(null);
 const messagesEndRef = useRef(null);
 const chatContainerRef = useRef(null);

 const scrollToBottom = () => {
 setTimeout(() => {
 if (chatContainerRef.current) {
 chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
 }
 }, 100);
 };

 // Disable pull-to-refresh on mobile browsers for this page
 useEffect(() => {
 const originalBodyOverscroll = document.body.style.overscrollBehaviorY;
 const originalHtmlOverscroll = document.documentElement.style.overscrollBehaviorY;

 document.body.style.overscrollBehaviorY = 'none';
 document.documentElement.style.overscrollBehaviorY = 'none';

 return () => {
 document.body.style.overscrollBehaviorY = originalBodyOverscroll;
 document.documentElement.style.overscrollBehaviorY = originalHtmlOverscroll;
 };
 }, []);

 // Connect to socket when component mounts
 useEffect(() => {
 const token = localStorage.getItem('token');
 
 let guestId = localStorage.getItem('chat_guest_id');
 if (!guestId) {
 guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
 localStorage.setItem('chat_guest_id', guestId);
 }
 
 // Connect with token if available
 socketRef.current = io(CHAT_SERVER, {
 auth: { token, guestId }
 });

 socketRef.current.on('connect', () => {
 setIsConnected(true);
 setError(null);
 });

 socketRef.current.on('disconnect', () => {
 setIsConnected(false);
 });

 // Receive initial history
 socketRef.current.on('chat_history', (history) => {
 setMessages(history);
 scrollToBottom();
 });

 // Receive new messages
 socketRef.current.on('new_message', (newMsg) => {
 setMessages(prev => [...prev, newMsg]);
 scrollToBottom();
 });

 socketRef.current.on('message_deleted', (deletedId) => {
 setMessages(prev => prev.filter(msg => msg._id !== deletedId));
 });

 socketRef.current.on('chat_error', (err) => {
 setError(err.message);
 setTimeout(() => setError(null), 5000);
 });

 socketRef.current.on('active_users', (count) => {
 setActiveUsers(count);
 });

 return () => {
 if (socketRef.current) {
 socketRef.current.disconnect();
 }
 };
 }, [user]); // Reconnect if user login state changes

 const handleSendMessage = (e) => {
 e.preventDefault();
 if (!inputText.trim() || !user) return;

 const payload = {
 text: inputText,
 profileId: user.profileId || user.username,
 username: user.username,
 displayName: user.displayName,
 avatar: user.avatar
 };

 if (replyingTo) {
 payload.replyTo = {
 messageId: replyingTo._id,
 userId: replyingTo.userId,
 username: replyingTo.displayName || replyingTo.username,
 text: replyingTo.text.length > 60 ? replyingTo.text.substring(0, 60) + '...' : replyingTo.text
 };
 }

 socketRef.current.emit('send_message', payload);

 setInputText('');
 setReplyingTo(null);
 };

 const formatTime = (dateString) => {
 const date = new Date(dateString);
 return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 };

 return (
 <div className="h-dvh bg-gradient-to-b from-[#09090b] to-[#121212] text-white flex flex-col font-sans selection:bg-discord-500/30 overflow-hidden overscroll-y-none">
 <Navbar />
 
 <main className="flex-grow pt-16 md:pt-24 pb-0 md:pb-6 px-0 md:px-8 max-w-5xl mx-auto w-full flex flex-col min-h-0">
 
 <div className="flex-grow flex flex-col bg-[#121212]/60 backdrop-blur-2xl md:border border-white/15 rounded-none md:rounded-3xl overflow-hidden shadow-none md:shadow-[0_0_40px_rgba(0,0,0,0.5)] relative min-h-0">
 
 {/* Header */}
 <div className="bg-[#1a1a1a]/60 backdrop-blur-md border-b border-white/10 p-3 px-4 md:p-5 md:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 z-10 relative">
 <div className="flex flex-col pr-2">
 <h1 className="text-base sm:text-lg md:text-2xl font-bold flex items-center gap-2 tracking-tight text-white/90">
 <MessageCircle className="text-discord-600 w-4 h-4 md:w-5 md:h-5 shrink-0" />
 Global Live Chat
 <span className="relative flex h-2 w-2 md:h-3 md:w-3 ml-1 shrink-0">
 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-discord-400'}`}></span>
 <span className={`relative inline-flex rounded-full h-full w-full ${isConnected ? 'bg-green-500' : 'bg-discord-500'}`}></span>
 </span>
 </h1>
 <p className="text-white/40 text-[10px] md:text-[13px] mt-1 leading-snug">Real-time public chat room. Messages disappear after 14 days.</p>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <div className="text-[10px] md:text-xs font-semibold bg-discord-500/10 border border-discord-500/20 text-discord-400 px-2 py-1 md:px-3 md:py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1 whitespace-nowrap">
 <Users size={12} className="md:w-3.5 md:h-3.5 shrink-0" />
 <span>{activeUsers} Online</span>
 </div>
 <div className="text-[10px] md:text-xs bg-white/5 border border-white/10 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-white/50 backdrop-blur-sm whitespace-nowrap">
 {isConnected ? 'Connected' : 'Connecting...'}
 </div>
 </div>
 </div>

 {/* Chat Area */}
 <div className="flex-grow flex flex-col min-h-0 overflow-hidden bg-gradient-to-b from-transparent to-black/20">
 <div ref={chatContainerRef} style={{ WebkitOverflowScrolling: 'touch' }} className="flex-grow min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-3 md:p-8 flex flex-col gap-4 md:gap-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
 {messages.length === 0 ? (
 <div className="m-auto text-white/20 text-center flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/15 backdrop-blur-sm">
 <MessageCircle size={48} className="mb-4 opacity-50 text-white/40" />
 <p className="font-semibold text-lg text-white/60">No active messages</p>
 <p className="text-sm mt-1">Be the first to say hi!</p>
 </div>
 ) : (
 messages.map((msg, index) => {
 const isMe = user && msg.userId === (user.id || user._id);
 const onlyGif = isOnlyGif(msg.text) && !msg.replyTo;
 
 if (msg.type === 'system') {
 return (
 <div key={msg._id || index} className="flex justify-center w-full my-1">
 <span className="text-[11px] font-medium bg-white/5 border border-white/10 text-white/50 px-4 py-1.5 rounded-full tracking-wide backdrop-blur-sm shadow-sm">
 {msg.text}
 </span>
 </div>
 );
 }
 return (
 <div id={`msg-${msg._id}`} key={msg._id || index} className={`group flex gap-3 max-w-[90%] md:max-w-[75%] transition-all duration-500 rounded-3xl p-1 -mx-1 ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
 {/* Avatar */}
 <Link to={`/user/${msg.profileId || msg.username}`} className="flex-shrink-0 mt-auto mb-1">
 {msg.avatar ? (
 <img src={msg.avatar} alt={msg.username} className={`w-9 h-9 rounded-full object-cover ring-2 transition-all shadow-lg ${msg.role === 'admin' ? 'ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : msg.role === 'moderator' ? 'ring-discord-500 ' : 'ring-transparent hover:ring-discord-500/50'}`} />
 ) : (
 <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center ring-2 transition-all shadow-lg ${msg.role === 'admin' ? 'ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : msg.role === 'moderator' ? 'ring-discord-500 ' : 'ring-transparent hover:ring-discord-500/50'}`}>
 <UserCircle size={20} className="text-white/70" />
 </div>
 )}
 </Link>

 {/* Message Bubble */}
 <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
 <div className="flex items-baseline gap-2 mb-1.5 px-2">
 <Link to={`/user/${msg.profileId || msg.username}`} className={`text-[13px] font-semibold transition-colors flex items-center gap-1.5 flex-wrap ${msg.role === 'admin' ? 'text-purple-500 hover:text-purple-400' : msg.role === 'moderator' ? 'text-discord-500 hover:text-discord-400' : 'text-white/70 hover:text-discord-400'}`}>
 {msg.displayName || msg.username}
 {msg.role === 'admin' && <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Crown size={10} fill="currentColor" /> ADMIN</span>}
 {msg.role === 'moderator' && <span className="bg-discord-500 text-white text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black flex items-center gap-1 leading-none"><Shield size={10} fill="currentColor" /> MOD</span>}
 {msg.profileId === 'c34e7bbb' && (
 <>
 <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider font-black leading-none ">RANDI KA BACCHA</span>
 </>
 )}
 </Link>
 <span className="text-[10px] text-white/30 font-medium tracking-wide">{formatTime(msg.createdAt)}</span>
 </div>
 
 <div className={`text-[14px] md:text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
 onlyGif 
 ? '' 
 : `px-4 md:px-4 py-2 md:py-2.5 rounded-[18px] shadow-sm ${isMe ? 'bg-[#2a1618] text-white/95 rounded-br-[4px]' : 'bg-[#222222] text-white/90 rounded-bl-[4px]'}`
 }`}>
 {msg.replyTo && (
 <div 
 onClick={() => {
 const el = document.getElementById(`msg-${msg.replyTo.messageId}`);
 if (el) {
 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
 el.classList.add('bg-white/10', 'scale-[1.02]', 'ring-1', 'ring-white/20');
 setTimeout(() => el.classList.remove('bg-white/10', 'scale-[1.02]', 'ring-1', 'ring-white/20'), 1500);
 }
 }}
 className={`mb-2 px-2.5 py-1.5 rounded-md text-[11px] border-l-[3px] leading-snug cursor-pointer hover:opacity-80 transition-all ${
 isMe 
 ? 'bg-black/10 border-white/60 text-white' 
 : 'bg-white/5 border-discord-500 text-white/80'
 }`}>
 <div className={`font-bold ${isMe ? 'text-white' : 'text-discord-500'}`}>
 {msg.replyTo.username}
 </div>
 <div className="truncate max-w-[200px] md:max-w-[300px] mt-0.5 opacity-90">
 {msg.replyTo.text}
 </div>
 </div>
 )}
 <span dangerouslySetInnerHTML={{ __html: parseChatText(msg.text, onlyGif) }} />
 </div>
 </div>
 
 {/* Actions */}
 <div className={`flex flex-col gap-0.5 self-end mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
 {user && (
 <button 
 onClick={() => setReplyingTo(msg)} 
 className="opacity-100 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-full"
 title="Reply"
 >
 <Reply size={16} />
 </button>
 )}
 {user && (user.role === 'admin' || user.role === 'moderator') && (
 <button 
 onClick={() => {
 if (window.confirm("Are you sure you want to delete this message?")) {
 socketRef.current.emit('delete_message', msg._id);
 }
 }} 
 className="opacity-100 transition-all duration-200 text-white/20 hover:text-discord-500 hover:bg-discord-500/10 p-2 rounded-full"
 title="Delete Message"
 >
 <Trash2 size={16} />
 </button>
 )}
 </div>
 </div>
 );
 })
 )}
 <div ref={messagesEndRef} />
 </div>
 </div>

 {/* Input Area */}
 <div className="bg-[#181818]/90 backdrop-blur-2xl border-t border-white/10 p-3 pb-5 md:p-6 z-10 relative">
 {error && (
 <div className="mb-4 p-3 bg-discord-500/10 border border-discord-500/20 rounded-xl text-discord-400 text-sm flex items-center gap-2">
 <AlertCircle size={16} /> {error}
 </div>
 )}

 {replyingTo && (
 <div className="mb-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between backdrop-blur-md">
 <div className="text-sm flex-grow overflow-hidden pr-4 border-l-2 border-discord-500 pl-3">
 <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Replying to </span>
 <span className="font-bold text-discord-400 ml-1">{replyingTo.displayName || replyingTo.username}</span>
 <p className="text-[13px] text-white/60 truncate mt-1">{replyingTo.text}</p>
 </div>
 <button onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
 <X size={18} />
 </button>
 </div>
 )}

 {user ? (
 <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 items-end">
 <div className="relative flex items-center justify-center shrink-0 mb-1 md:mb-1.5">
     <button 
         type="button"
         onClick={() => setShowGifPicker(!showGifPicker)} 
         className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
         title="Send GIF"
     >
         <Image size={22} />
     </button>
     {showGifPicker && (
         <GifPicker 
             onGifClick={(gif) => {
                 setInputText(prev => prev + (prev ? ' ' : '') + gif.images.fixed_height.url);
                 setShowGifPicker(false);
             }} 
             onClose={() => setShowGifPicker(false)} 
         />
     )}
 </div>
 <textarea
 value={inputText}
 onChange={(e) => setInputText(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage(e);
 }
 }}
 placeholder="Type a message..."
 maxLength={500}
 rows={1}
 className="flex-grow bg-[#222] hover:bg-[#2a2a2a] border border-white/10 focus:border-discord-500/50 focus:bg-[#2a2a2a] rounded-3xl px-4 py-2.5 md:px-6 md:py-3.5 focus:outline-none focus:ring-4 focus:ring-discord-500/10 transition-all text-[14px] md:text-[15px] resize-none overflow-hidden"
 style={{ minHeight: '44px', maxHeight: '120px' }}
 />
 <button
 type="submit"
 disabled={!inputText.trim()}
 className="bg-gradient-to-r from-discord-600 to-discord-700 hover:from-discord-700 hover:to-discord-800 disabled:opacity-50 disabled:cursor-not-allowed text-white h-[44px] md:h-[52px] px-5 md:px-6 rounded-full hover:-translate-y-0.5 transition-all flex items-center justify-center shrink-0"
 >
 <Send size={18} className="md:mr-2" />
 <span className="hidden md:inline font-bold">Send</span>
 </button>
 </form>
 ) : (
 <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4 shadow-inner">
 <p className="text-white/60 text-[15px]">Join the conversation with other anime fans!</p>
 <Link 
 to="/home?login=true" 
 className="bg-white hover:bg-discord-50 text-black px-8 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 hover:-translate-y-0.5"
 >
 <LogIn size={18} /> Login to Chat
 </Link>
 </div>
 )}
 </div>
 </div>
 </main>
 </div>
 );
}
