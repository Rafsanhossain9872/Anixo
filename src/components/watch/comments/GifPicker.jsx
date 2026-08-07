import React, { useState, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY);

export const GifPicker = ({ onGifClick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchGifs = async (offset) => {
        const cacheKey = `giphy_cache_${debouncedSearch || 'trending'}_${offset}`;
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
        <div className="absolute bottom-full right-0 mb-2 z-50 bg-[#161923] border border-white/10 rounded-xl shadow-2xl p-3 w-[260px] sm:w-[300px]">
            <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); onClose(); }}></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
                <input 
                    type="text" 
                    placeholder="Search GIFs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#12151C] text-white/90 text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-indigo-500/50"
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
