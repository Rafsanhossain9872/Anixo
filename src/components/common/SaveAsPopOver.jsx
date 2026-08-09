import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const STATUS_OPTIONS = [
  { value: "CURRENT", label: "WATCHING", color: "bg-green-500" },
  { value: "COMPLETED", label: "DONE", color: "bg-blue-500" },
  { value: "DROPPED", label: "DROP", color: "bg-red-500" },
  { value: "PLANNING", label: "PLAN TO WATCH", color: "bg-yellow-500" },
];

export default function SaveAsPopOver({ animeId, onClose }) {
  const { user } = useAuth();
  const popoverRef = useRef(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Optimistically load existing status from localStorage or cache if available
    const cachedData = localStorage.getItem(`tenzora_status_${animeId}`);
    if (cachedData) {
      setCurrentStatus(cachedData);
    } else {
      // In a real implementation, you would fetch the user's list status for this anime here via React Query
      // For now we assume no status if not cached locally
    }

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    // Add event listener with slight delay to prevent immediate close on mount click
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [animeId, onClose]);

  const handleStatusUpdate = async (statusValue) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('require-login'));
      return;
    }

    // Optimistic Update
    const prevStatus = currentStatus;
    setCurrentStatus(statusValue);
    setIsUpdating(true);
    localStorage.setItem(`tenzora_status_${animeId}`, statusValue);

    try {
      // Fake API Delay for now (This would be your actual AniList mutation)
      await new Promise(r => setTimeout(r, 500));
      
      // If mutation fails, we would revert:
      // setCurrentStatus(prevStatus);
    } catch (e) {
      setCurrentStatus(prevStatus);
      console.error("Failed to update status", e);
    } finally {
      setIsUpdating(false);
      onClose();
    }
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute top-8 right-0 w-[160px] bg-bg border border-border shadow-2xl rounded-lg py-1 z-[60] font-senpai"
      onClick={(e) => e.stopPropagation()} // Prevent card click
    >
      <div className="px-3 py-1.5 border-b border-white/5 mb-1">
        <span className="text-[10px] text-textMuted font-bold uppercase tracking-widest">Save As</span>
      </div>
      
      {STATUS_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => handleStatusUpdate(option.value)}
          disabled={isUpdating}
          className="w-full text-left px-3 py-1.5 hover:bg-surfaceHover transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${option.color} ${currentStatus === option.value ? 'animate-pulse ring-2 ring-white/20 ring-offset-1 ring-offset-bg' : ''}`} />
            <span className={`text-xs font-semibold ${currentStatus === option.value ? 'text-white' : 'text-textMuted group-hover:text-white'}`}>
              {option.label}
            </span>
          </div>
          {currentStatus === option.value && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>
      ))}
      
      {currentStatus && (
        <div className="px-2 mt-1 pt-1 border-t border-white/5">
          <button 
            onClick={() => handleStatusUpdate(null)}
            className="w-full py-1 text-center text-[10px] text-red-500/70 hover:text-red-500 font-bold transition-colors uppercase tracking-widest"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
