export default function SkeletonCard() {
  return (
    <div className="w-full flex flex-col pointer-events-none">
      {/* Poster placeholder */}
      <div className="relative w-full aspect-[2/3] rounded-[6px] overflow-hidden bg-[#2a2a2a] animate-shimmer shadow-lg" />
      
      {/* Title placeholders */}
      <div className="w-full mt-3 px-1 space-y-2">
        <div className="h-[14px] bg-[#2a2a2a] rounded-[4px] animate-shimmer w-full" />
        <div className="h-[14px] bg-[#2a2a2a] rounded-[4px] animate-shimmer w-[60%]" />
      </div>
    </div>
  );
}
