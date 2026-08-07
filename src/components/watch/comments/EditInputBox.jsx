import React, { useState } from "react";
import { Smile, EyeOff } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { GifPicker } from "./GifPicker";

export const EditInputBox = ({ editText, setEditText, onSubmit, onCancel }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);

    const insertMarkdownEdit = (prefix, suffix = '', defaultText = '') => {
        const textarea = document.getElementById('edit-comment-input');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editText;
        const selected = text.substring(start, end);
        
        const insertion = selected || defaultText;
        const newText = text.substring(0, start) + prefix + insertion + suffix + text.substring(end);
        setEditText(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + insertion.length);
        }, 0);
    };

    const onEmojiClick = (emojiObject) => {
        const textarea = document.getElementById('edit-comment-input');
        if (!textarea) {
            setEditText(editText + emojiObject.emoji);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = editText.substring(0, start) + emojiObject.emoji + editText.substring(end);
        setEditText(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
        }, 0);
    };

    const onGifClick = (gif) => {
        const gifUrl = gif.images?.fixed_height?.webp || gif.images?.fixed_height?.url || gif.images?.original?.webp || gif.images?.original?.url;
        if (gifUrl) {
            setEditText(prev => prev + (prev.length > 0 ? "\n" : "") + gifUrl + "\n");
        }
        setShowGifPicker(false);
    };

    return (
        <div className="mt-2 mb-3 animate-in fade-in duration-200">
            <div className="bg-[#1A1D24] border border-white/10 rounded-lg flex flex-col focus-within:border-indigo-500/50 transition-colors relative">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/15 bg-[#12151C] rounded-t-lg">
                    <button onClick={() => insertMarkdownEdit('**', '**', 'bold text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 font-bold transition-all cursor-pointer text-xs">B</button>
                    <button onClick={() => insertMarkdownEdit('*', '*', 'italic text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 italic transition-all cursor-pointer text-xs font-serif">I</button>
                    <button onClick={() => insertMarkdownEdit('~~', '~~', 'strikethrough text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 line-through transition-all cursor-pointer text-xs">S</button>
                    <button onClick={() => insertMarkdownEdit('> ', '', 'quote text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 font-serif font-bold transition-all cursor-pointer text-xs">"</button>
                    <button onClick={() => insertMarkdownEdit('||', '||', 'spoiler text')} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-xs" title="Spoiler"><EyeOff size={12} /></button>
                </div>
                <div className="relative">
                    <textarea
                        id="edit-comment-input"
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
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
            <div className="flex justify-end gap-2 mt-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-sm cursor-pointer transition-colors">Cancel</button>
                <button onClick={onSubmit} disabled={!editText.trim()} className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-sm cursor-pointer transition-colors disabled:opacity-50">Save</button>
            </div>
        </div>
    );
};
