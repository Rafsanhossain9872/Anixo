import { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { isAggressiveAdsActive, AGGRESSIVE_ADS_END_TIME } from '../../utils/adsConfig';

const W2GNoticeBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('server_cost_homepage_notice_dismissed') === 'true';
  });

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, AGGRESSIVE_ADS_END_TIME - Date.now()));

  useEffect(() => {
    if (dismissed || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, AGGRESSIVE_ADS_END_TIME - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [dismissed, timeLeft]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('server_cost_homepage_notice_dismissed', 'true');
  };

  if (dismissed || !isAggressiveAdsActive() || timeLeft <= 0) return null;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="max-w-[1720px] mx-auto px-2 md:px-4 mt-4 mb-2">
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-3 sm:py-3 px-4 rounded-xl bg-[#141028] border border-red-500/20 shadow-lg pr-10 sm:pr-4">
        {/* Left: Text */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 w-full">
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded bg-red-500/10 p-1 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[12px] sm:text-[14px] text-red-100/90 font-medium leading-relaxed sm:leading-snug">
              <span className="text-red-400 font-bold uppercase tracking-widest text-[10px] sm:text-[11px] block sm:inline mb-0.5 sm:mb-0 sm:mr-2">Notice:</span>
              To sustain our growing server costs and keep the platform free, we are temporarily increasing ad frequency for the <span className="inline-block font-bold text-red-300 bg-red-500/10 px-1.5 py-0.5 mt-1 sm:mt-0 rounded uppercase border border-red-500/20 sm:ml-1 text-[10px] sm:text-[12px]">next 12 hours (~36 Episodes) only</span>.
            </p>
            <div className="flex items-center gap-1.5 mt-2 sm:mt-1 text-red-400/80 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <Clock size={12} className="animate-pulse text-red-400" />
              <span>Time Remaining:</span>
              <span className="tabular-nums bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 text-red-300">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 flex items-center shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
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
