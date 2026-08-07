import React, { useState } from "react";
import { Smile, EyeOff } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { GifPicker } from "./GifPicker";

export const ReplyInputBox = ({ user, replyText, setReplyText, onSubmit, onCancel, placeholder, replyIsSpoiler, setReplyIsSpoiler, insertMarkdownReply }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);

    const onEmojiClick = (emojiObject) => {
        const textarea = document.getElementById('reply-comment-input');
        if (!textarea) {
            setReplyText(prev => prev + emojiObject.emoji);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = replyText;
        const newText = text.substring(0, start) + emojiObject.emoji + text.substring(end);
        setReplyText(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
        }, 0);
    };
    
    const onGifClick = (gif) => {
        const gifUrl = gif.images?.fixed_height?.webp || gif.images?.fixed_height?.url || gif.images?.original?.webp || gif.images?.original?.url;
        if (gifUrl) {
            setReplyText(prev => prev + (prev.length > 0 ? "\n" : "") + gifUrl + "\n");
        }
        setShowGifPicker(false);
    };

    return (
        <div className="reply-box mt-3 flex gap-3 animate-in slide-in-from-top-2 duration-200">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border border-indigo-500/30 bg-white/5 relative z-10">
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
            <div className="bg-[#1A1D24] border border-white/10 rounded-lg flex flex-col focus-within:border-indigo-500/50 transition-colors relative">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/15 bg-[#12151C] rounded-t-lg">
                    <button onClick={() => insertMarkdownReply('**', '**', 'bold text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 font-bold transition-all cursor-pointer text-xs">B</button>
                    <button onClick={() => insertMarkdownReply('*', '*', 'italic text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 italic transition-all cursor-pointer text-xs font-serif">I</button>
                    <button onClick={() => insertMarkdownReply('~~', '~~', 'strikethrough text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 line-through transition-all cursor-pointer text-xs">S</button>
                    <button onClick={() => insertMarkdownReply('> ', '', 'quote text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 font-serif font-bold transition-all cursor-pointer text-xs">"</button>
                    <button onClick={() => insertMarkdownReply('||', '||', 'spoiler text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-xs" title="Spoiler"><EyeOff size={12} /></button>
                </div>
                <div className="relative">
                    <textarea
                        id="reply-comment-input"
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-transparent px-3 pt-3 pb-10 min-h-[80px] text-xs sm:text-sm text-white/90 placeholder:text-white/30 focus:outline-none resize-none"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 text-white/40 bg-[#12151C] border border-white/10 px-2 py-1.5 rounded-md shadow-lg">
                        <div className="relative hidden sm:block">
                            <Smile size={16} onClick={() => setShowEmojiPicker(prev => !prev)} className="hover:text-white cursor-pointer transition-colors" />
                            {showEmojiPicker && (
                                <div className="absolute bottom-full right-0 mb-2 z-50">
                                    <div className="fixed inset-0" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }}></div>
                                    <div className="relative z-50 shadow-2xl">
                                        <EmojiPicker 
                                            theme="dark" 
                                            reactionsDefaultOpen={true}
                                            allowExpandReactions={false}
                                            onReactionClick={onEmojiClick}
                                            onEmojiClick={onEmojiClick} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <div onClick={() => setShowGifPicker(prev => !prev)} className="hover:text-white cursor-pointer transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider flex items-center justify-center">
                                GIF
                            </div>
                            {showGifPicker && (
                                <GifPicker 
                                    onGifClick={onGifClick} 
                                    onClose={() => setShowGifPicker(false)} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-1.5 text-white/50 text-[11px] sm:text-xs cursor-pointer hover:text-white/80 transition-colors">
                    <input 
                        type="checkbox" 
                        checked={replyIsSpoiler}
                        onChange={(e) => setReplyIsSpoiler(e.target.checked)}
                        className="accent-indigo-500 w-3 h-3 cursor-pointer" 
                    />
                    <span className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">!</span>
                    Spoil?
                </label>
                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="text-white/50 hover:text-white text-xs font-medium transition-colors cursor-pointer px-2 py-1">Cancel</button>
                    <button 
                        onClick={onSubmit}
                        disabled={!replyText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                        Reply
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};
