import { FastForward } from "lucide-react";

export default function SkipTimeModal({ activeEpisode, skipTimes, onSave, onClose }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const start = e.target.start.value;
    const end = e.target.end.value;
    onSave(activeEpisode, start, end);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-[#111] border border-white/10 p-8 rounded-[4px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
        >
          <FastForward size={20} className="rotate-90" />
        </button>
        <h2 className="text-[20px] font-black uppercase tracking-[0.2em] mb-2">Add Skip Time</h2>
        <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold mb-8">Set intro/outro for Ep {activeEpisode}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Start (sec)</label>
              <input
                name="start"
                type="number"
                defaultValue={skipTimes[activeEpisode]?.start || ""}
                placeholder="80"
                className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30">End (sec)</label>
              <input
                name="end"
                type="number"
                defaultValue={skipTimes[activeEpisode]?.end || ""}
                placeholder="120"
                className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-black uppercase tracking-[0.3em] rounded-[2px] transition-all active:scale-95 shadow-lg shadow-red-900/20"
          >
            Save Timeline
          </button>
        </form>
      </div>
    </div>
  );
}
