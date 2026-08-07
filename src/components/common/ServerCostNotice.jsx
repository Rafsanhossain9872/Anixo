import { useState } from 'react';
import { isAggressiveAdsActive } from '../../utils/adsConfig';

const ServerCostNotice = () => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('server_cost_notice_dismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('server_cost_notice_dismissed', 'true');
  };

  if (dismissed || !isAggressiveAdsActive()) return null;

  return (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] md:w-[90%] md:max-w-4xl z-[999] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 py-5 md:py-6 px-5 md:px-8 rounded-[1.5rem] md:rounded-3xl bg-[#141028] border border-red-500/30 shadow-2xl">
        
        {/* Content (Image + Text) */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 min-w-0 flex-1 text-center md:text-left mt-2 md:mt-0">
          <div className="shrink-0 flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-black/50 border border-white/5">
            <img 
              src="https://media1.tenor.com/m/Bhq1WZGJfqIAAAAC/frieren-cry-frieren-beyond-journey%27s-end.gif" 
              alt="Frieren Crying" 
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[15px] sm:text-base md:text-lg text-gray-200 font-medium leading-relaxed">
            <span className="font-bold text-red-400 block md:inline mb-1 md:mb-0 md:mr-2 text-lg md:text-xl">Server Support Notice:</span>
            <span className="text-white/90">
              To sustain our growing server costs and keep the platform free, we are temporarily increasing ad frequency for the <span className="inline-block bg-red-500/20 text-red-300 font-bold px-2.5 py-0.5 mx-1 rounded-md border border-red-500/30 uppercase tracking-wide text-sm md:text-base">next 24 hours (~72 Episodes) only</span>. We deeply appreciate your patience and support, as this helps us maintain a smooth experience for everyone.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-center md:justify-start mt-1 md:mt-0">
          <button
            onClick={handleDismiss}
            className="w-full md:w-auto px-6 md:px-8 py-3.5 rounded-xl text-[15px] md:text-base font-bold text-red-100 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 hover:border-red-500/60 transition-all hover:scale-105 active:scale-95 text-center shadow-lg"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerCostNotice;
