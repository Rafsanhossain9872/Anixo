import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const SpoilerText = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="bg-[#12151C] border border-indigo-500/10 p-3 rounded-lg mt-2 mb-2 block">
            <div className={`text-sm ${show ? 'text-white/80' : 'text-transparent bg-white/10 blur-sm select-none'} transition-all duration-300 overflow-hidden`}>
                <span dangerouslySetInnerHTML={{ __html: text }} />
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); setShow(!show); }}
                className="mt-3 flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
                {show ? 'Hide spoil' : 'Show spoil'}
            </button>
        </div>
    );
};
