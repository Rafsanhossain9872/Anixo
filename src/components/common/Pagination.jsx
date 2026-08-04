import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({ currentPage = 1, totalPages = 1, hasNextPage = false, onPageChange }) {
  // If hasNextPage is true, but totalPages is small, we assume it's open-ended
  const isInfinite = hasNextPage && (!totalPages || currentPage >= totalPages);
  const safeTotalPages = isInfinite ? currentPage + 1 : (Number.isFinite(Number(totalPages)) && Number(totalPages) > 0 ? Math.floor(Number(totalPages)) : 1);
  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage) || 1, safeTotalPages));

  if (safeTotalPages <= 1 && !hasNextPage) return null;

  const getPages = () => {
    let pages = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (safeCurrentPage > 3) {
        pages.push("...");
      }
      
      let start = Math.max(2, safeCurrentPage - 1);
      let end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
      
      if (safeCurrentPage === 1) end = 3;
      if (safeCurrentPage === safeTotalPages) start = safeTotalPages - 2;
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (safeCurrentPage < safeTotalPages - 2) {
        pages.push("...");
      }
      
      pages.push(safeTotalPages);
    }
    
    return pages;
  };

  const pages = getPages();

  return (
    <div className="mt-12 sm:mt-16 pb-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 select-none font-sans">
      {/* First Page Button */}
      <button
        onClick={() => onPageChange(1)}
        disabled={safeCurrentPage === 1}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="First Page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Prev Button */}
      <button
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
        disabled={safeCurrentPage === 1}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page Numbers */}
      {pages.map((i, index) => {
        const isDots = i === "...";
        const isActive = i === safeCurrentPage;
        
        if (isDots) {
          return (
            <div key={`dots-${index}`} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 text-[14px]">
              ...
            </div>
          );
        }
        
        return (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] text-[12px] sm:text-[13px] font-bold transition-all ${
              isActive
                ? 'bg-discord-600 text-white z-10'
                : 'bg-white/[0.07] border border-white/10 text-white/70 hover:bg-white/[0.15] hover:text-white'
            }`}
          >
            {i}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(safeCurrentPage + 1)}
        disabled={!hasNextPage && safeCurrentPage === safeTotalPages}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.07] border border-white/10 rounded-[4px] text-white/70 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last Page Button */}
      <button
        onClick={() => onPageChange(safeTotalPages)}
        disabled={(!hasNextPage && safeCurrentPage === safeTotalPages) || isInfinite}
        className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] transition-all group ${
          isInfinite ? 'hidden' : 'bg-white/[0.07] border border-white/10 text-white/70 hover:bg-white/[0.15] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed'
        }`}
        title="Last Page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
