import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const lastPage = totalPages;
    let pages = [];

    // Smart Pagination Logic (Show 5 pages around current)
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(lastPage, start + 4);
    if (end === lastPage) start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <div className="mt-12 sm:mt-16 pb-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 select-none font-sans">
      {/* First Page Button */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="First Page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Prev Button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page Numbers */}
      {pages.map((i) => {
        const isActive = i === currentPage;
        return (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] text-[12px] sm:text-[13px] font-bold transition-all ${
              isActive
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] z-10'
                : 'bg-white/[0.07] border border-white/10 text-white/70 hover:bg-white/[0.15] hover:text-white'
            }`}
          >
            {i}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last Page Button */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="Last Page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
