import React from 'react';
import { X } from 'lucide-react';

export default function CacheIssueBanner({ isOpen, onClose, onOpenCacheGuide }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-w-[500px] w-full max-h-[95vh] animate-in zoom-in-95 duration-300">
                
                {/* Simulated Error Screen (Replaces problem.jpg) */}
                <div className="w-full bg-[#0B0C10] border-b border-white/10 relative shrink-0 flex flex-col items-center justify-center py-12 px-6">
                    <h3 className="text-[#5C6CFF] font-bold text-xl sm:text-2xl mb-4 text-center">Something went wrong</h3>
                    <p className="text-white/50 text-xs sm:text-sm text-center mb-6 break-all max-w-[90%]">
                        Failed to fetch dynamically imported module:<br/>
                        https://tenzora.top/assets/Watch-CbHI0cHr.js
                    </p>
                    <div className="bg-[#4656E9] text-white font-bold py-2.5 px-6 rounded text-sm uppercase tracking-wider opacity-90">
                        Reload Page
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Text and Button below */}
                <div className="p-4 sm:p-5 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                    <span className="text-base sm:text-lg font-bold text-white mb-2">Facing this exact error?</span>
                    <span className="text-xs sm:text-sm text-white/50 mb-4 sm:mb-5 leading-relaxed">
                        If you see a black screen saying "Failed to fetch module", your browser is trying to load an old cached version of the site.
                    </span>
                    
                    <button 
                        onClick={() => {
                            onClose();
                            onOpenCacheGuide();
                        }}
                        className="w-full text-sm font-bold bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-lg transition-colors shrink-0"
                    >
                        See How To Fix It Permanently
                    </button>
                </div>
            </div>
        </div>
    );
}
