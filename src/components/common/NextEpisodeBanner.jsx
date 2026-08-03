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
    <div className="w-full bg-[#1a1a2e] border border-white/5 rounded-md px-6 py-4 text-center mt-6">
      <p className="text-[14px] font-bold text-white tracking-wide">
        Episode <span className="text-discord-500">{nextEpisode.episode}</span> is scheduled to release on {releaseDate}
        {timeLeft && (
          <span className="text-discord-500 ml-2">
            (in {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s)
          </span>
        )}
      </p>
    </div>
  );
}
