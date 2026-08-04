
import { useState, useEffect } from 'react';
import { getAnimeDetails } from '../../services/api';
import AnimeCard from './AnimeCard';

export default function ProgressAnimeCard({ anime: progressItem }) {
  const [animeData, setAnimeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let data;
        if (progressItem.anilistId) {
          data = await getAnimeDetails(progressItem.anilistId);
        } else if (progressItem.id || progressItem.animeId) {
          // Check if ID is numeric (AniList ID) or not
          const id = progressItem.id || progressItem.animeId;
          const isNumeric = !isNaN(Number(id));
          data = await getAnimeDetails(id, !isNumeric);
        }
        setAnimeData(data);
      } catch (err) {
        console.error('Failed to fetch anime details for progress:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [progressItem.id, progressItem.animeId, progressItem.anilistId]);

  if (loading) {
    return (
      <div className="w-full aspect-[2/3] bg-white/5 rounded-2xl animate-pulse" />
    );
  }

  // Resolve image URL from multiple possible shapes (object or string)
  const resolveImage = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.extraLarge || img.large || img.medium || null;
  };

  const fallbackCover = resolveImage(progressItem.coverImage) || resolveImage(progressItem.image) || progressItem.poster || '/fallback-image.png';

  const mergedAnime = {
    ...(animeData || {
      id: progressItem.id || progressItem.animeId,
      title: progressItem.title || { english: progressItem.title },
      coverImage: { large: fallbackCover, extraLarge: fallbackCover },
      format: 'TV',
    }),
    // Keep progress-specific fields
    episode: progressItem.episode,
    currentTime: progressItem.currentTime,
    duration: progressItem.duration,
    isProgress: true,
  };

  return <AnimeCard anime={mergedAnime} />;
}
