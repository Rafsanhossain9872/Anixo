import { useState, useEffect } from "react";


export default function NextEpisodeBanner({ anime }) {
  const [timeLeft, setTimeLeft] = useState(null);

  const nextEpisode = anime?.nextAiringEpisode;
  const airingAt = nextEpisode?.airingAt;

  useEffect(() => {
    if (!airingAt) return;

    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = airingAt - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [airingAt]);

  if (!nextEpisode || anime.status !== "RELEASING") return null;

  const releaseDate = airingAt ? new Date(airingAt * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) : "Release date unavailable";

  return (
    <div className="my-2 px-3 py-1.5 bg-white/5 rounded-[4px] text-[11px] sm:text-[12px] text-white/70 text-center">
      <span className="font-semibold text-white">Episode {nextEpisode.episode}</span> is scheduled to release on <span className="text-white/90">{releaseDate}</span>
      {timeLeft && (
        <span className="text-discord-500 ml-1 font-mono tracking-tight text-[11px]">
          (in {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s)
        </span>
      )}
    </div>
  );
}
