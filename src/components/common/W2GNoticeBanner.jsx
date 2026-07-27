import { useState } from 'react';
import { X, Volume2 } from 'lucide-react';

const W2GNoticeBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('server1_dub_fixed_notice_dismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('server1_dub_fixed_notice_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="max-w-[1720px] mx-auto px-2 md:px-4 mt-4">
      <div className="relative flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#141028] border border-discord-400/20 shadow-lg">
        {/* Left: Text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded bg-[#2b2d42] p-1">
            <Volume2 className="w-4 h-4 text-discord-400" />
          </div>
          <p className="text-sm text-gray-200 font-medium leading-snug">
            <span className="font-bold text-white mr-1.5">
              <span className="hidden sm:inline">System Update:</span>
              <span className="sm:hidden">Update:</span>
            </span>
            <span className="opacity-90 hidden sm:inline">The Server 1 dub problem is now fixed. You can enjoy smooth English dub anime streaming.</span>
            <span className="opacity-90 sm:hidden">Server 1 dub problem is fixed!</span>
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default W2GNoticeBanner;
